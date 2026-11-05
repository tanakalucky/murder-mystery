"""Deployment tests use only local fixtures and mocked service/CLI boundaries."""

from contextlib import nullcontext
import copy
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, call, patch
import urllib.error
import urllib.request
import warnings
import zipfile

import cloudflare as deploy


ROOT = Path(__file__).resolve().parents[2]
HEAD = "a" * 40
NEXT_HEAD = "b" * 40
PR_NUMBER = 27


class IsolatedTestCase(unittest.TestCase):
    def setUp(self):
        # A missing mock must fail rather than contact a service or launch a CLI.
        for target in ("urllib.request.urlopen", "urllib.request.OpenerDirector.open",
                       "subprocess.run", "subprocess.check_output"):
            blocker = patch(target, side_effect=AssertionError(f"Unexpected external operation: {target}"))
            blocker.start()
            self.addCleanup(blocker.stop)
        summary = patch.object(deploy, "summary")
        self.summary = summary.start()
        self.addCleanup(summary.stop)


class GuardTests(IsolatedTestCase):
    def test_PR番号は正の整数だけを受け付ける(self):
        for value in (1, "27"):
            with self.subTest(value=value):
                self.assertEqual(deploy.positive_number(value), int(value))
        for value in (True, False, 0, -1, "01", "1; echo bad", "../1", " 1", "1.0", None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                deploy.positive_number(value)

    def test_本人の同一リポジトリmain宛PRだけを対象にする(self):
        pr = make_pr()

        self.assertTrue(deploy.eligible_pr(pr))
        for path, value in ((('user', 'id'), 1), (('head', 'repo', 'id'), 1),
                            (('base', 'repo', 'id'), 1), (('base', 'ref'), 'other'),
                            (('state',), 'unknown')):
            changed = copy.deepcopy(pr)
            set_nested(changed, path, value)
            with self.subTest(path=path):
                self.assertFalse(deploy.eligible_pr(changed))

    def test_openでもheadが変われば旧SHAは対象外にする(self):
        self.assertTrue(deploy.same_open_head(make_pr(), HEAD))
        self.assertFalse(deploy.same_open_head(make_pr(head=NEXT_HEAD), HEAD))
        self.assertFalse(deploy.same_open_head(make_pr(state="closed"), HEAD))

    def test_CI成功だけでなくworkflowとrepositoryとSHAを照合する(self):
        run = make_run()
        self.assertTrue(deploy.valid_run(run, 10, "pull_request", HEAD))
        invalid = ((('workflow_id',), 99), (('path',), '.github/workflows/other.yml'),
                   (('event',), 'push'), (('status',), 'in_progress'),
                   (('conclusion',), 'failure'), (('head_sha',), NEXT_HEAD),
                   (('repository', 'id'), 1), (('head_repository', 'id'), 1))

        for path, value in invalid:
            changed = copy.deepcopy(run)
            set_nested(changed, path, value)
            with self.subTest(path=path):
                self.assertFalse(deploy.valid_run(changed, 10, "pull_request", HEAD))

    def test_本番はmainのpush成功runだけを許可する(self):
        run = make_run(event="push")
        self.assertTrue(deploy.valid_run(run, 10, "push", HEAD))

        run["head_branch"] = "feature"

        self.assertFalse(deploy.valid_run(run, 10, "push", HEAD))

    def test_指定runはAPIから再取得し現在SHAの成功runだけを返す(self):
        api = Mock()
        api.get.side_effect = [{"id": 10}, make_run()]

        result = deploy.resolve_run(api, "pull_request", HEAD, 50)

        self.assertEqual(result["id"], 50)
        self.assertEqual(api.get.call_args_list[1].args, ("actions/runs/50",))

    def test_旧SHAの指定runを新head用に流用しない(self):
        api = Mock()
        api.get.side_effect = [{"id": 10}, make_run()]

        result = deploy.resolve_run(api, "pull_request", NEXT_HEAD, 50)

        self.assertIsNone(result)

    def test_手動復旧は現在SHAに一致する成功runを選ぶ(self):
        api = Mock()
        failed = make_run()
        failed["conclusion"] = "failure"
        api.get.side_effect = [{"id": 10}, {"workflow_runs": [failed, make_run()]}]

        result = deploy.resolve_run(api, "pull_request", HEAD)

        self.assertEqual(result["id"], 50)
        self.assertIn(f"head_sha={HEAD}", api.get.call_args_list[1].args[0])

    def test_曖昧なPR関連付けを推測で補わない(self):
        for pulls in ([], [{"number": 1}, {"number": 2}]):
            with self.subTest(pulls=pulls), self.assertRaises(ValueError):
                deploy.preview_number("workflow_run", {"workflow_run": {"pull_requests": pulls}})
        self.assertEqual(deploy.preview_number("workflow_run", preview_event()), PR_NUMBER)

    def test_手動実行はmainからだけ許可する(self):
        event = {"inputs": {"pr_number": str(PR_NUMBER)}}
        with patch.dict(os.environ, {"GITHUB_REF": "refs/heads/feature"}):
            with self.assertRaises(ValueError):
                deploy.preview_number("workflow_dispatch", event)
        with patch.dict(os.environ, {"GITHUB_REF": "refs/heads/main"}):
            self.assertEqual(deploy.preview_number("workflow_dispatch", event), PR_NUMBER)


class ReconcileTests(IsolatedTestCase):
    def test_最新openの成功成果物だけを両Workerへ反映する(self):
        api, runner = reconciliation_fakes([make_pr()] * 4)

        with patch.object(deploy, "resolve_run", return_value=make_run()):
            deploy.reconcile_preview(api, runner, "workflow_run", preview_event())

        self.assertEqual([call.args[0] for call in runner.preview.call_args_list], list(deploy.WORKERS))
        self.assertTrue(all(call.args[1:] == (PR_NUMBER, Path("/assets"), HEAD)
                            for call in runner.preview.call_args_list))
        runner.production.assert_not_called()
        runner.cleanup.assert_not_called()
        self.assertIn(HEAD, self.summary.call_args.args[0])

    def test_CI失敗または未完了なら成果物もデプロイも取得しない(self):
        api, runner = reconciliation_fakes([make_pr()])

        with patch.object(deploy, "resolve_run", return_value=None):
            deploy.reconcile_preview(api, runner, "workflow_run", preview_event())

        runner.artifact.assert_not_called()
        runner.preview.assert_not_called()
        runner.production.assert_not_called()

    def test_forkや第三者PRをデプロイしない(self):
        pr = make_pr()
        pr["head"]["repo"]["id"] = 999
        api, runner = reconciliation_fakes([pr])

        deploy.reconcile_preview(api, runner, "workflow_run", preview_event())

        runner.artifact.assert_not_called()
        runner.preview.assert_not_called()
        runner.cleanup.assert_not_called()

    def test_closeはCIやbuildに依存せず両Workerの当該Previewだけを削除する(self):
        api, runner = reconciliation_fakes([make_pr(state="closed")] * 4)
        event = {"action": "closed", "pull_request": {"number": PR_NUMBER}}

        with patch.object(deploy, "resolve_run") as resolve:
            deploy.reconcile_preview(api, runner, "pull_request_target", event)

        self.assertEqual([call.args for call in runner.cleanup.call_args_list],
                         [("memo", PR_NUMBER), ("pdf-manager", PR_NUMBER)])
        resolve.assert_not_called()
        runner.artifact.assert_not_called()
        runner.production.assert_not_called()

    def test_デプロイ途中のcloseを再照会して両Previewを削除する(self):
        states = [make_pr(), make_pr()] + [make_pr(state="closed")] * 5
        api, runner = reconciliation_fakes(states)

        with patch.object(deploy, "resolve_run", return_value=make_run()):
            deploy.reconcile_preview(api, runner, "workflow_run", preview_event())

        self.assertEqual(runner.preview.call_count, 1)
        self.assertEqual(runner.cleanup.call_count, 2)
        self.assertNotIn("https://", self.summary.call_args.args[0])

    def test_追加pushで古いheadの反映を止め新headへ揃える(self):
        states = [make_pr(), make_pr()] + [make_pr(head=NEXT_HEAD)] * 5
        api, runner = reconciliation_fakes(states)

        with patch.object(deploy, "resolve_run", side_effect=[make_run(), make_run(head=NEXT_HEAD)]):
            deploy.reconcile_preview(api, runner, "workflow_run", preview_event())

        self.assertEqual([call.args[3] for call in runner.preview.call_args_list],
                         [HEAD, NEXT_HEAD, NEXT_HEAD])
        self.assertIn(NEXT_HEAD, self.summary.call_args.args[0])
        self.assertNotIn(HEAD, self.summary.call_args.args[0])

    def test_cleanup途中のreopen後に古いcloseが残りを削除しない(self):
        states = [make_pr(state="closed")] * 2 + [make_pr()] * 5
        api, runner = reconciliation_fakes(states)
        event = {"action": "closed", "pull_request": {"number": PR_NUMBER}}

        with patch.object(deploy, "resolve_run", return_value=make_run()):
            deploy.reconcile_preview(api, runner, "pull_request_target", event)

        runner.cleanup.assert_called_once_with("memo", PR_NUMBER)
        self.assertEqual(runner.preview.call_count, 2)
        self.assertNotIn("deleted", self.summary.call_args.args[0])

    def test_状態が連続して変わる場合は成功扱いせず復旧を求める(self):
        api, runner = reconciliation_fakes([make_pr(), make_pr(head=NEXT_HEAD)] * 3)

        with patch.object(deploy, "resolve_run", return_value=make_run()), self.assertRaises(RuntimeError):
            deploy.reconcile_preview(api, runner, "workflow_run", preview_event())

        runner.preview.assert_not_called()
        self.summary.assert_not_called()

    def test_途中失敗を両アプリ成功として報告しない(self):
        api, runner = reconciliation_fakes([make_pr()] * 3)
        runner.preview.side_effect = ["https://memo.workers.dev", RuntimeError("failed")]

        with patch.object(deploy, "resolve_run", return_value=make_run()), self.assertRaises(RuntimeError):
            deploy.reconcile_preview(api, runner, "workflow_run", preview_event())

        self.summary.assert_not_called()
        runner.production.assert_not_called()

    def test_本番はcheckoutとmainと成功CIが同じSHAの場合だけ反映する(self):
        api = Mock()
        api.get.return_value = {"object": {"sha": HEAD}}
        runner = Mock()
        runner.trusted_sha.return_value = HEAD
        runner.artifact.return_value = nullcontext(Path("/assets"))

        with patch.object(deploy, "resolve_run", return_value=make_run(event="push")):
            deploy.reconcile_production(api, runner, "workflow_run", {"workflow_run": {"id": 50}})

        self.assertEqual([call.args for call in runner.production.call_args_list],
                         [("memo", Path("/assets"), HEAD), ("pdf-manager", Path("/assets"), HEAD)])
        runner.preview.assert_not_called()

    def test_本番のcheckoutが古ければデプロイしない(self):
        api = Mock()
        api.get.return_value = {"object": {"sha": NEXT_HEAD}}
        runner = Mock()
        runner.trusted_sha.return_value = HEAD

        with self.assertRaises(RuntimeError):
            deploy.reconcile_production(api, runner, "workflow_run", {"workflow_run": {"id": 50}})

        runner.production.assert_not_called()
        runner.artifact.assert_not_called()

    def test_本番反映途中でmainが変わったら次アプリへの反映を止める(self):
        api = Mock()
        api.get.side_effect = [{"object": {"sha": sha}} for sha in (HEAD, HEAD, NEXT_HEAD)]
        runner = Mock()
        runner.trusted_sha.return_value = HEAD
        runner.artifact.return_value = nullcontext(Path("/assets"))

        with patch.object(deploy, "resolve_run", return_value=make_run(event="push")):
            deploy.reconcile_production(api, runner, "workflow_run", {"workflow_run": {"id": 50}})

        runner.production.assert_called_once_with("memo", Path("/assets"), HEAD)
        self.assertIn("stopped", self.summary.call_args.args[0])


class PreviewBoundaryTests(IsolatedTestCase):
    def test_新規Previewは不存在確認後に作成できる(self):
        with patch.object(deploy, "cloudflare_request", return_value=None) as request:
            result = deploy.check_existing_preview("memo", PR_NUMBER)

        self.assertIsNone(result)
        request.assert_called_once_with("memo", f"pr-{PR_NUMBER}", allow_missing=True)

    def test_既存PreviewはIDと所有metadataを照合する(self):
        preview, deployment = preview_payload()
        with patch.object(deploy, "cloudflare_request", side_effect=[preview, deployment]) as request:
            result = deploy.check_existing_preview("memo", PR_NUMBER)

        self.assertEqual(result, preview)
        self.assertEqual(request.call_args.args, ("memo", preview["id"]))
        self.assertEqual(request.call_args.kwargs, {"suffix": "/deployments/latest"})

    def test_API読取は検証済みPreviewとdeploymentを返す(self):
        preview, deployment = preview_payload()
        with patch.object(deploy, "cloudflare_request", side_effect=[preview, deployment]) as request:
            result = deploy.read_preview("memo", PR_NUMBER)

        self.assertEqual(result, (preview, deployment))
        self.assertEqual(request.call_args_list, [
            call("memo", f"pr-{PR_NUMBER}", allow_missing=True),
            call("memo", preview["id"], suffix="/deployments/latest"),
        ])

    def test_API読取は不存在ならdeploymentを取得しない(self):
        with patch.object(deploy, "cloudflare_request", return_value=None) as request:
            result = deploy.read_preview("memo", PR_NUMBER)

        self.assertIsNone(result)
        request.assert_called_once_with("memo", f"pr-{PR_NUMBER}", allow_missing=True)

    def test_PreviewとdeploymentのIDが共に欠落または空なら拒否する(self):
        for identifier in (None, "", 0):
            preview, deployment = preview_payload()
            preview["id"] = identifier
            deployment["preview_id"] = identifier

            with self.subTest(identifier=identifier), self.assertRaises(RuntimeError):
                deploy.validate_preview_deployment(preview, deployment, PR_NUMBER)

    def test_他repoや他PRや管理外tagのPreviewを更新削除しない(self):
        preview, deployment = preview_payload()
        for key in ("workers/repository_url", "workers/pull_request_number",
                    "workers/pull_request_url", "workers/tag"):
            changed = copy.deepcopy(deployment)
            changed["annotations"][key] = "different"
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                deploy.validate_preview_deployment(preview, changed, PR_NUMBER)

    def test_secretや本番資源を継承する既存Previewを拒否する(self):
        preview, deployment = preview_payload()
        for binding_type in ("secret_text", "plain_text", "json", "inherit", "kv_namespace",
                             "r2_bucket", "d1", "service"):
            changed = copy.deepcopy(deployment)
            changed["env"] = {"TEST": {"type": binding_type}}
            with self.subTest(binding_type=binding_type), self.assertRaises(RuntimeError):
                deploy.validate_preview_deployment(preview, changed, PR_NUMBER)

    def test_env省略またはassetsのみは許可し不正shapeを拒否する(self):
        preview, deployment = preview_payload()
        deploy.validate_preview_deployment(preview, deployment, PR_NUMBER)
        deployment["env"] = {"ASSETS": {"type": "assets"}}
        deploy.validate_preview_deployment(preview, deployment, PR_NUMBER)
        for bindings in (None, [], {"BROKEN": None}, {"BROKEN": []}):
            deployment["env"] = bindings
            with self.subTest(bindings=bindings), self.assertRaises(RuntimeError):
                deploy.validate_preview_deployment(preview, deployment, PR_NUMBER)

    def test_tail_consumerのあるPreviewを拒否する(self):
        preview, deployment = preview_payload()
        preview["tail_consumers"] = [{"service": "production-observer"}]

        with self.assertRaises(RuntimeError):
            deploy.validate_preview_deployment(preview, deployment, PR_NUMBER)

    def test_cleanupは管理対象の正確な名前だけをDELETEする(self):
        runner = deploy.Deployer(ROOT, Mock())
        with patch.object(deploy, "check_existing_preview", return_value={"id": "owned"}), \
                patch.object(deploy, "cloudflare_request") as request:
            runner.cleanup("memo", PR_NUMBER)

        request.assert_called_once_with("memo", f"pr-{PR_NUMBER}", method="DELETE", allow_missing=True)

    def test_cleanupで不存在ならDELETEも本番操作もしない(self):
        runner = deploy.Deployer(ROOT, Mock())
        with patch.object(deploy, "check_existing_preview", return_value=None), \
                patch.object(deploy, "cloudflare_request") as request:
            runner.cleanup("pdf-manager", PR_NUMBER)

        request.assert_not_called()

    def test_cleanupは不正Workerや非PR名をAPI呼出前に拒否する(self):
        for worker, name in (("other", "pr-27"), ("memo", "production"),
                             ("memo", "pr-0"), ("memo", "pr-27/../main")):
            with self.subTest(worker=worker, name=name), self.assertRaises(ValueError):
                deploy.cloudflare_request(worker, name, method="DELETE")

    def test_404かつ10025だけを既に存在しないと扱う(self):
        error = http_error(404, {"success": False, "errors": [{"code": 10025}]})
        opener = Mock()
        opener.open.side_effect = error

        with cloudflare_environment(), patch.object(deploy.urllib.request, "build_opener", return_value=opener):
            result = deploy.cloudflare_request("memo", "pr-27", method="DELETE", allow_missing=True)

        self.assertIsNone(result)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.method, "DELETE")
        self.assertEqual(request.full_url,
                         "https://api.cloudflare.com/client/v4/accounts/" + "0" * 32
                         + "/workers/workers/memo/previews/pr-27")

    def test_認証通信失敗や別の404を削除済み扱いしない(self):
        cases = [(code, {"success": False, "errors": [{"code": 10025}]})
                 for code in (401, 403, 429, 500)]
        cases += [(404, payload) for payload in (
            {"success": False, "errors": [{"code": 10007}]},
            {"success": False, "errors": [{"code": 10090}]},
            {"success": False, "errors": []},
            {"success": False, "errors": [{"code": 10025}, {"code": 1}]},
            {"success": True, "errors": [{"code": 10025}]},
        )]
        for code, payload in cases:
            opener = Mock()
            opener.open.side_effect = http_error(code, payload)
            with self.subTest(code=code, payload=payload), cloudflare_environment(), \
                    patch.object(deploy.urllib.request, "build_opener", return_value=opener), \
                    self.assertRaises(RuntimeError):
                deploy.cloudflare_request("memo", "pr-27", method="DELETE", allow_missing=True)

    def test_非JSONやネットワーク障害を不存在と誤認しない(self):
        for error in (http_error(404, b"not json"), urllib.error.URLError("offline")):
            opener = Mock()
            opener.open.side_effect = error
            with self.subTest(error=type(error).__name__), cloudflare_environment(), \
                    patch.object(deploy.urllib.request, "build_opener", return_value=opener), \
                    self.assertRaises((ValueError, urllib.error.URLError)):
                deploy.cloudflare_request("memo", "pr-27", method="DELETE", allow_missing=True)

    def test_成功応答でもsuccessがtrueでなければ拒否する(self):
        for success in (False, None):
            opener = Mock()
            opener.open.return_value = io.BytesIO(json.dumps({"success": success}).encode())
            with self.subTest(success=success), cloudflare_environment(), \
                    patch.object(deploy.urllib.request, "build_opener", return_value=opener), \
                    self.assertRaises(RuntimeError):
                deploy.cloudflare_request("memo", "pr-27", method="DELETE")

    def test_GET成功でもresult欠落や非objectを不存在と扱わない(self):
        payloads = [{"success": True}]
        payloads += [{"success": True, "result": result} for result in (None, [], "", {})]
        for payload in payloads:
            opener = Mock()
            opener.open.return_value = io.BytesIO(json.dumps(payload).encode())

            with self.subTest(payload=payload), cloudflare_environment(), \
                    patch.object(deploy.urllib.request, "build_opener", return_value=opener), \
                    self.assertRaises(RuntimeError):
                deploy.cloudflare_request("memo", "pr-27", allow_missing=True)

    def test_preview実行は固定Workerと検証済みSHAをCLIへ渡す(self):
        runner = deploy.Deployer(ROOT, Mock())
        preview, deployment = preview_payload()
        preview["urls"] = ["https://pr-27-memo.example.workers.dev/"]
        captured = {}

        def fake_cli(app, arguments, extra_env=None):
            captured.update(app=app, arguments=arguments, env=extra_env,
                            config=json.loads(Path(arguments[arguments.index("--config") + 1]).read_text()))
            return "Asset upload complete\n"

        with patch.object(deploy, "check_existing_preview", return_value=None), \
                patch.object(deploy, "read_preview", return_value=(preview, deployment)) as read, \
                patch.object(runner, "wrangler", side_effect=fake_cli):
            url = runner.preview("memo", PR_NUMBER, Path("/assets"), HEAD)

        self.assertEqual(url, preview["urls"][0])
        read.assert_called_once_with("memo", PR_NUMBER)
        self.assertEqual(captured["arguments"][0], "preview")
        self.assertIn("--ignore-base-config", captured["arguments"])
        self.assertIn("--json", captured["arguments"])
        self.assertEqual(captured["env"]["GITHUB_SHA"], HEAD)
        self.assertEqual(captured["env"]["PULL_REQUEST_NUMBER"], str(PR_NUMBER))
        self.assertEqual(captured["config"]["name"], "memo")
        self.assertNotIn("routes", captured["config"])

    def test_CLIの進捗付きJSONや空出力でもAPI検証できれば成功する(self):
        runner = deploy.Deployer(ROOT, Mock())
        preview, deployment = preview_payload()
        preview["urls"] = ["https://pr-27-memo.example.workers.dev/"]
        output = json.dumps({"preview": preview, "deployment": deployment})
        for stdout in ("Uploading assets...\nUploaded 2 files\n" + output, "", "arbitrary output", output):
            with self.subTest(stdout=stdout), \
                    patch.object(deploy, "check_existing_preview", return_value=None) as preflight, \
                    patch.object(runner, "wrangler", return_value=stdout) as cli, \
                    patch.object(deploy, "cloudflare_request", side_effect=[preview, deployment]) as request:
                operations = Mock()
                operations.attach_mock(preflight, "preflight")
                operations.attach_mock(cli, "cli")
                operations.attach_mock(request, "api")

                url = runner.preview("memo", PR_NUMBER, Path("/assets"), HEAD)

                self.assertEqual(url, preview["urls"][0])
                cli.assert_called_once()
                preflight.assert_called_once_with("memo", PR_NUMBER)
                self.assertEqual([operation[0] for operation in operations.mock_calls],
                                 ["preflight", "cli", "api", "api"])
                self.assertEqual(request.call_args_list, [
                    call("memo", f"pr-{PR_NUMBER}", allow_missing=True),
                    call("memo", preview["id"], suffix="/deployments/latest"),
                ])

    def test_APIの不正なPreviewはCLI出力が正常でも成功扱いせず再実行しない(self):
        runner = deploy.Deployer(ROOT, Mock())
        preview, deployment = preview_payload()
        preview["urls"] = ["https://pr-27-memo.example.workers.dev/"]
        valid = {"preview": preview, "deployment": deployment}
        invalid_fields = [
            (("preview", "name"), "pr-28"),
            (("preview", "id"), None),
            (("preview", "id"), ""),
            (("preview", "id"), 27),
            (("deployment", "preview_id"), "different-preview-id"),
            (("deployment", "preview_name"), "pr-28"),
            (("deployment", "annotations", "workers/commit_sha"), NEXT_HEAD),
            (("deployment", "annotations", "workers/commit_sha"), None),
            (("deployment", "annotations", "workers/tag"), "unmanaged"),
            (("deployment", "annotations", "workers/repository_url"), "https://github.com/other/repo"),
            (("deployment", "annotations", "workers/pull_request_number"), "28"),
            (("deployment", "annotations", "workers/pull_request_url"),
             f"https://github.com/{deploy.REPOSITORY}/pull/28"),
            (("deployment", "env"), {"SECRET": {"type": "secret_text"}}),
            (("preview", "tail_consumers"), [{"service": "production-observer"}]),
            (("preview", "urls"), []),
            (("preview", "urls"), ["https://example.com/"]),
            (("preview", "urls"), ["http://preview.workers.dev"]),
            (("preview", "urls"), ["https://user:pass@preview.workers.dev"]),
        ]
        for path, value in invalid_fields:
            changed = copy.deepcopy(valid)
            set_nested(changed, path, value)
            with self.subTest(path=path, value=value), \
                    patch.object(deploy, "check_existing_preview", return_value=None), \
                    patch.object(runner, "wrangler", return_value=json.dumps(valid)) as cli, \
                    patch.object(deploy, "cloudflare_request",
                                 side_effect=[changed["preview"], changed["deployment"]]) as request:
                with self.assertRaises(RuntimeError):
                    runner.preview("memo", PR_NUMBER, Path("/assets"), HEAD)

                cli.assert_called_once()
                self.assertEqual(request.call_count, 1 if path in (
                    ("preview", "name"), ("preview", "id")) else 2)
                self.assertTrue(all("method" not in item.kwargs for item in request.call_args_list))

    def test_APIで作成結果が見つからなくてもCLIを再実行しない(self):
        runner = deploy.Deployer(ROOT, Mock())
        with patch.object(deploy, "check_existing_preview", return_value=None), \
                patch.object(runner, "wrangler", return_value="Uploaded assets") as cli, \
                patch.object(deploy, "cloudflare_request", return_value=None) as request:
            with self.assertRaises(RuntimeError):
                runner.preview("memo", PR_NUMBER, Path("/assets"), HEAD)

        cli.assert_called_once()
        request.assert_called_once_with("memo", f"pr-{PR_NUMBER}", allow_missing=True)

    def test_API検証の通信失敗を不存在扱いせずCLIを再実行しない(self):
        runner = deploy.Deployer(ROOT, Mock())
        error = urllib.error.URLError("verification unavailable")
        with patch.object(deploy, "check_existing_preview", return_value=None), \
                patch.object(runner, "wrangler", return_value="Uploaded assets") as cli, \
                patch.object(deploy, "cloudflare_request", side_effect=error) as request:
            with self.assertRaises(urllib.error.URLError) as caught:
                runner.preview("memo", PR_NUMBER, Path("/assets"), HEAD)

        self.assertIs(caught.exception, error)
        cli.assert_called_once()
        request.assert_called_once_with("memo", f"pr-{PR_NUMBER}", allow_missing=True)

    def test_CLI例外は結果不明のまま伝播し再実行や削除をしない(self):
        runner = deploy.Deployer(ROOT, Mock())
        error = subprocess.CalledProcessError(1, ["wrangler", "preview"], output="Uploaded assets")
        with patch.object(deploy, "check_existing_preview", return_value=None) as preflight, \
                patch.object(runner, "wrangler", side_effect=error) as cli, \
                patch.object(deploy, "read_preview") as read, \
                patch.object(deploy, "cloudflare_request") as request:
            with self.assertRaises(subprocess.CalledProcessError) as caught:
                runner.preview("memo", PR_NUMBER, Path("/assets"), HEAD)

        self.assertIs(caught.exception, error)
        preflight.assert_called_once_with("memo", PR_NUMBER)
        cli.assert_called_once()
        read.assert_not_called()
        request.assert_not_called()

    def test_CLIは固定バージョンだけを許可しshellを使わない(self):
        runner = deploy.Deployer(ROOT, Mock())
        results = [subprocess.CompletedProcess([], 0, deploy.WRANGLER_VERSION + "\n"),
                   subprocess.CompletedProcess([], 0, "{}")]
        with patch.object(deploy.subprocess, "run", side_effect=results) as run:
            result = runner.wrangler("memo", ["preview", "--name", "pr-27"], {"GITHUB_SHA": HEAD})

        self.assertEqual(result, "{}")
        command = run.call_args.args[0]
        self.assertEqual(command[1:], ["preview", "--name", "pr-27"])
        self.assertNotIn("shell", run.call_args.kwargs)
        self.assertEqual(run.call_args.kwargs["env"]["GITHUB_SHA"], HEAD)

    def test_CLIバージョンが異なればdeployを実行しない(self):
        runner = deploy.Deployer(ROOT, Mock())
        with patch.object(deploy.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "4.126.0\n")) as run:
            with self.assertRaises(RuntimeError):
                runner.wrangler("memo", ["preview"])

        self.assertEqual(run.call_count, 1)


