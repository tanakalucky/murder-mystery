import { Button } from "@repo/ui/components/button";
import { ThemeToggle } from "#/components/theme-toggle.tsx";

export function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Murder Mystery</h1>
            <p className="text-sm text-muted-foreground">
              shadcn/ui は <code className="font-mono">@repo/ui</code> にまとまっています。
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          コンポーネントの追加: <code className="font-mono">vp run ui add &lt;name&gt;</code>
        </p>
      </div>
    </main>
  );
}
