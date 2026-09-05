# Murder Mystery

A Vite+ monorepo with React 19, Tailwind CSS v4 and shadcn/ui.

マーダーミステリーを遊ぶためのツールを2つ置いている。どちらもサーバーサイド処理を持たず、
データはブラウザ内にだけ残る。

`apps/pdf-manager` is **PDF Manager**, マーダーミステリー用の PDF 管理アプリ。シナリオ PDF が増えると
ブラウザのタブが乱立する問題を、1画面（1タブ）に PDF 一覧と PDF 閲覧をまとめることで解決する。

- **タブが増えない**: 一覧と PDF ビューアを同一 DOM 内のレイヤーとして持ち、`display` の切り替えだけで往復する
- **スクロール位置を保持**: 一度開いた PDF の `<iframe>` は破棄せず再利用するため、別の PDF を挟んでも読んでいた位置に戻る
- **サムネイル一覧**: pdf.js で1ページ目を canvas にレンダリングしてサムネイルを生成する
- **インストール不要**: サーバーサイド処理はなく、PDF は IndexedDB でブラウザ内にのみ保存される（他のユーザーとは共有されない）

`apps/memo` is **Murder Mystery Memo**, 議論中のメモを取り、時刻 × 人物のタイムテーブルに組み替えるアプリ。

- **書きながら構造化**: `@人物` `#場所` `>時刻` を本文に混ぜて書くと、その場で属性として切り出される
- **打ちながら候補が出る**: 一度使った人物・場所・時刻はキャレットに追従する候補メニューから選べる
- **タイムテーブル**: 記録したメモを 時刻 × 人物 の表に並べ替える。人物や時刻が未指定のメモも専用の行・列に落ちる
- **メモは localStorage**: `timeline` キーに保存する。Remix 版から移ってきても保存済みのメモをそのまま読める

## Workspace

| Package            | Name             | What it is                                                               |
| ------------------ | ---------------- | ------------------------------------------------------------------------ |
| `apps/pdf-manager` | `pdf-manager`    | PDF Manager — React SPA、Cloudflare Workers (Static Assets) 配信         |
| `apps/memo`        | `memo`           | Murder Mystery Memo — React SPA、Cloudflare Workers (Static Assets) 配信 |
| `packages/ui`      | `@repo/ui`       | shadcn/ui components, Tailwind entrypoint, theme provider                |
| `tools/tsconfig`   | `@repo/tsconfig` | Shared `tsconfig` bases                                                  |

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run the development servers (すべてのアプリが順に別ポートで立ち上がる):

```bash
vp run dev
```

1つだけ動かすなら `vp -C apps/memo dev` のようにディレクトリを指定する。

Browser テストは Playwright (Chromium) を使うので、初回だけブラウザを取得する。ブラウザは
`~/.cache/ms-playwright` に置かれるので、1回取得すればどのアプリのテストでも使える:

```bash
vp -C apps/pdf-manager exec playwright install chromium
```

## apps/pdf-manager (PDF Manager)

### アプリ構成

