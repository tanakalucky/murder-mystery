import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import { EMPTY_MASTERS, loadMasters, saveMasters } from "#/entities/timeline-master";
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

  it("メモに書いた人物・場所・時刻をマスタにも登録する", async () => {
    const screen = await renderPage();

    await userEvent.type(screen.getByLabelText("メモ"), "@探偵 #食堂 >10:00 アリバイ確認");
    await userEvent.keyboard("{Enter}");

    await expect.element(screen.getByText("アリバイ確認")).toBeVisible();
    expect(loadMasters()).toEqual({ players: ["探偵"], locations: ["食堂"], times: ["10:00"] });
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

  it("登録済みの人物名を候補に出し、選ぶと入力欄に差し込む", async () => {
    // Arrange: 候補はマスタから引くので、メモが 1 件もなくても出る
    saveMasters({ ...EMPTY_MASTERS, players: ["探偵"] });
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
    saveMasters({ ...EMPTY_MASTERS, players: ["探偵"] });
    const screen = await renderPage();

    await userEvent.type(screen.getByLabelText("メモ"), "@探");
    await expect.element(screen.getByRole("listbox")).toBeVisible();

    await userEvent.keyboard("{Escape}");

    await expect.poll(() => screen.getByRole("listbox").query()).toBeNull();
  });

  it("全て削除を確認するとメモもマスタも空になる", async () => {
    // Arrange
    saveTimelineEvents([{ playerCharacter: "探偵", body: "食堂にいた" }]);
    saveMasters({ ...EMPTY_MASTERS, players: ["探偵"] });
    const screen = await renderPage();

    // Act
    await screen.getByRole("button", { name: "全て削除" }).click();
    await screen.getByRole("button", { name: "削除する" }).click();

    // Assert
    await expect.element(screen.getByText(/メモはまだありません/)).toBeVisible();
    expect(loadTimelineEvents()).toEqual([]);
    expect(loadMasters()).toEqual(EMPTY_MASTERS);

    await userEvent.type(screen.getByLabelText("メモ"), "@探");
    await expect.poll(() => screen.getByRole("listbox").query()).toBeNull();
  });

  it("入力欄は中身の行数に合わせて伸び、登録すると元の高さに戻る", async () => {
    const screen = await renderPage();
    // 登録すると「N 件目のメモを編集」ボタンが増えてラベルが引けなくなるので、要素を先に掴む
    const textarea = screen.getByLabelText("メモ").element() as HTMLTextAreaElement;
    const heightOf = () => textarea.offsetHeight;

    const oneLine = heightOf();

    await userEvent.type(textarea, "一行目");
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    await userEvent.type(textarea, "二行目");

    await expect.poll(heightOf).toBeGreaterThan(oneLine);

    await userEvent.keyboard("{Enter}");

    await expect.poll(heightOf).toBe(oneLine);
  });

  it("記録済みのメモを開くと、入力欄の形に戻して書き直せる", async () => {
    // Arrange
    saveTimelineEvents([
      { playerCharacter: "探偵", location: "食堂", time: "10:00", body: "アリバイ確認" },
    ]);
    const screen = await renderPage();

    // Act
    await screen.getByRole("button", { name: "1 件目のメモを編集" }).click();
    const textarea = screen.getByLabelText("メモを編集");
    await expect.element(textarea).toHaveValue("@探偵 #食堂 >10:00 アリバイ確認");

    await userEvent.fill(textarea, "@執事 #書斎 >11:00 アリバイなし");
    await screen.getByRole("button", { name: "保存" }).click();

    // Assert: 一覧はカードに戻り、書き直した内容が保存される
    await expect.element(screen.getByText("アリバイなし")).toBeVisible();
    expect(loadTimelineEvents()).toEqual([
      { playerCharacter: "執事", location: "書斎", time: "11:00", body: "アリバイなし" },
    ]);
  });

  it("書き直しで増えた人物・場所・時刻もマスタに登録する", async () => {
    saveTimelineEvents([{ body: "全員が集合した" }]);
    const screen = await renderPage();

    await screen.getByRole("button", { name: "1 件目のメモを編集" }).click();
    await userEvent.fill(screen.getByLabelText("メモを編集"), "@探偵 #食堂 >10:00 全員が集合した");
    await screen.getByRole("button", { name: "保存" }).click();

    await expect.element(screen.getByText("@探偵")).toBeVisible();
    expect(loadMasters()).toEqual({ players: ["探偵"], locations: ["食堂"], times: ["10:00"] });
  });

  it("編集をやめると元のメモが残る", async () => {
    const stored = [{ playerCharacter: "探偵", body: "アリバイ確認" }];
    saveTimelineEvents(stored);
    const screen = await renderPage();

    await screen.getByRole("button", { name: "1 件目のメモを編集" }).click();
    await userEvent.fill(screen.getByLabelText("メモを編集"), "書き換えた");
    await screen.getByRole("button", { name: "キャンセル" }).click();

    await expect.element(screen.getByText("アリバイ確認")).toBeVisible();
    expect(loadTimelineEvents()).toEqual(stored);
  });

  it("空にしたメモは保存できない", async () => {
    saveTimelineEvents([{ body: "アリバイ確認" }]);
    const screen = await renderPage();

    await screen.getByRole("button", { name: "1 件目のメモを編集" }).click();
    await userEvent.clear(screen.getByLabelText("メモを編集"));

    await expect.element(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("編集中も登録済みの候補から選べる", async () => {
    saveTimelineEvents([{ body: "アリバイ確認" }]);
    saveMasters({ ...EMPTY_MASTERS, players: ["探偵"] });
    const screen = await renderPage();

    await screen.getByRole("button", { name: "1 件目のメモを編集" }).click();
    await userEvent.fill(screen.getByLabelText("メモを編集"), "アリバイ確認 @探");

    const option = screen.getByRole("option", { name: "@探偵" });
    await expect.element(option).toBeVisible();
    await option.click();

    await expect.element(screen.getByLabelText("メモを編集")).toHaveValue("アリバイ確認 @探偵 ");
  });

  it("メモもマスタも空のときは全て削除ボタンを押せない", async () => {
    const screen = await renderPage();

    await expect.element(screen.getByRole("button", { name: "全て削除" })).toBeDisabled();
  });
});
