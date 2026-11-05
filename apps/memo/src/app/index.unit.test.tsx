import { afterEach, expect, it, vi } from "vite-plus/test";

vi.mock("react-dom/client", () => ({ createRoot: vi.fn(() => ({ render: vi.fn() })) }));
vi.mock("react-router", () => ({ RouterProvider: () => null }));
vi.mock("@repo/ui/lib/theme-provider", () => ({ ThemeProvider: () => null }));
vi.mock("#/app/providers/ErrorBoundary", () => ({ ErrorBoundary: () => null }));
vi.mock("./routes", () => ({ router: {} }));

afterEach(() => {
  vi.unstubAllGlobals();
});

it("起動時に既存メモからマスタを生成しない", async () => {
  const timeline = JSON.stringify([
    { playerCharacter: "探偵", location: "食堂", time: "10:00", body: "アリバイ確認" },
  ]);
  const stored = new Map([["timeline", timeline]]);
  const root = {};
  vi.stubGlobal("document", { getElementById: () => root });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });

  await import("./index");

  const { createRoot } = await import("react-dom/client");
  expect(createRoot).toHaveBeenCalledWith(root);
  expect(stored.get("timeline")).toBe(timeline);
  expect(stored.has("timeline_masters")).toBe(false);
});
