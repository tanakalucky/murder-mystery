import { ArrowRight, NotebookPen } from "lucide-react";
import { Link } from "react-router";

export const HomePage = () => (
  <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-12 md:py-20">
    <h1 className="font-serif text-3xl tracking-wide text-primary">Mystery Memo</h1>
    <Link
      to="/memo"
      className="flex w-full items-center gap-4 rounded-xl border border-primary/25 bg-card p-5 text-card-foreground transition-colors hover:bg-accent"
    >
      <NotebookPen className="size-5 text-primary" aria-hidden />
      <span className="flex-1 font-semibold">メモを開く</span>
      <ArrowRight className="size-5 text-primary" aria-hidden />
    </Link>
    <code className="text-sm text-muted-foreground">@人物　#場所　&gt;時刻</code>
  </div>
);
