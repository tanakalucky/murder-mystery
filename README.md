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
- **打ちながら候補が出る**: 登録済みの人物・場所・時刻はキャレットに追従する候補メニューから選べる
- **あとから直せる**: 記録済みのメモは一覧から開いて書き直せる。同じ候補メニューが編集中も出る
- **開始前に登録できる**: 分かっている人物・場所・時刻は設定画面で先に登録する。打ち間違いの修正と並び替えもここでやる
- **タイムテーブル**: 記録したメモを 時刻 × 人物 の表に並べ替える。人物や時刻が未指定のメモも専用の行・列に落ちる
- **データは localStorage**: メモは `timeline`、人物・場所・時刻は `timeline_masters` キーに保存する

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

Cloudflare Workers の Static Assets として `pdf.tanakalucky.com` で配信する。Worker のコードは持たず、
`wrangler.jsonc` の `assets.directory` が指す `dist/`（`vp build` の出力）をそのままアップロードする。

```bash
vp run deploy      # pdf-manager のビルド + wrangler deploy
```

ドメインは `wrangler.jsonc` の `routes` に Custom Domain として書いてある。DNS レコードと証明書は
デプロイ時に Cloudflare が作る。アプリはドメイン直下で動くので、Vite の `base` もルーターの
`basename` も既定のまま（`/`）でよい。

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
├── pages/settings/               # 人物・場所・時刻の登録（1 画面に 3 セクション）
├── widgets/app-shell/            # サイドバーとモバイルのドロワー、ルートの描画先
├── features/compose-timeline-event/   # 入力欄と候補メニュー（新規入力と、記録済みのメモの書き直し）
├── features/manage-timeline-master/   # 人物・場所・時刻の追加・修正・並び替え・削除
├── features/delete-all-data/
├── features/toggle-theme/
├── entities/timeline-event/      # メモのモデル・localStorage 永続化・カード UI
└── entities/timeline-master/     # 人物・場所・時刻のモデル・localStorage 永続化・並び順
```

ルーティングは `react-router` で `/`・`/memo`・`/timetable`・`/settings` に分ける。SPA なので直リンクは
Cloudflare 側の `not_found_handling: "single-page-application"` が受ける。

`memo.tanakalucky.com` で配信する。ドメインの持ち方は pdf-manager と同じ。

### メモと、人物・場所・時刻の持ち方

localStorage のキーは 2 つ。メモは `timeline`（形は変えていないので、保存済みのメモはそのまま
読める）、人物・場所・時刻は `timeline_masters` に `{ players, locations, times }` の 1 オブジェクト
で入る。

**入力候補もタイムテーブルの行・列も `timeline_masters` だけから引く。** メモから導出はしない。
以前は導出していたが、それだとメモを 1 件書くまで人物も時刻も存在せず、開始前に分かっている
情報を先に登録しておけなかった。

- メモを記録すると、書かれていた `@人物` `#場所` `>時刻` は自動でマスタにも入る（挙動は以前と
  変わらない）。設定画面からはメモなしで登録できる。書き直したときも同じで、新しく書かれた値は
  マスタに入り、使われなくなった値はそのまま残る（未使用になるので設定画面から消せる）。
- メモに識別子は持たせていない。並び替えも 1 件だけの削除もできず、位置が変わらないため、
  書き直す宛先は一覧での位置で足りる。
- 並び順はユーザーが決めたものがそのままタイムテーブルの行・列になる。時刻だけは登録時に
  時刻順の位置へ差し込む（`9:00` が `10:00` の後ろに行かないよう分に直して比べる。時刻として
  読めない区切りは末尾に入れて、あとは上下の移動に任せる）。
- 名前の修正は、それを使っている既存のメモにも波及する。メモは人物や場所を名前そのもので
  持っているため。同じ名前が既にあれば 1 つに合流するので、打ち間違いの修正がそのまま
  マージになる。
- メモで使われている値は削除できない。シナリオ中に退場した人物でも、何をしていたかは追う
  必要があるので消させない。消せるのは未使用のものだけで、まとめて捨てるなら「全て削除」。
- マスタが未作成のブラウザでは、起動時に 1 度だけ既存のメモから作る
  （`app/lib/migrate-masters.ts`）。

