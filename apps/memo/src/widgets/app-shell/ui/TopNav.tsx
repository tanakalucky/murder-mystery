import { CalendarDays, Home, NotebookPen, SlidersHorizontal } from "lucide-react";
import { NavLink } from "react-router";

const LINKS = [
  { to: "/memo", label: "タイムラインメモ", compactLabel: "メモ", Icon: NotebookPen, end: false },
  {
    to: "/timetable",
    label: "タイムテーブル",
    compactLabel: "時刻表",
    Icon: CalendarDays,
    end: false,
  },
  {
    to: "/settings",
    label: "人物・場所・時刻",
    compactLabel: "登録",
    Icon: SlidersHorizontal,
    end: false,
  },
  { to: "/", label: "ホーム", compactLabel: "ホーム", Icon: Home, end: true },
] as const;

export const TopNav = () => (
  <nav aria-label="メインナビゲーション" className="grid grid-cols-4 gap-1 lg:mx-auto lg:w-fit">
    {LINKS.map(({ to, label, compactLabel, Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        aria-label={label}
        className={({ isActive }) =>
          [
            "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-xs whitespace-nowrap sm:px-3 md:text-sm",
            isActive
              ? "bg-sidebar-accent font-semibold text-primary"
              : "text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          ].join(" ")
        }
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="sm:hidden">{compactLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </NavLink>
    ))}
  </nav>
);
