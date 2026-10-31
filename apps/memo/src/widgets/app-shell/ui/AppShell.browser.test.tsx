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

  it("ホームの主操作でメモを開き、最上部のメニューで各画面へ移動できる", async () => {
    // Arrange
    const screen = await renderApp();

    // Act
    await screen.getByRole("link", { name: "メモを開く", exact: true }).click();

    // Assert
    await expect.element(screen.getByRole("heading", { name: "タイムラインメモ" })).toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "タイムラインメモ", exact: true }))
      .toHaveAttribute("aria-current", "page");

    // Act
    await screen.getByRole("link", { name: "タイムテーブル", exact: true }).click();
    // Assert
    await expect.element(screen.getByRole("heading", { name: "タイムテーブル" })).toBeVisible();

    // Act
    await screen.getByRole("link", { name: "人物・場所・時刻", exact: true }).click();
    // Assert
    await expect.element(screen.getByRole("heading", { name: "人物・場所・時刻" })).toBeVisible();

    // Act
    await screen.getByRole("link", { name: "ホーム", exact: true }).click();
    // Assert
    await expect
      .element(screen.getByRole("link", { name: "メモを開く", exact: true }))
      .toBeVisible();
    await expect.element(screen.getByText("@人物　#場所　>時刻", { exact: true })).toBeVisible();
    expect(screen.container.querySelectorAll("nav")).toHaveLength(1);
  });
});
