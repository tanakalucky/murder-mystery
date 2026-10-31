import { SearchCheck } from "lucide-react";
import { Outlet } from "react-router";

import { ThemeToggle } from "#/features/toggle-theme";

import { TopNav } from "./TopNav";

export const AppShell = () => (
  <div className="flex h-dvh flex-col">
    <header className="shrink-0 border-b border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-4 py-3 md:px-8 lg:grid-cols-[auto_1fr_auto]">
        <span className="flex items-center gap-2 font-serif text-xl text-primary">
          <SearchCheck className="size-5" aria-hidden />
          Mystery Memo
        </span>
        <div className="col-start-2 row-start-1 justify-self-end lg:col-start-3">
          <ThemeToggle />
        </div>
        <div className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <TopNav />
        </div>
      </div>
    </header>

    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)]">
      <Outlet />
    </main>
  </div>
);
