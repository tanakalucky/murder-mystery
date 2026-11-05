import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { HomePage } from "#/pages/home";

import { AppShell } from "./AppShell";

const renderApp = () => {
  const router = createMemoryRouter([
    {
      element: <AppShell />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "memo", element: <h1>タイムラインメモ</h1> },
        { path: "timetable", element: <h1>タイムテーブル</h1> },
        { path: "settings", element: <h1>人物・場所・時刻</h1> },
      ],
    },
  ]);
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
};

describe("AppShell", () => {
  beforeEach(() => localStorage.clear());

  it("PC用とスマホ用のナビゲーションはホームを先頭に同じ順で並ぶ", async () => {
    const screen = await renderApp();

    for (const navigation of screen.container.querySelectorAll("nav")) {
      expect(
        [...navigation.querySelectorAll("a")].map((link) => link.getAttribute("aria-label")),
      ).toEqual(["ホーム", "タイムラインメモ", "タイムテーブル", "人物・場所・時刻"]);
    }
  });

  it("アプリ名とテーマ操作は同じ表示設定ブロックにまとめる", async () => {
    const screen = await renderApp();
    const displaySettings = screen.getByRole("group", { name: "表示設定" });

    await expect.element(displaySettings.getByText("Mystery Memo", { exact: true })).toBeVisible();
    await expect.element(displaySettings.getByRole("button")).toBeVisible();
    expect(
      screen.container.querySelector("aside")?.textContent?.match(/Mystery Memo/g),
    ).toHaveLength(1);
  });
});
