import { EMPTY_MASTERS, loadMasters, saveMasters } from "#/entities/timeline-master";
import { loadTimelineEvents, saveTimelineEvents } from "#/entities/timeline-event";
import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";

import { SettingsPage } from "./SettingsPage";

const renderPage = () =>
  render(
    <ThemeProvider>
      <SettingsPage />
    </ThemeProvider>,
  );

describe("SettingsPage", () => {
  // ストアは購読者がいなくなると手元の写しを捨てるので、
  // 各テストの描画はここで書いた localStorage をそのまま読む
  beforeEach(() => {
    localStorage.clear();
  });

  it("メモを書かずに人物を登録できる", async () => {
    const screen = await renderPage();

    await userEvent.fill(screen.getByLabelText("人物を追加"), "探偵");
    await screen.getByRole("button", { name: "追加" }).first().click();

    await expect.element(screen.getByText("@探偵")).toBeVisible();
    expect(loadMasters()?.players).toEqual(["探偵"]);
    expect(loadTimelineEvents()).toEqual([]);
  });

  it("時刻は登録した順によらず時刻の順に並ぶ", async () => {
    saveMasters({ ...EMPTY_MASTERS, times: ["21:00"] });
    const screen = await renderPage();

    await userEvent.fill(screen.getByLabelText("時刻を追加"), "9:00");
    await userEvent.keyboard("{Enter}");

    await expect.element(screen.getByText(">9:00")).toBeVisible();
    expect(loadMasters()?.times).toEqual(["9:00", "21:00"]);
  });

  it("人物を上下に動かすと並びが入れ替わる", async () => {
    saveMasters({ ...EMPTY_MASTERS, players: ["探偵", "執事"] });
    const screen = await renderPage();

    await screen.getByRole("button", { name: "執事を上へ移動" }).click();

    await expect.poll(() => loadMasters()?.players).toEqual(["執事", "探偵"]);
  });

  it("使われていない人物は削除できる", async () => {
    saveMasters({ ...EMPTY_MASTERS, players: ["探偵"] });
    const screen = await renderPage();

    await screen.getByRole("button", { name: "探偵を削除" }).click();

    await expect.poll(() => loadMasters()?.players).toEqual([]);
  });

  it("メモで使われている人物は削除できない", async () => {
    saveTimelineEvents([{ playerCharacter: "探偵", body: "食堂にいた" }]);
    saveMasters({ ...EMPTY_MASTERS, players: ["探偵"] });
    const screen = await renderPage();

    await expect.element(screen.getByText("1 件のメモで使用中")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "探偵は使用中のため削除できません" }))
      .toBeDisabled();
  });

  it("打ち間違いを直すと、使っているメモも一緒に書き換わる", async () => {
    saveTimelineEvents([{ playerCharacter: "偵探", body: "食堂にいた" }]);
    saveMasters({ ...EMPTY_MASTERS, players: ["偵探"] });
    const screen = await renderPage();

    await screen.getByRole("button", { name: "偵探を編集" }).click();
    await userEvent.fill(screen.getByLabelText("偵探の新しい名前"), "探偵");
    await screen.getByRole("button", { name: "偵探の変更を保存" }).click();

    // 記録済みのメモまで書き換わるので確認を挟む
    await screen.getByRole("button", { name: "書き換える" }).click();

    await expect.element(screen.getByText("@探偵")).toBeVisible();
    expect(loadMasters()?.players).toEqual(["探偵"]);
    expect(loadTimelineEvents()).toEqual([{ playerCharacter: "探偵", body: "食堂にいた" }]);
  });

  it("使われていない人物の変更は確認なしで通る", async () => {
    saveMasters({ ...EMPTY_MASTERS, players: ["偵探"] });
    const screen = await renderPage();

    await screen.getByRole("button", { name: "偵探を編集" }).click();
    await userEvent.fill(screen.getByLabelText("偵探の新しい名前"), "探偵");
    await screen.getByRole("button", { name: "偵探の変更を保存" }).click();

    await expect.element(screen.getByText("@探偵")).toBeVisible();
    expect(loadMasters()?.players).toEqual(["探偵"]);
  });
});
