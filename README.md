# Murder Mystery

A Vite+ monorepo with React 19, Tailwind CSS v4 and shadcn/ui.

`apps/pdf-manager` is **PDF Manager**, マーダーミステリー用の PDF 管理アプリ。シナリオ PDF が増えると
ブラウザのタブが乱立する問題を、1画面（1タブ）に PDF 一覧と PDF 閲覧をまとめることで解決する。

- **タブが増えない**: 一覧と PDF ビューアを同一 DOM 内のレイヤーとして持ち、`display` の切り替えだけで往復する
- **スクロール位置を保持**: 一度開いた PDF の `<iframe>` は破棄せず再利用するため、別の PDF を挟んでも読んでいた位置に戻る
- **サムネイル一覧**: pdf.js で1ページ目を canvas にレンダリングしてサムネイルを生成する
- **インストール不要**: サーバーサイド処理はなく、PDF は IndexedDB でブラウザ内にのみ保存される（他のユーザーとは共有されない）

## Workspace

| Package            | Name             | What it is                                                       |
| ------------------ | ---------------- | ---------------------------------------------------------------- |
| `apps/pdf-manager` | `pdf-manager`    | PDF Manager — React SPA、Cloudflare Workers (Static Assets) 配信 |
| `packages/ui`      | `@repo/ui`       | shadcn/ui components, Tailwind entrypoint, theme provider        |
| `packages/utils`   | `utils`          | Library built with `vp pack`                                     |
| `tools/tsconfig`   | `@repo/tsconfig` | Shared `tsconfig` bases                                          |

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

- Run the development server:

```bash
vp run dev
```

Browser テストは Playwright (Chromium) を使うので、初回だけブラウザを取得する:

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