エンティティ同士は参照し合えないので、2 つのストアを跨ぐ操作（メモの記録・名前の修正・起動時の
移行）は必ず上位のレイヤーが両方の Public API を順に呼ぶ。

どの画面も別ルートなので、状態は React の外の 1 つのストアに置き、`useSyncExternalStore` で
全画面から読む（`entities/*/model/*-store.ts`）。

### テスト

pdf-manager と同じ 2 種類。ロジック（メモの解析・並び順の決定・表の組み立て）は Unit テストで、
入力欄と候補メニュー・メモの書き直し・設定画面の挙動は Browser テストで確かめる。

```bash
vp -C apps/memo test
```

## CI と Cloudflare 配信

| Workflow      | 契機                                  | 内容                                                           |
| ------------- | ------------------------------------- | -------------------------------------------------------------- |
| `ci.yml`      | PR / main への push                   | 検査・テスト・ビルドを行い、2アプリの静的成果物を7日間保存する |
| `preview.yml` | PR の CI 成功 / PR close / 手動       | 最新の `pr-番号` を作成・更新し、close では削除する            |
| `deploy.yml`  | main の CI 成功 / main からの手動実行 | 最新 main の成功した CI 成果物だけを本番へ配信する             |

プレビューは [Worker Previews](https://developers.cloudflare.com/workers/previews/get-started/) を使う。
`memo` と `pdf-manager` の各 Worker 配下に同じ `pr-番号` を作り、成功した URL と commit SHA を
Actions の summary に残す。PR コメントへの書込権限は使わない。
Wrangler は `4.149.0` に固定し、両アプリの `previews: {}` で専用 bindings を空にしている。
本番の Worker 名・Custom Domain・保存形式は変更しない。

### 信頼境界と設定

- CI には Cloudflare の秘密を渡さない。配信 job は `main` のコード・依存・設定だけを使い、
  PR の実行コード、設定、install hook は実行しない。取得する ZIP は成功した CI の repo・workflow・
  run・attempt・head SHA を照合し、対象を `memo/dist/` と `pdf-manager/dist/` の通常ファイルに限定する。
- Preview は本人が作成した同一リポジトリの main 向け PR に限定する。配信・削除前に現在の PR 状態を
  読み直し、古い head の配信や reopen 後の削除を抑える。本番は別の concurrency で直列化する。
- Preview では trusted な静的配信設定を生成し、本番 routes・vars・Secrets・bindings・build hook を渡さない。
  `--ignore-base-config` で Dashboard の base config も取り込まない。既存 Preview は repo・PR・管理タグと
  assets 以外の bindings がないことを確認し、不明なものは上書き・削除しない。
- 必要な Secrets は `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID`。
  `preview` / `production` の GitHub Environment に用途別の値を設定できる。値はリポジトリに保存しない。
  Preview の token には対象 account の Workers Scripts Edit が必要で、DNS 編集は不要。
  本番は既存 Custom Domain を扱う権限を維持する。権限・Secrets・Cloudflare の公開設定は自動変更しない。
- GitHub token は `contents: read` と `actions: read`、Preview だけ `pull-requests: read` を使う。
  Cloudflare token 自体に本番操作能力がないことまでは保証しない。信頼済み配信コードと build の分離で守る。

### 復旧と運用

`Preview` の手動実行を main から選び、PR 番号を指定すると現在の状態へ再照合する。
open なら現在 head の成功 CI、closed なら当該 PR の2つの Preview だけを対象とする。
CI が失敗中・成果物が期限切れなら CI を再実行する。状態が頻繁に変わる場合も手動実行で復旧できる。

親 Worker が存在しない、Preview URL が無効、既存 Preview の所有情報や bindings が合わない場合は停止する。
本番への `wrangler deploy` や親 Worker の削除に切り替える fallback はない。
Preview URL の公開設定は [Cloudflare の設定](https://developers.cloudflare.com/workers/previews/custom-domains/) を確認する。
古い `versions upload` のプレビューや、本方式で作っていない資源は自動削除しない。

この構成は Static Assets のみを対象とする。サーバー処理や KV/D1/R2 等を追加する場合は、
Preview の資源分離を改めて設計する。外部から同時に Cloudflare 設定を変更した場合の原子的な隔離は保証しない。

配信処理のローカルテストは外部サービスを使わず実行できる。

```bash
python3 -B -m unittest discover -s tools/deploy -v
```

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
