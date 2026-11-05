"""Reconcile static-asset deployments using trusted code and untrusted CI artifacts."""

import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile


REPOSITORY = "tanakalucky/murder-mystery"
REPOSITORY_ID = 1352298571
OWNER_ID = 39301079
WORKERS = {"memo": "memo", "pdf-manager": "pdf-manager"}
WRANGLER_VERSION = "4.149.0"
MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
MAX_EXPANDED_BYTES = 200 * 1024 * 1024
MAX_FILES = 5000


def main():
    mode = sys.argv[1] if len(sys.argv) == 2 else ""
    if mode not in ("preview", "production"):
        raise ValueError("Expected preview or production")
    if os.environ.get("GITHUB_REPOSITORY") != REPOSITORY:
        raise ValueError("Unexpected repository")

    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    api = GitHub(os.environ["GH_TOKEN"])
    root = Path(__file__).resolve().parents[2]
    deployer = Deployer(root, api)
    event_name = os.environ["GITHUB_EVENT_NAME"]
    if mode == "preview":
        reconcile_preview(api, deployer, event_name, event)
    else:
        reconcile_production(api, deployer, event_name, event)


def reconcile_preview(api, deployer, event_name, event):
    number = preview_number(event_name, event)
    requested_run = event.get("workflow_run", {}).get("id")
    for _ in range(3):
        pr = api.get(f"pulls/{number}")
        if not eligible_pr(pr):
            summary("Preview skipped: this is not an owner-authored, same-repository PR into main.")
            return
        if pr["state"] == "closed":
            for app in WORKERS:
                if api.get(f"pulls/{number}")["state"] != "closed":
                    break
                deployer.cleanup(app, number)
            else:
                if api.get(f"pulls/{number}")["state"] == "closed":
                    summary(f"PR #{number}: both Worker Previews pr-{number} are deleted.")
                    return
            requested_run = None
            continue

        head = pr["head"]["sha"]
        run = resolve_run(api, "pull_request", head, requested_run)
        if run is None:
            summary(f"PR #{number}: waiting for successful CI on {head}; no deployment performed.")
            return
        with deployer.artifact(run) as assets:
            results = []
            for app in WORKERS:
                current = api.get(f"pulls/{number}")
                if not same_open_head(current, head):
                    break
                url = deployer.preview(app, number, assets, head)
                results.append((app, url))
            else:
                if same_open_head(api.get(f"pulls/{number}"), head):
                    summary(f"PR #{number}, commit {head}\n\n" + "\n".join(
                        f"- {app}: {url}" for app, url in results
                    ))
                    return
        requested_run = None
    raise RuntimeError("PR state changed repeatedly. Re-run Preview to reconcile its current state.")


def reconcile_production(api, deployer, event_name, event):
    if event_name == "workflow_run":
        requested_run = event["workflow_run"]["id"]
    elif event_name == "workflow_dispatch" and os.environ.get("GITHUB_REF") == "refs/heads/main":
        requested_run = None
    else:
        raise ValueError("Production requires main CI or a manual run from main")
    head = api.get("git/ref/heads/main")["object"]["sha"]
    if deployer.trusted_sha() != head:
        raise RuntimeError("Trusted checkout is no longer current main; re-run Production")
    run = resolve_run(api, "push", head, requested_run)
    if run is None:
        summary(f"Production skipped: successful CI for current main {head} is unavailable.")
        return
    with deployer.artifact(run) as assets:
        for app in WORKERS:
            if api.get("git/ref/heads/main")["object"]["sha"] != head:
                summary("Production stopped because main changed. The new main CI owns the next deployment.")
                return
            deployer.production(app, assets, head)
    summary(f"Production deployed from successful main CI: {head}")


def preview_number(event_name, event):
    if event_name == "pull_request_target" and event.get("action") == "closed":
        return positive_number(event["pull_request"]["number"])
    if event_name == "workflow_run":
        pulls = event["workflow_run"].get("pull_requests", [])
        if len(pulls) != 1:
            raise ValueError("CI must identify exactly one PR; use the manual Preview recovery action")
        return positive_number(pulls[0]["number"])
    if event_name == "workflow_dispatch" and os.environ.get("GITHUB_REF") == "refs/heads/main":
        return positive_number(event["inputs"]["pr_number"])
    raise ValueError("Unexpected Preview event")


