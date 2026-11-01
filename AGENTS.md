# 共通の作業指示

Codexのレビュー担当（親・子）は、規約・skillを読む最初の操作からshellをGit読取に限定する。
初期読込も例外にせず、次の順序で読む。パスはこのファイルと同じルートを基準にする。

1. `git ls-files --cached --others --exclude-standard -- <読む文書の明示パス>...` で対象名を確認し、機密・ignoredを除く。
2. 確認できた文書の現在本文を専用の読取ツールで読む。専用ツールがなければ、各文書を `git diff --no-index -- /dev/null <path>` で全文取得する（差分ありの終了コード1は正常）。まず下記コーディング規約と[Codexの実行条件](.agents/review-runtime.md)、続いて指定skillとその参照先を読む。

初期読込に`cat`・`rg`・`pwd`を使わず、`git show HEAD:<path>`で現在本文を置き換えない。
必要な文書や読取手段が不足する場合は迂回せず、未完了と報告する。
これはプロンプトによる運用指示であり、コマンド名の技術的な拒否を保証しない。
書込拒否は実行側のread-only sandboxで別途強制し、既存の権限条件を緩めない。

作業開始時に、このファイルと同じルートにある
[コーディング規約](.ai-config/rules/coding.md)を全文読んで適用する。
Markdownリンクの自動展開を前提にせず、明示的に読む。見つからなければ不足を報告する。

実装前の認識合わせにはClaude Codeの`/clarify`、Codexの`$config-clarify`を使う。
レビューを依頼された場合はClaude Codeの`/review`、Codexの`$config-review`を使う。
いずれも各ツールの入口から`.ai-config/`の共通手順を読む。

レビューと修正は[ラウンドの共通定義](.ai-config/review/rounds.md)を読んで進める。
各ラウンドでは正確性/安全性・テスト・設計/可読性を独立した担当に各1回依頼して統合する。
レビュー担当は報告のみ、修正とラウンド管理は実装担当が行う。
利用できない入口・委譲機能や未完了の観点は未完了と報告する。
実装担当が自分で読み直すことを独立レビューに数えない。

# このリポジトリ固有の指示

共通設定の取得元は `tanakalucky/claude-config`、固定SHAは
`1ebac1b35b51cda5e0de69445f99ceca89d01d83`。配置したファイルだけで利用し、外部リポジトリや生成スクリプトに依存しない。
同梱の `.ai-config/validation/` は取得元の検証履歴であり、このリポジトリのCLI実行結果として扱わない。

## 実装担当とレビュー担当の境界

共通指示と[Codexのレビュー実行条件](.agents/review-runtime.md)にある読取専用・Git読取限定は、
レビュー専任の収集・統合担当と観点担当に適用する。実装担当の通常作業へは適用しない。
実装担当はユーザーの承認範囲で編集と必要な検証を行い、以下のVite+の手順を使う。
レビュー担当はテストを実行せず、実装担当の実行結果と自身の読取判断を区別して報告する。
レビューに使う権限条件を、実装やテストのために緩めてはならない。

## FSD規則の明示的な読込

`apps/*/src/**/*` に対する変更またはレビューを始める前に、
[既存のFSD規則](.claude/rules/fsd-architecture.md)を全文読み、適用すること。
Codexもこの文書を明示的に読む。`.claude/rules/` の自動読込やMarkdownリンクの自動展開だけで
読んだことにしない。文書を読めない場合は不足を報告する。

この文書にあるレイヤー依存、スライス独立、Public API、同一スライス内の相対import、
他レイヤーへの `#/` import、共有UIの `@repo/ui`、エンティティの `@x` 例外を維持する。

## 既存のVite+指示

以下は共通config導入前のリポジトリ指示を保持したもの。実装担当のテスト実行は末尾の
「Running Tests」を優先し、ルートの `vp test` ではなく `vp run -r test` または `vp run ready` を使う。

<!-- BEGIN REPOSITORY GUIDANCE -->
<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Repository Notes

## Running Tests

Run tests with `vp run -r test` (or `vp run ready`, which CI uses) instead of the `vp test` in the checklist above. Each app splits its tests into a Node `unit` project and a Chromium `browser` project in its own `vite.config.ts`, and Vitest does not expand those when the app configs are referenced as projects from the root, so the root `vite.config.ts` excludes `apps/**` and a root `vp test` runs no app tests.
<!-- END REPOSITORY GUIDANCE -->
