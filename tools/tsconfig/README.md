# @repo/tsconfig

Shared TypeScript configuration for the workspace.

- `base.json` — Node/library defaults (bundler resolution, strict, `noEmit`).
- `react.json` — extends `base.json` and adds DOM libs plus `jsx: react-jsx`.

Use it from a package with:

```jsonc
{ "extends": "@repo/tsconfig/react.json" }
```