def resolve_run(api, event, head, requested_run=None):
    if not re.fullmatch(r"[0-9a-f]{40}", head):
        raise ValueError("Invalid commit SHA")
    workflow_id = api.get("actions/workflows/ci.yml")["id"]
    if requested_run is not None:
        run = api.get(f"actions/runs/{positive_number(requested_run)}")
        candidates = [run]
    else:
        query = urllib.parse.urlencode({"event": event, "head_sha": head, "per_page": 100})
        candidates = api.get(f"actions/workflows/ci.yml/runs?{query}")["workflow_runs"]
    for run in candidates:
        if valid_run(run, workflow_id, event, head):
            return run
    return None


def valid_run(run, workflow_id, event, head):
    return (
        run.get("workflow_id") == workflow_id
        and run.get("path", "").split("@", 1)[0] == ".github/workflows/ci.yml"
        and run.get("event") == event
        and run.get("status") == "completed"
        and run.get("conclusion") == "success"
        and run.get("head_sha") == head
        and run.get("repository", {}).get("id") == REPOSITORY_ID
        and run.get("head_repository", {}).get("id") == REPOSITORY_ID
        and (event != "push" or run.get("head_branch") == "main")
    )


def eligible_pr(pr):
    return (
        pr.get("user", {}).get("id") == OWNER_ID
        and pr.get("head", {}).get("repo", {}).get("id") == REPOSITORY_ID
        and pr.get("base", {}).get("repo", {}).get("id") == REPOSITORY_ID
        and pr.get("base", {}).get("ref") == "main"
        and pr.get("state") in ("open", "closed")
    )


def same_open_head(pr, head):
    return eligible_pr(pr) and pr["state"] == "open" and pr["head"]["sha"] == head


def positive_number(value):
    if isinstance(value, bool) or not re.fullmatch(r"[1-9][0-9]*", str(value)):
        raise ValueError("Expected a positive integer")
    return int(value)


class Deployer:
    def __init__(self, root, api):
        self.root = root
        self.api = api

    def artifact(self, run):
        return AssetArtifact(self.api, run)

    def trusted_sha(self):
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.root, text=True).strip()

    def preview(self, app, number, assets, head):
        check_existing_preview(WORKERS[app], number)
        config = trusted_config(self.root, app, assets, preview=True)
        with TemporaryConfig(config) as path:
            result = self.wrangler(app, ["preview", "--config", str(path), "--name",
                                         f"pr-{positive_number(number)}", "--worker-name", WORKERS[app],
                                         "--tag", "murder-mystery-actions", "--ignore-base-config", "--json"],
                                   extra_env={"GITHUB_SHA": head, "REPOSITORY_URL": f"https://github.com/{REPOSITORY}",
                                              "PULL_REQUEST_NUMBER": str(number),
                                              "PULL_REQUEST_URL": f"https://github.com/{REPOSITORY}/pull/{number}"})
        output = json.loads(result)
        preview = output.get("preview", {})
        if preview.get("name") != f"pr-{number}":
            raise RuntimeError("Wrangler returned an unexpected Preview name")
        validate_preview_deployment(preview, output.get("deployment", {}), number)
        if output["deployment"].get("annotations", {}).get("workers/commit_sha") != head:
            raise RuntimeError("Wrangler did not confirm the requested commit metadata")
        urls = preview.get("urls") or []
        if not urls or not valid_preview_url(urls[0]):
            raise RuntimeError("Wrangler returned no HTTPS Preview URL; check Worker preview_urls settings")
        return urls[0]

    def cleanup(self, app, number):
        name = f"pr-{positive_number(number)}"
        # Only this exact Preview is addressed; production Worker deletion is never used.
        if check_existing_preview(WORKERS[app], number) is not None:
            cloudflare_request(WORKERS[app], name, method="DELETE", allow_missing=True)

    def production(self, app, assets, head):
        config = trusted_config(self.root, app, assets, preview=False)
        with TemporaryConfig(config) as path:
            self.wrangler(app, ["deploy", "--config", str(path)], extra_env={"GITHUB_SHA": head})

    def wrangler(self, app, arguments, extra_env=None):
        executable = self.root / "apps" / app / "node_modules/.bin/wrangler"
        version = subprocess.run([str(executable), "--version"], check=True, capture_output=True,
                                 text=True).stdout.strip()
        if version != WRANGLER_VERSION:
            raise RuntimeError(f"Expected Wrangler {WRANGLER_VERSION}, got {version}")
        result = subprocess.run([str(executable), *arguments], check=True, capture_output=True,
                                text=True, cwd=self.root, env={**os.environ, **(extra_env or {})})
        return result.stdout


