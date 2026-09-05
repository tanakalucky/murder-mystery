import { Button } from "@repo/ui/components/button";
import { CalendarDays, Home, NotebookPen, SearchCheck, X } from "lucide-react";
import { NavLink } from "react-router";

import { ThemeToggle } from "#/features/toggle-theme";

const LINKS = [
  { to: "/", label: "ホーム", Icon: Home, end: true },
  { to: "/memo", label: "タイムラインメモ", Icon: NotebookPen, end: false },
  { to: "/timetable", label: "タイムテーブル", Icon: CalendarDays, end: false },
] as const;

interface Props {
  /** ドロワーとして開いているときだけ渡す。閉じるボタンを出し、遷移でも閉じる */
  onClose?: () => void;
}

export const SidebarNav = ({ onClose }: Props) => (
  <div className="flex h-full flex-col">
    <div className="flex items-center gap-3 border-b border-sidebar-border py-5 pr-4 pl-6">
      <SearchCheck className="size-6 shrink-0" aria-hidden />

      <span className="flex-1 text-sm font-bold tracking-wide">Murder Mystery Memo</span>

      {onClose !== undefined && (
        <Button variant="ghost" size="icon" aria-label="メニューを閉じる" onClick={onClose}>
          <X />
        </Button>
      )}
    </div>

    <nav className="flex flex-1 flex-col gap-2 p-4">
      {LINKS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          className={({ isActive }) =>
            isActive
              ? "flex items-center gap-3 rounded-lg bg-sidebar-primary px-4 py-3 text-sm font-bold text-sidebar-primary-foreground"
              : "flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>

    <div className="flex items-center justify-between gap-3 border-t border-sidebar-border px-6 py-4">
      <div className="text-xs text-sidebar-foreground/60">
        <p>Murder Mystery Memo</p>
        <p>議論を整理し、真実を暴け</p>
      </div>

      <ThemeToggle />
    </div>
  </div>
);
