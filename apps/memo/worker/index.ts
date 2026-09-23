// tanakalucky.com の 1 つのパス配下にこのアプリを載せる。
//
// Worker のルートはパスを削らずに届けるが、ビルド成果物はプレフィックス無しで dist/ 直下に
// 並ぶ（@cloudflare/vite-plugin は Vite の `base` を見て配置を変えない）。そのため
// Static Assets に渡す前にここでプレフィックスを外す。
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// Vite の `base`（"/murder-mystery-memo/"）から末尾の "/" を落としたもの
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === BASE_PATH) {
      url.pathname = `${BASE_PATH}/`;
      return Response.redirect(url.toString(), 308);
    }

    if (!url.pathname.startsWith(`${BASE_PATH}/`)) {
      return new Response("Not Found", { status: 404 });
    }

    // 開発サーバーでは ASSETS の先が Vite 自身で、`base` も Vite が扱うのでそのまま渡す
    if (import.meta.env.DEV) {
      return env.ASSETS.fetch(request);
    }

    url.pathname = url.pathname.slice(BASE_PATH.length);
    const response = await env.ASSETS.fetch(new Request(url, request));

    // Static Assets のリダイレクト（`/index.html` → `/` など）はプレフィックスを知らないので付け直す
    const location = response.headers.get("Location");
    if (location === null || !location.startsWith("/") || location.startsWith("//")) {
      return response;
    }

    const redirected = new Response(response.body, response);
    redirected.headers.set("Location", `${BASE_PATH}${location}`);
    return redirected;
  },
};