def check_existing_preview(worker, number):
    name = f"pr-{positive_number(number)}"
    preview = cloudflare_request(worker, name, allow_missing=True)
    if preview is None:
        return None
    identifier = preview.get("id")
    if preview.get("name") != name or not isinstance(identifier, str) or not identifier:
        raise RuntimeError("Unexpected existing Preview identity")
    deployment = cloudflare_request(worker, identifier, suffix="/deployments/latest")
    validate_preview_deployment(preview, deployment, number)
    return preview


def validate_preview_deployment(preview, deployment, number):
    annotations = deployment.get("annotations", {})
    expected = {"workers/repository_url": f"https://github.com/{REPOSITORY}",
                "workers/pull_request_number": str(number),
                "workers/pull_request_url": f"https://github.com/{REPOSITORY}/pull/{number}",
                "workers/tag": "murder-mystery-actions"}
    if (not isinstance(preview.get("id"), str) or not preview["id"]
            or deployment.get("preview_id") != preview["id"]
            or deployment.get("preview_name") != f"pr-{number}"
            or any(annotations.get(key) != value for key, value in expected.items())):
        raise RuntimeError("Preview ownership metadata does not match this repository and PR")
    bindings = deployment.get("env", {})
    if (not isinstance(bindings, dict)
            or any(not isinstance(binding, dict) or binding.get("type") != "assets"
                   for binding in bindings.values()) or preview.get("tail_consumers")):
        raise RuntimeError("Preview has non-assets bindings or tail consumers; refusing to inherit or delete them")


def cloudflare_request(worker, name, method="GET", allow_missing=False, suffix=""):
    if worker not in WORKERS.values() or method not in ("GET", "DELETE"):
        raise ValueError("Unexpected Cloudflare operation")
    if method == "DELETE" and not re.fullmatch(r"pr-[1-9][0-9]*", name):
        raise ValueError("Unexpected cleanup target")
    if suffix not in ("", "/deployments/latest"):
        raise ValueError("Unexpected Cloudflare resource")
    account = os.environ["CLOUDFLARE_ACCOUNT_ID"]
    if not re.fullmatch(r"[0-9a-f]{32}", account):
        raise ValueError("Invalid Cloudflare account ID")
    identifier = urllib.parse.quote(name, safe="")
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/workers/workers/{worker}/previews/{identifier}{suffix}"
    request = urllib.request.Request(url, method=method, headers={
        "Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
    })
    try:
        with urllib.request.build_opener(SafeRedirect()).open(request, timeout=60) as response:
            payload = json.load(response)
        if payload.get("success") is not True:
            raise RuntimeError("Cloudflare did not confirm the operation")
        result = payload.get("result")
        if method == "GET" and (not isinstance(result, dict) or not result):
            raise RuntimeError("Cloudflare returned no resource for a successful GET")
        return result
    except urllib.error.HTTPError as error:
        payload = json.loads(error.read())
        if (allow_missing and error.code == 404 and payload.get("success") is False
                and {item.get("code") for item in payload.get("errors", [])} == {10025}):
            return None
        raise RuntimeError(f"Preview API failed (HTTP {error.code}); not treated as deleted") from None


def trusted_config(root, app, assets, preview):
    if app not in WORKERS:
        raise ValueError("Unknown application")
    config = parse_jsonc((root / "apps" / app / "wrangler.jsonc").read_text())
    if config.get("name") != WORKERS[app] or "main" in config:
        raise ValueError("Only the expected static-assets Worker is supported")
    if preview:
        allowed = ("name", "compatibility_date", "compatibility_flags", "observability", "upload_source_maps", "assets")
        config = {key: config[key] for key in allowed if key in config}
        config["previews"] = {}
    config["assets"] = {**config["assets"], "directory": str(Path(assets) / app / "dist")}
    return config


def parse_jsonc(text):
    string = r'("(?:\\.|[^"\\])*")'
    text = re.sub(string + r"|//[^\n]*|/\*.*?\*/", lambda match: match.group(1) or "", text, flags=re.S)
    return json.loads(re.sub(string + r"|,(?=\s*[}\]])", lambda match: match.group(1) or "", text))


