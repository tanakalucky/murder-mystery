import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import { loadTimelineEvents, saveTimelineEvents } from "#/entities/timeline-event";

import { MemoPage } from "./MemoPage";

const renderPage = () =>
  render(
    <ThemeProvider>
      <MemoPage />
    </ThemeProvider>,
  );

describe("MemoPage", () => {
  // ストアは購読者がいなくなると手元の写しを捨てるので、
  // 各テストの描画はここで書いた localStorage をそのまま読む
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存済みのメモを記録した順に表示する", async () => {
    saveTimelineEvents([
      { playerCharacter: "探偵", time: "10:00", location: "食堂", body: "アリバイ確認" },
      { body: "全員が集合した" },
    ]);

    const screen = await renderPage();

    const items = screen.container.querySelectorAll("ol > li");
    expect([...items].map((item) => item.textContent)).toEqual([
      "@探偵10:00食堂アリバイ確認",
      "全員が集合した",
    ]);
  });

  it("入力したメモを人物・場所・時刻に分けて保存する", async () => {
    const screen = await renderPage();

    await userEvent.type(screen.getByLabelText("メモ"), "@探偵 #食堂 >10:00 アリバイ確認");
    await userEvent.keyboard("{Enter}");

    await expect.element(screen.getByText("アリバイ確認")).toBeVisible();
    expect(loadTimelineEvents()).toEqual([
      { playerCharacter: "探偵", location: "食堂", time: "10:00", body: "アリバイ確認" },
    ]);
  });

  it("Shift+Enter では登録せずに改行する", async () => {
    const screen = await renderPage();
    const textarea = screen.getByLabelText("メモ");

    await userEvent.type(textarea, "一行目");
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    await userEvent.type(textarea, "二行目");

    expect(loadTimelineEvents()).toEqual([]);
    await expect.element(textarea).toHaveValue("一行目\n二行目");
  });

  it("既に使った人物名を候補に出し、選ぶと入力欄に差し込む", async () => {
    // Arrange: 候補はメモから導出されるので、まず 1 件登録しておく
    saveTimelineEvents([{ playerCharacter: "探偵", body: "食堂にいた" }]);
    const screen = await renderPage();

    // Act
    await userEvent.type(screen.getByLabelText("メモ"), "@探");
    const option = screen.getByRole("option", { name: "@探偵" });
    await expect.element(option).toBeVisible();
    await option.click();

    // Assert: 続けて書けるよう末尾に空白が入る
    await expect.element(screen.getByLabelText("メモ")).toHaveValue("@探偵 ");
  });

  it("候補は Escape で閉じられる", async () => {
    saveTimelineEvents([{ playerCharacter: "探偵", body: "食堂にいた" }]);
    const screen = await renderPage();

    await userEvent.type(screen.getByLabelText("メモ"), "@探");
    await expect.element(screen.getByRole("listbox")).toBeVisible();

    await userEvent.keyboard("{Escape}");

    await expect.poll(() => screen.getByRole("listbox").query()).toBeNull();
  });

  it("全て削除を確認するとメモも入力候補も空になる", async () => {
    // Arrange
    saveTimelineEvents([{ playerCharacter: "探偵", body: "食堂にいた" }]);
    const screen = await renderPage();

    // Act
    await screen.getByRole("button", { name: "全て削除" }).click();
    await screen.getByRole("button", { name: "削除する" }).click();

    // Assert
    await expect.element(screen.getByText(/メモはまだありません/)).toBeVisible();
    expect(loadTimelineEvents()).toEqual([]);

    await userEvent.type(screen.getByLabelText("メモ"), "@探");
    await expect.poll(() => screen.getByRole("listbox").query()).toBeNull();
  });

  it("メモが1件もないときは全て削除ボタンを押せない", async () => {
    const screen = await renderPage();

    await expect.element(screen.getByRole("button", { name: "全て削除" })).toBeDisabled();
  });
});
