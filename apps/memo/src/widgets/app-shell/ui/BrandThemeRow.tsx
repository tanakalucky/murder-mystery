import { ThemeToggle } from "#/features/toggle-theme";

export const BrandThemeRow = () => (
  <fieldset
    aria-label="表示設定"
    className="m-0 flex w-full min-w-0 items-center justify-between gap-3 border-0 p-0"
  >
    <span className="font-serif text-sm text-muted-foreground">Mystery Memo</span>
    <ThemeToggle />
  </fieldset>
);
