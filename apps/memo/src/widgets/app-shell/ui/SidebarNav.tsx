import { CalendarDays, Home, NotebookPen, SlidersHorizontal } from "lucide-react";
import { NavLink } from "react-router";

import { ThemeToggle } from "#/features/toggle-theme";

const LINKS = [
  { to: "/", label: "ホーム", mobileLabel: "ホーム", Icon: Home, end: true },
  { to: "/memo", label: "タイムラインメモ", mobileLabel: "メモ", Icon: NotebookPen, end: false },
  {
    to: "/timetable",
    label: "タイムテーブル",
    mobileLabel: "時刻表",
    Icon: CalendarDays,
    end: false,
  },
  {
    to: "/settings",
    label: "人物・場所・時刻",
    mobileLabel: "登録",
    Icon: SlidersHorizontal,
    end: false,
  },
] as const;

interface Props {
  mobile?: boolean;
}

export const SidebarNav = ({ mobile = false }: Props) => (
  <div className={mobile ? "px-2 py-1.5" : "flex h-full flex-col px-5 py-8"}>
    {!mobile && (
      <div className="flex items-start gap-3 px-3 pb-10">
        <ThemeToggle />
        <span className="font-serif text-3xl leading-tight tracking-wide text-primary">
          Mystery
          <br />
          Memo
        </span>
      </div>
    )}

    <nav
      aria-label="メインナビゲーション"
      className={mobile ? "grid grid-cols-4 gap-1" : "flex flex-1 flex-col gap-2"}
    >
      {LINKS.map(({ to, label, mobileLabel, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) =>
            [
              mobile
                ? "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px]"
                : "flex items-center gap-3 rounded-lg px-3 py-3 text-sm",
              isActive
                ? "bg-sidebar-accent font-semibold text-primary"
                : "text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            ].join(" ")
          }
        >
          <Icon className={mobile ? "size-4 shrink-0" : "size-4.5 shrink-0"} aria-hidden />
          {mobile ? mobileLabel : label}
        </NavLink>
      ))}
    </nav>

    {!mobile && (
      <div className="flex items-center justify-between border-t border-border px-3 pt-5">
        <span className="font-serif text-sm text-muted-foreground">Mystery Memo</span>
      </div>
    )}
  </div>
);
