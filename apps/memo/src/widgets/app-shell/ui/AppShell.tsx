import { Button } from "@repo/ui/components/button";
import { Menu, SearchCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { Outlet } from "react-router";

import { SidebarNav } from "./SidebarNav";

export const AppShell = () => {
  const drawerRef = useRef<HTMLDialogElement>(null);

  // 開いたまま画面が広がると、隠れたモーダルが本文の操作を奪ったままになる
  // （端末を横向きにするだけで起きる）。サイドバーが出る幅になったら閉じる。
  useEffect(() => {
    const sidebarVisible = window.matchMedia("(min-width: 48rem)");

    const closeDrawer = () => {
      if (sidebarVisible.matches) drawerRef.current?.close();
    };

    sidebarVisible.addEventListener("change", closeDrawer);
    return () => sidebarVisible.removeEventListener("change", closeDrawer);
  }, []);

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <span className="flex items-center gap-2 font-bold">
          <SearchCheck className="size-5" aria-hidden />
          MM Memo
        </span>

        <Button
          variant="ghost"
          size="icon"
          aria-label="メニューを開く"
          onClick={() => drawerRef.current?.showModal()}
        >
          <Menu />
        </Button>
      </header>

      <aside className="sticky top-0 hidden h-dvh w-65 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
        <SidebarNav />
      </aside>

      {/* Escape と背面の暗転はネイティブの dialog に任せる */}
      <dialog
        ref={drawerRef}
        className="m-0 h-dvh max-h-dvh w-70 max-w-[80vw] bg-sidebar text-sidebar-foreground backdrop:bg-black/50 md:hidden"
      >
        <SidebarNav onClose={() => drawerRef.current?.close()} />
      </dialog>

      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
};
