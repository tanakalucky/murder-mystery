import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

// https://viteplus.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare(), tailwindcss()],
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
          // 候補メニューの位置決めが実際のレイアウトに依存するため CSS の適用が必要
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
