// https://ui.shadcn.com/docs/dark-mode/vite
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

/** The OS colour scheme is external state, so read it through a store instead of an effect. */
function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(COLOR_SCHEME_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  // Read synchronously so the first render agrees with the inline script in index.html.
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey);
    return isTheme(stored) ? stored : defaultTheme;
  });
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // Keep other tabs of the same app in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== storageKey) return;
      setThemeState(isTheme(event.newValue) ? event.newValue : defaultTheme);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme, storageKey]);

  const setTheme = useCallback(
    (next: Theme) => {
      localStorage.setItem(storageKey, next);
      setThemeState(next);
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeProviderContext value={value}>{children}</ThemeProviderContext>;
}

export function useTheme() {
  const context = use(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}
