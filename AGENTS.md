# 共通の作業指示

不明点は既存の会話・資料・コードで先に確認し、明示済みの内容は聞き直さない。
ユーザー判断が必要な点だけ質問し、回答に依存する作業は待つ。
質問時は[認識合わせの共通手順](.ai-config/workflows/clarify.md)を全文読んで適用する。

Codexのレビュー担当（親・子）は、規約・skillを読む最初の操作からshellをGit読取に限定する。
初期読込も例外にせず、次の順序で読む。パスはこのファイルと同じルートを基準にする。

1. `git ls-files --cached --others --exclude-standard -- <読む文書の明示パス>...` で対象名を確認し、機密・ignoredを除く。
2. 確認できた文書の現在本文を専用の読取ツールで読む。専用ツールがなければ、各文書を `git diff --no-index -- /dev/null <path>` で全文取得する（差分ありの終了コード1は正常）。まず下記コーディング規約と[Codexの実行条件](.agents/review-runtime.md)、続いて指定skillとその参照先を読む。

初期読込に`cat`・`rg`・`pwd`を使わず、`git show HEAD:<path>`で現在本文を置き換えない。
必要な文書や読取手段が不足する場合は迂回せず、未完了と報告する。
親・子とも読取専用を守り、既存のsandbox・認証・承認設定を変更しない。
運用指示は技術的な拒否の保証ではない。実効条件の未確認だけを理由に開始を中止せず、確認済みと未確認を分けて報告する。

作業開始時に、このファイルと同じルートにある
[コーディング規約](.ai-config/rules/coding.md)を全文読んで適用する。
ドキュメントの作成・更新では[記載方針](.ai-config/rules/documentation.md)も全文読んで適用する。
PR作成前にも同じ記載方針を全文読んで適用する。
Markdownリンクの自動展開を前提にせず、明示的に読む。見つからなければ不足を報告する。

実装前の認識合わせにはClaude Codeの`/clarify`、Codexの`$clarify`を使う。
レビューを依頼された場合はClaude Codeの`/ai-dev-config-review`、Codexの`$ai-dev-config-review`を使う。
いずれも各ツールの入口から`.ai-config/`の共通手順を読む。

1つのIssueは両ツールの`development-orchestrator`から[共通手順](.ai-config/workflows/development-orchestrator.md)を全文読む。
Coordinator（コーディネーター）はAIでも人間でも担える人間の代役で、日次のIssue確認・整理、Issue担当と週次repo担当への依頼、本人への質問・結果の受け渡しを担う。
依頼受理後はrepo最上位のIssueオーケストレーター（指揮者）が進行・品質・停止再開・重複防止を管理する。
対象repo/branch・操作の現在有効な本人許可と品質・安全・権限条件がすべて成立した場合のmerge判断・実行も指揮者が担い、Coordinatorへ戻さない。
[役割と受け渡し](.ai-config/workflows/agent-handoff.md)を全文読み、最上位セッションから専門agentへ委譲する。
週次候補は同名の`weekly-discovery`から[課題発見手順](.ai-config/workflows/weekly-discovery.md)、
運用改善は同名の`development-improvement`から[振返り・効果確認](.ai-config/workflows/development-improvement.md)を全文読む。
外部実行や既存設定の変更は、対象と本人の許可を確認する。この記載だけで外部設定・スケジュールを有効化しない。

フロントエンドの新規作成・変更では[FSDルール](.ai-config/rules/fsd.md)を全文読む。
Claude Codeの`/fsd`、Codexの`$fsd`から導入・変更の共通手順を使う。

Cloudflareの導入・変更では[デプロイ運用ルール](.ai-config/rules/cloudflare-deploy.md)を全文読む。
Claude Codeの`/cloudflare-deploy`、Codexの`$cloudflare-deploy`から共通手順を使う。

レビューと修正は[ラウンドの共通定義](.ai-config/review/rounds.md)を読んで進める。
実装後のPR作成とレビュー記録は[PRへの記録手順](.ai-config/review/records.md)を全文読んで適用する。
独立3観点の依頼・統合は[レビュー手順](.ai-config/review/workflow.md)に従う。
レビュー担当は報告のみ。指揮者が修正の手配・回数管理を行い、実装者子が実作業を担う。自己レビューで独立レビューを代用しない。
実装者子・レビュー担当はmerge/deployを行わない。指揮者の役割定義も外部tool権限の付与ではなく、本番deployや認証・security・権限変更の安全条件を緩めない。
入口・委譲機能が使えない場合や観点の未完了は、未完了と報告する。

# このリポジトリ固有の指示

共通設定の取得元は `tanakalucky/ai-dev-config`、固定SHAは
`8b9dabdc34eb493be5bd061d0c439590552c4099`。配置したファイルだけで利用し、外部リポジトリや生成スクリプトに依存しない。
同梱の `.ai-config/validation/` は旧取得元の検証履歴であり、このリポジトリのCLI実行結果として扱わない。

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
