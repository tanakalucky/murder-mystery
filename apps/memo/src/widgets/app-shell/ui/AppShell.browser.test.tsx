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

  it("ホームを先頭に並べ、ホームと各画面を往復できる", async () => {
    // Arrange
    const screen = await renderApp();
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
    const main = screen.getByRole("main");

    // Assert: PC用とスマホ用は同じ順序にする
    for (const navigation of screen.container.querySelectorAll("nav")) {
      expect(
        [...navigation.querySelectorAll("a")].map((link) => link.getAttribute("aria-label")),
      ).toEqual(["ホーム", "タイムラインメモ", "タイムテーブル", "人物・場所・時刻"]);
    }

    // Act
    await main.getByRole("link", { name: "タイムラインメモ", exact: true }).click();
    // Assert
    await expect.element(screen.getByRole("heading", { name: "タイムラインメモ" })).toBeVisible();
    await expect
      .element(nav.getByRole("link", { name: "タイムラインメモ", exact: true }))
      .toHaveAttribute("aria-current", "page");

    // Act
    await nav.getByRole("link", { name: "タイムテーブル", exact: true }).click();
    // Assert
    await expect.element(screen.getByRole("heading", { name: "タイムテーブル" })).toBeVisible();

    // Act
    await nav.getByRole("link", { name: "人物・場所・時刻", exact: true }).click();
    // Assert
    await expect.element(screen.getByRole("heading", { name: "人物・場所・時刻" })).toBeVisible();

    // Act
    await nav.getByRole("link", { name: "ホーム", exact: true }).click();
    // Assert
    await expect.element(main.getByRole("heading", { name: "ホーム", exact: true })).toBeVisible();
    await expect
      .element(main.getByRole("link", { name: "タイムラインメモ", exact: true }))
      .toBeVisible();
  });

  it("テーマを切り替え、画面を開き直しても選択を保持する", async () => {
    // Arrange
    localStorage.setItem("theme", "light");
    const screen = await renderApp();
    const displaySettings = screen.getByRole("group", { name: "表示設定" });

    // Assert: アプリ名とテーマ操作は同じブロックにまとめる
    await expect.element(displaySettings.getByText("Mystery Memo", { exact: true })).toBeVisible();
    expect(
      screen.container.querySelector("aside")?.textContent?.match(/Mystery Memo/g),
    ).toHaveLength(1);

    // Act
    await displaySettings
      .getByRole("button", { name: "ダークモードに切り替え", exact: true })
      .click();

    // Assert
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Act
    await screen.unmount();
    const reopened = await renderApp();

    // Assert
    await expect
      .element(reopened.getByRole("button", { name: "ライトモードに切り替え", exact: true }))
      .toBeVisible();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Act
    await reopened.getByRole("button", { name: "ライトモードに切り替え", exact: true }).click();

    // Assert
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