[Feature-Sliced Design](https://feature-sliced.design/) に従う。詳細なルールは
`.claude/rules/fsd-architecture.md` にある。

```
apps/pdf-manager/src/
├── app/                   # エントリーポイント・プロバイダー・グローバル CSS
├── pages/pdf-manager/     # 一覧レイヤーとビューアレイヤーの構成・状態管理
├── features/upload-pdf/   # アップロードボタン / ドラッグ&ドロップ
├── features/delete-all-pdfs/
├── features/toggle-theme/ # ライト / ダークの切り替え
└── entities/pdf-document/ # PDF のモデル・IndexedDB 永続化・サムネイル生成・カード UI
```

UI キットと `cn` は `shared/` ではなく `@repo/ui` が担うため、アプリ内に `shared/ui` は置かない。
レイヤー間のインポートは `package.json` の `imports` で定義した subpath import `#/*` を使う
（バンドラのエイリアスは使わない）。

### テスト

Vitest の [Project](https://vitest.dev/guide/workspace) 機能で2種類のテストを実行する。

- **Unit テスト** (`*.unit.test.{ts,tsx}`) — Node.js 環境
- **Browser テスト** (`*.browser.test.{ts,tsx}`) — Playwright (Chromium)。IndexedDB や `display` に
  よる表示切り替えの検証に使う

Vitest の API は `vite-plus/test*` から取る（`vitest` を直接 import しない）。

```bash
vp -C apps/pdf-manager test
```

### デプロイ

Cloudflare Workers の Static Assets として配信する。`@cloudflare/vite-plugin` がビルド時に
`dist/wrangler.json` を生成し、`wrangler deploy` はそれにリダイレクトされる。

```bash
vp run deploy      # pdf-manager のビルド + wrangler deploy
```

Worker のコードは持たないため `worker-configuration.d.ts` はコミットしていない。バインディングを
追加して型が必要になったら `vp -C apps/pdf-manager run cf-typegen` で生成する。

## apps/memo (Murder Mystery Memo)

### アプリ構成

pdf-manager と同じく [Feature-Sliced Design](https://feature-sliced.design/) に従う。

```
apps/memo/src/
├── app/                          # エントリーポイント・ルーティング・プロバイダー・グローバル CSS
├── pages/home/                   # 使い方を案内するトップページ
├── pages/memo/                   # メモの入力欄と一覧
├── pages/timetable/              # 時刻 × 人物の表への組み替え
├── widgets/app-shell/            # サイドバーとモバイルのドロワー、ルートの描画先
├── features/compose-timeline-event/  # 入力欄と候補メニュー
├── features/delete-all-events/
├── features/toggle-theme/
└── entities/timeline-event/      # メモのモデル・localStorage 永続化・入力候補の導出・カード UI
```

ルーティングは `react-router` で `/`・`/memo`・`/timetable` に分ける。SPA なので直リンクは
Cloudflare 側の `not_found_handling: "single-page-application"` が受ける。

### メモの持ち方

メモは localStorage の `timeline` キーだけに入っている。人物・場所・時刻の入力候補は保存せず、
メモから毎回導出する（`entities/timeline-event/lib/collect-suggestions.ts`）。候補はメモの登録と
同時にしか増えず、全消しで一緒に消えるので、別に持ち回っても内容は変わらないため。

Remix 版が別に持っていた `timeline_players` / `timeline_locations` / `timeline_times` は使わない。
`timeline` の形は変えていないので、Remix 版で書いたメモはそのまま読める。

メモ画面とタイムテーブル画面は別ルートなので、状態は React の外の 1 つのストアに置き、
`useSyncExternalStore` で両画面から読む（`entities/timeline-event/model/timeline-store.ts`）。

### テスト

pdf-manager と同じ 2 種類。ロジック（メモの解析・候補の導出・表の組み立て）は Unit テストで、
入力欄と候補メニューの挙動は Browser テストで確かめる。

```bash
vp -C apps/memo test
```

## CI

ワークフローは 2 本だけで、どちらもアプリが増えても書き換えない。

| ファイル                       | トリガー                   | 内容                                                         |
| ------------------------------ | -------------------------- | ------------------------------------------------------------ |
| `.github/workflows/ci.yml`     | PR / main への push        | `vp check` → `vp run -r test` → `vp run -r build`            |
| `.github/workflows/deploy.yml` | main への push / PR / 手動 | 対象アプリを matrix で回し、push なら本番、PR ならプレビュー |

- CI の 3 コマンドはすべてワークスペース全体が対象なので、アプリ単位のジョブは要らない。
- `deploy.yml` は `wrangler.jsonc` を持つ `apps/*` を列挙して matrix に流す。Worker 名や
  バインディングはアプリ側の `wrangler.jsonc` にあり、ワークフローには出てこない。
  **アプリを増やすときにやることは `apps/` にディレクトリを作ることだけ。**
- プレビューの別名はブランチ名から作る。長さの上限は `dist/wrangler.json` の Worker 名から
  アプリごとに計算する（ホスト名の 63 文字から Worker 名と区切りを引いた残り）。
- プレビューに使う `wrangler versions upload` は既にある Worker にバージョンを載せるだけで、
  Worker 自体は作れない。そのため PR ではデプロイ前に Cloudflare API へ Worker の有無を
  問い合わせ、無ければ `wrangler deploy` で作る。新しいアプリの 1 回目だけこの経路を通り、
  2 回目以降は通常どおりプレビューになる。
- アプリが 3 つを超えたら、`deploy.yml` の `targets` ジョブを
  `pnpm --filter "...[<base>]" list --depth -1 --json` に差し替えて、変更されたパッケージと
  その波及先だけに絞る。pnpm が依存グラフから波及先を出すので、依存関係を YAML に書く必要はない。

`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` をリポジトリの Secrets に登録しておくこと。

## shadcn/ui

Components live in `@repo/ui` and are shared by every app. Add one from the workspace root:

```bash
vp run ui add dialog        # writes packages/ui/components/dialog.tsx
```

`vp run ui:pdf-manager add <name>` runs the CLI from `apps/pdf-manager` instead. It still writes shared
primitives into `packages/ui/components`, but resolves app-local aliases (`#/components`) for
anything composed on top of them.

### How it is wired

- `packages/ui/styles/base.css` is the single Tailwind entrypoint (`@import "tailwindcss" source(none)`).
  It registers `@source "../**/*.{ts,tsx}"` for itself; each app adds its own `@source` on top —
  see `apps/pdf-manager/src/app/styles/index.css`. Nothing else needs a Tailwind config.
- `@repo/ui` is consumed through package `exports` (`@repo/ui/components/*`, `@repo/ui/lib/*`),
  and internally through the `#/*` subpath import, so there are no bundler path aliases to keep in sync.
- Each package has its own `components.json`. The one in `apps/pdf-manager` points `ui`/`lib`/`hooks`
  at `@repo/ui`, so the CLI never duplicates a primitive into the app.
- `vp fmt` sorts Tailwind classes using `packages/ui/styles/base.css` as the stylesheet
  (`sortTailwindcss` in the root `vite.config.ts`), and `vp lint` enables the `react` and `jsx-a11y`
  plugins for `apps/**` and `packages/ui/**`.
