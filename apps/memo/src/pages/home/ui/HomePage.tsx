import { ArrowRight, CalendarDays, NotebookPen, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router";

export const HomePage = () => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
    <header className="border-b border-border pb-6">
      <p className="font-serif text-sm tracking-wide text-primary">Mystery Memo</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-wide">ホーム</h1>
    </header>

    <Link
      to="/memo"
      className="flex items-center gap-4 rounded-xl border border-primary/25 bg-card p-6 text-card-foreground transition-colors hover:bg-accent"
    >
      <NotebookPen className="size-6 text-primary" aria-hidden />
      <span className="flex-1 text-lg font-semibold">タイムラインメモ</span>
      <ArrowRight className="size-5 text-primary" aria-hidden />
    </Link>

    <div className="grid gap-4 sm:grid-cols-2">
      <Link
        to="/timetable"
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:bg-accent"
      >
        <CalendarDays className="size-5 text-primary" aria-hidden />
        タイムテーブル
      </Link>
      <Link
        to="/settings"
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover:bg-accent"
      >
        <SlidersHorizontal className="size-5 text-primary" aria-hidden />
        人物・場所・時刻
      </Link>
    </div>
  </div>
);
