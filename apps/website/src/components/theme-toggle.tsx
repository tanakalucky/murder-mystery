import { Button } from "@repo/ui/components/button";
import { useTheme } from "@repo/ui/lib/theme-provider";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={resolvedTheme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
