import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

export default defineConfig({
  // tanakalucky.com/pdf-manager で配信する。wrangler.jsonc の routes と揃えること
  base: "/pdf-manager/",
  plugins: [
    react(),
    // Worker のコードを持つと、このプラグインは Worker 用の環境を作ってテスト中にも起動しようとし、
    // Vitest の設定（`resolve.external`）と衝突して落ちる。テストは Worker を使わないので外す
    process.env.VITEST ? [] : cloudflare(),
    tailwindcss(),
  ],
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          include: ["**/*.unit.test.{ts,tsx}"],
        },
      },
      {
        // projects のインライン設定はルートの plugins を引き継がないため、明示的に指定する
        plugins: [react(), tailwindcss()],
        test: {
          name: "browser",
          globals: true,
          include: ["**/*.browser.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.browser.ts"],
          // 表示切り替えを display ユーティリティで行うため CSS の適用が必要
          css: true,
          browser: {
            screenshotFailures: false,
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            headless: true,
          },
        },
      },
    ],
  },
});
