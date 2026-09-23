import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    // Sorts `class`/`className` utilities using the workspace's Tailwind entrypoint.
    sortTailwindcss: {
      stylesheet: "./packages/ui/styles/base.css",
      attributes: ["class", "className"],
      functions: ["clsx", "cn", "cva", "tw"],
    },
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        // shadcn/ui components are generated, so keep the React rules advisory here.
        files: ["apps/**", "packages/ui/**"],
        plugins: ["typescript", "react", "jsx-a11y"],
        env: { browser: true },
      },
    ],
  },
  run: {
    cache: true,
  },
  test: {
    // App tests need each app's unit (Node) / browser (Chromium) projects, which Vitest does not
    // expand when an app config is referenced as a project, so run them with `vp run -r test` instead.
    exclude: ["**/node_modules/**", "**/.git/**", "apps/**"],
    passWithNoTests: true,
  },
});
