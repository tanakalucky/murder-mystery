# Murder Mystery

A Vite+ monorepo with React 19, Tailwind CSS v4 and shadcn/ui.

## Workspace

| Package          | Name             | What it is                                                |
| ---------------- | ---------------- | --------------------------------------------------------- |
| `apps/website`   | `website`        | React SPA (Vite+ dev/build)                               |
| `packages/ui`    | `@repo/ui`       | shadcn/ui components, Tailwind entrypoint, theme provider |
| `packages/utils` | `utils`          | Library built with `vp pack`                              |
| `tools/tsconfig` | `@repo/tsconfig` | Shared `tsconfig` bases                                   |

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

## shadcn/ui

Components live in `@repo/ui` and are shared by every app. Add one from the workspace root:

```bash
vp run ui add dialog        # writes packages/ui/components/dialog.tsx
```

`vp run ui:website add <name>` runs the CLI from `apps/website` instead. It still writes shared
primitives into `packages/ui/components`, but resolves app-local aliases (`#/components`) for
anything composed on top of them.

### How it is wired

- `packages/ui/styles/base.css` is the single Tailwind entrypoint (`@import "tailwindcss" source(none)`).
  It registers `@source "../**/*.{ts,tsx}"` for itself; each app adds its own `@source` on top —
  see `apps/website/src/styles.css`. Nothing else needs a Tailwind config.
- `@repo/ui` is consumed through package `exports` (`@repo/ui/components/*`, `@repo/ui/lib/*`),
  and internally through the `#/*` subpath import, so there are no bundler path aliases to keep in sync.
- Each package has its own `components.json`. The one in `apps/website` points `ui`/`lib`/`hooks`
  at `@repo/ui`, so the CLI never duplicates a primitive into the app.
- `vp fmt` sorts Tailwind classes using `packages/ui/styles/base.css` as the stylesheet
  (`sortTailwindcss` in the root `vite.config.ts`), and `vp lint` enables the `react` and `jsx-a11y`
  plugins for `apps/**` and `packages/ui/**`.
