import { Outlet } from "react-router";

import { BrandThemeRow } from "./BrandThemeRow";

import { SidebarNav } from "./SidebarNav";

export const AppShell = () => (
  <div className="flex h-dvh flex-col md:flex-row">
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 py-2.5 text-sidebar-foreground md:hidden">
      <BrandThemeRow />
    </header>

    <aside className="hidden h-dvh w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
      <SidebarNav />
    </aside>

    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <Outlet />
    </main>

    <div className="shrink-0 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
      <SidebarNav mobile />
    </div>
  </div>
);