class ArtifactTests(IsolatedTestCase):
    def test_両アプリの静的ファイルだけを安全に展開する(self):
        archive = make_zip()
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)

            deploy.extract_assets(archive, destination)

            self.assertEqual((destination / "memo/dist/index.html").read_bytes(), b"memo")
            self.assertEqual((destination / "pdf-manager/dist/index.html").read_bytes(), b"pdf")

    def test_絶対パスやtraversalや対象外ディレクトリを拒否する(self):
        names = ("/memo/dist/x", "memo/dist/../../outside", "memo\\dist\\x",
                 "other/dist/index.html", "memo/package.json", "memo")
        for name in names:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
                deploy.extract_assets(make_zip([(name, b"bad")]), Path(directory))

    def test_symlinkやFIFOを展開しない(self):
        for mode in (stat.S_IFLNK | 0o777, stat.S_IFIFO | 0o600):
            entry = zipfile.ZipInfo("memo/dist/link")
            entry.create_system = 3
            entry.external_attr = mode << 16
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
                deploy.extract_assets(make_zip([(entry, b"target")]), Path(directory))

    def test_重複ファイルによる上書きを拒否する(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            archive = make_zip([("memo/dist/index.html", b"overwritten")])
        with tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
            deploy.extract_assets(archive, Path(directory))

    def test_正規化すると同一になるZIPパスも上書きを拒否する(self):
        for name in ("memo/dist/./index.html", "memo//dist/index.html"):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
                deploy.extract_assets(make_zip([(name, b"overwritten")]), Path(directory))

    def test_展開サイズとファイル数と圧縮サイズの上限を守る(self):
        archive = make_zip()
        for constant, value in (("MAX_ARCHIVE_BYTES", 1), ("MAX_EXPANDED_BYTES", 1), ("MAX_FILES", 1)):
            with self.subTest(constant=constant), patch.object(deploy, constant, value), \
                    tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
                deploy.extract_assets(archive, Path(directory))

    def test_両アプリのentrypointがなければ拒否する(self):
        archive = make_zip(include_defaults=False)

        with tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
            deploy.extract_assets(archive, Path(directory))

    def test_成功runの現在attemptの成果物だけを取得する(self):
        run = make_run()
        api = Mock()
        api.paginate.return_value = [make_artifact()]
        api.download.return_value = make_zip()

        with deploy.AssetArtifact(api, run) as directory:
            self.assertTrue((directory / "memo/dist/index.html").exists())
        self.assertFalse(directory.exists())
        api.download.assert_called_once_with("actions/artifacts/70/zip")

    def test_成果物の重複期限切れ旧attempt過大サイズを拒否する(self):
        item = make_artifact()
        cases = [[], [item, copy.deepcopy(item)]]
        for field, value in (("expired", True), ("name", "static-assets-1"),
                             ("size_in_bytes", deploy.MAX_ARCHIVE_BYTES + 1)):
            changed = copy.deepcopy(item)
            changed[field] = value
            cases.append([changed])
        for items in cases:
            api = Mock()
            api.paginate.return_value = items
            with self.subTest(items=items), self.assertRaises(ValueError):
                with deploy.AssetArtifact(api, make_run()):
                    self.fail("Unexpected artifact")
            api.download.assert_not_called()

    def test_成果物のrunとhead出所を照合する(self):
        for field, value in (("id", 999), ("head_sha", NEXT_HEAD)):
            api = Mock()
            artifact = make_artifact()
            artifact["workflow_run"][field] = value
            api.paginate.return_value = [artifact]
            with self.subTest(field=field), self.assertRaises(ValueError):
                with deploy.AssetArtifact(api, make_run()):
                    self.fail("Unexpected artifact")
            api.download.assert_not_called()


class ConfigAndTransportTests(IsolatedTestCase):
    def test_preview設定から本番routeやvarsやhookを除く(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "apps/memo/wrangler.jsonc"
            path.parent.mkdir(parents=True)
            path.write_text(json.dumps({"name": "memo", "assets": {"directory": "./dist"},
                                        "routes": ["production.example"], "vars": {"PUBLIC": "value"},
                                        "build": {"command": "do-not-execute"},
                                        "kv_namespaces": [{"binding": "DATA", "id": "prod"}]}))

            config = deploy.trusted_config(root, "memo", Path("/assets"), preview=True)

            self.assertEqual(config["previews"], {})
            self.assertEqual(config["assets"]["directory"], "/assets/memo/dist")
            for key in ("routes", "vars", "build", "main", "kv_namespaces"):
                self.assertNotIn(key, config)

    def test_本番設定のWorkerとdomainは変更せず成果物の場所だけ変える(self):
        for app in deploy.WORKERS:
            original = deploy.parse_jsonc((ROOT / f"apps/{app}/wrangler.jsonc").read_text())

            config = deploy.trusted_config(ROOT, app, Path("/assets"), preview=False)

            expected = copy.deepcopy(original)
            expected["assets"]["directory"] = f"/assets/{app}/dist"
            self.assertEqual(config, expected)

    def test_worker名変更やWorkerコード追加を勝手に受け入れない(self):
        for changes in ({"name": "other"}, {"main": "worker.js"}):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                path = root / "apps/memo/wrangler.jsonc"
                path.parent.mkdir(parents=True)
                path.write_text(json.dumps({"name": "memo", "assets": {"directory": "dist"}, **changes}))
                with self.subTest(changes=changes), self.assertRaises(ValueError):
                    deploy.trusted_config(root, "memo", Path("/assets"), preview=True)

    def test_JSONCのURLや文字列内記号をコメントと誤認しない(self):
        text = '{"url":"https://example.test/a,}", /* comment */ "text":"//keep",}'

        value = deploy.parse_jsonc(text)

        self.assertEqual(value, {"url": "https://example.test/a,}", "text": "//keep"})

    def test_別ホストへのリダイレクトでGitHub認証を転送しない(self):
        request = urllib.request.Request("https://api.github.com/archive", headers={"Authorization": "Bearer fake"})

        redirected = deploy.SafeRedirect().redirect_request(request, None, 302, "Found", {},
                                                            "https://artifact.example.test/file.zip")

        self.assertFalse(redirected.has_header("Authorization"))

    def test_同一ホストでは認証を維持しHTTPへの降格を拒否する(self):
        request = urllib.request.Request("https://api.github.com/archive", headers={"Authorization": "Bearer fake"})
        redirected = deploy.SafeRedirect().redirect_request(request, None, 302, "Found", {},
                                                            "https://api.github.com/other")
        self.assertEqual(redirected.get_header("Authorization"), "Bearer fake")
        with self.assertRaises(ValueError):
            deploy.SafeRedirect().redirect_request(request, None, 302, "Found", {}, "http://example.test/file")

    def test_GitHub一覧は全ページを読み重複artifactを見落とさない(self):
        api = deploy.GitHub("fake")
        with patch.object(api, "get", side_effect=[{"artifacts": [{"id": 1}] * 100},
                                                  {"artifacts": [{"id": 2}]}]) as get:
            result = api.paginate("actions/runs/50/artifacts", "artifacts")

        self.assertEqual(len(result), 101)
        self.assertEqual(get.call_args.args[0], "actions/runs/50/artifacts?per_page=100&page=2")

    def test_ダウンロード上限を超えたら拒否する(self):
        opener = Mock()
        opener.open.return_value = io.BytesIO(b"1234")
        with patch.object(deploy.urllib.request, "build_opener", return_value=opener), self.assertRaises(ValueError):
            deploy.GitHub("fake").download("test", limit=3)

    def test_previewURLは認証なしHTTPSのworkers_devだけを許可する(self):
        self.assertTrue(deploy.valid_preview_url("https://pr-27-memo.example.workers.dev/"))
        for url in ("http://preview.workers.dev", "https://user:pass@preview.workers.dev",
                    "https://preview.workers.dev:443", "https://preview.workers.dev/other",
                    "https://preview.workers.dev?token=x", "https://preview.workers.dev.evil.test",
                    "https://example.test"):
            with self.subTest(url=url):
                self.assertFalse(deploy.valid_preview_url(url))

    def test_workflowは無権限CIとtrusted_mainデプロイを分離する(self):
        ci = (ROOT / ".github/workflows/ci.yml").read_text()
        preview = (ROOT / ".github/workflows/preview.yml").read_text()
        production = (ROOT / ".github/workflows/deploy.yml").read_text()

        self.assertNotIn("secrets.", ci)
        self.assertIn("actions/upload-artifact@", ci)
        for workflow in (preview, production):
            self.assertIn("ref: main", workflow)
            self.assertIn("persist-credentials: false", workflow)
            self.assertIn("cancel-in-progress: false", workflow)
            self.assertIn("workflow_run:", workflow)
            self.assertNotIn("pull-requests: write", workflow)
            self.assertNotIn("contents: write", workflow)
        self.assertIn("pull_request_target:", preview)
        self.assertIn("types: [closed]", preview)
        self.assertNotIn("pull_request:", production)
        self.assertNotIn("pull_request_target:", production)
        self.assertIn("head_branch == 'main'", production)


def make_pr(state="open", head=HEAD):
    return {"number": PR_NUMBER, "state": state, "user": {"id": deploy.OWNER_ID},
            "head": {"sha": head, "repo": {"id": deploy.REPOSITORY_ID}},
            "base": {"ref": "main", "repo": {"id": deploy.REPOSITORY_ID}}}


def make_run(head=HEAD, event="pull_request"):
    return {"id": 50, "workflow_id": 10, "path": ".github/workflows/ci.yml", "event": event,
            "status": "completed", "conclusion": "success", "head_sha": head, "run_attempt": 2,
            "head_branch": "main" if event == "push" else "feature",
            "repository": {"id": deploy.REPOSITORY_ID}, "head_repository": {"id": deploy.REPOSITORY_ID}}


def make_artifact():
    return {"id": 70, "name": "static-assets-2", "expired": False, "size_in_bytes": 100,
            "workflow_run": {"id": 50, "head_sha": HEAD}}


def preview_event():
    return {"workflow_run": {"id": 50, "pull_requests": [{"number": PR_NUMBER}]}}


def reconciliation_fakes(states):
    api = Mock()
    api.get.side_effect = copy.deepcopy(states)
    runner = Mock()
    runner.artifact.side_effect = lambda run: nullcontext(Path("/assets"))
    runner.preview.side_effect = lambda app, number, assets, head: f"https://pr-{number}-{app}.example.workers.dev"
    return api, runner


def preview_payload():
    preview = {"id": "preview-id", "name": f"pr-{PR_NUMBER}"}
    deployment = {"preview_id": preview["id"], "preview_name": preview["name"],
                  "annotations": {"workers/repository_url": f"https://github.com/{deploy.REPOSITORY}",
                                  "workers/pull_request_number": str(PR_NUMBER),
                                  "workers/pull_request_url": f"https://github.com/{deploy.REPOSITORY}/pull/{PR_NUMBER}",
                                  "workers/tag": "murder-mystery-actions", "workers/commit_sha": HEAD}}
    return preview, deployment


def make_zip(extra=(), include_defaults=True):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        if include_defaults:
            archive.writestr("memo/dist/index.html", b"memo")
            archive.writestr("pdf-manager/dist/index.html", b"pdf")
        for name, content in extra:
            archive.writestr(name, content)
    return buffer.getvalue()


def http_error(code, payload):
    body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    return urllib.error.HTTPError("https://api.cloudflare.com/test", code, "test", {}, io.BytesIO(body))


def cloudflare_environment():
    return patch.dict(os.environ, {"CLOUDFLARE_ACCOUNT_ID": "0" * 32, "CLOUDFLARE_API_TOKEN": "fake-not-a-token"})


def set_nested(value, path, replacement):
    for key in path[:-1]:
        value = value[key]
    value[path[-1]] = replacement


if __name__ == "__main__":
    unittest.main()