def valid_preview_url(url):
    parsed = urllib.parse.urlsplit(url)
    return (parsed.scheme == "https" and parsed.hostname is not None
            and parsed.hostname.endswith(".workers.dev") and parsed.username is None
            and parsed.password is None and parsed.port is None
            and parsed.path in ("", "/") and not parsed.query and not parsed.fragment)


class TemporaryConfig:
    def __init__(self, config):
        self.config = config

    def __enter__(self):
        self.directory = tempfile.TemporaryDirectory()
        path = Path(self.directory.name) / "wrangler.json"
        path.write_text(json.dumps(self.config))
        return path

    def __exit__(self, *args):
        self.directory.cleanup()


class AssetArtifact:
    def __init__(self, api, run):
        self.api, self.run = api, run

    def __enter__(self):
        expected = f"static-assets-{positive_number(self.run['run_attempt'])}"
        artifacts = self.api.paginate(f"actions/runs/{positive_number(self.run['id'])}/artifacts", "artifacts")
        matches = [item for item in artifacts if item["name"] == expected and not item.get("expired")]
        if len(matches) != 1 or matches[0]["size_in_bytes"] > MAX_ARCHIVE_BYTES:
            raise ValueError("Expected exactly one bounded artifact from the successful CI attempt")
        item = matches[0]
        origin = item.get("workflow_run", {})
        if origin.get("id") != self.run["id"] or origin.get("head_sha") != self.run["head_sha"]:
            raise ValueError("Artifact provenance does not match CI")
        archive = self.api.download(f"actions/artifacts/{positive_number(item['id'])}/zip")
        self.directory = tempfile.TemporaryDirectory()
        try:
            extract_assets(archive, Path(self.directory.name))
        except Exception:
            self.directory.cleanup()
            raise
        return Path(self.directory.name)

    def __exit__(self, *args):
        self.directory.cleanup()


def extract_assets(archive, destination):
    if len(archive) > MAX_ARCHIVE_BYTES:
        raise ValueError("Artifact too large")
    with zipfile.ZipFile(io.BytesIO(archive)) as package:
        entries = package.infolist()
        if len(entries) > MAX_FILES or sum(item.file_size for item in entries) > MAX_EXPANDED_BYTES:
            raise ValueError("Expanded artifact too large")
        seen = set()
        for item in entries:
            path = PurePosixPath(item.filename)
            parts = path.parts
            mode = item.external_attr >> 16
            canonical = path.as_posix()
            if (item.filename.rstrip("/") != canonical
                    or "\x00" in item.orig_filename or path.is_absolute() or ".." in parts or "\\" in item.filename or "\x00" in item.filename
                    or len(parts) < 2 or parts[0] not in WORKERS or parts[1] != "dist"
                    or stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR))
                    or canonical in seen):
                raise ValueError("Unexpected artifact path or file type")
            seen.add(canonical)
            target = destination.joinpath(*parts)
            if item.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(package.read(item))
        if any(not (destination / app / "dist/index.html").is_file() for app in WORKERS):
            raise ValueError("Both application entrypoints are required")


class GitHub:
    def __init__(self, token):
        self.token = token

    def get(self, path):
        return json.loads(self.download(path, limit=10 * 1024 * 1024))

    def paginate(self, path, key):
        result = []
        for page in range(1, 1001):
            payload = self.get(f"{path}?per_page=100&page={page}")
            result.extend(payload[key])
            if len(payload[key]) < 100:
                return result
        raise RuntimeError("Unexpectedly large GitHub listing")

    def download(self, path, limit=MAX_ARCHIVE_BYTES):
        request = urllib.request.Request(f"https://api.github.com/repos/{REPOSITORY}/{path}", headers={
            "Authorization": f"Bearer {self.token}", "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "murder-mystery-deployment",
        })
        opener = urllib.request.build_opener(SafeRedirect())
        with opener.open(request, timeout=60) as response:
            payload = response.read(limit + 1)
        if len(payload) > limit:
            raise ValueError("Download exceeded size limit")
        return payload


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        if urllib.parse.urlsplit(new_url).scheme != "https":
            raise ValueError("Refusing non-HTTPS redirect")
        redirected = super().redirect_request(request, fp, code, message, headers, new_url)
        if urllib.parse.urlsplit(request.full_url).netloc != urllib.parse.urlsplit(new_url).netloc:
            redirected.remove_header("Authorization")
        return redirected


def summary(message):
    print(message)
    if path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(path, "a", encoding="utf-8") as stream:
            stream.write(message + "\n")


if __name__ == "__main__":
    main()
