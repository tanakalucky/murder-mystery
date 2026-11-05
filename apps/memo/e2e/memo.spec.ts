import { expect, test } from "playwright/test";

test("メモを登録・編集し、再読み込み後も内容と記録順を保持する", async ({ page }) => {
  await page.goto("/memo");
  const composer = page.getByRole("textbox", { name: "メモ", exact: true });
  const notes = page.locator("ol > li");

  await composer.fill("@探偵 #食堂 >10:00 アリバイ確認");
  await composer.press("Enter");
  await composer.fill("全員が集合した");
  await page.getByRole("button", { name: "記録", exact: true }).click();

  await expect(notes).toHaveCount(2);
  await expect(notes.nth(0)).toContainText("アリバイ確認");
  await expect(notes.nth(1)).toContainText("全員が集合した");
  await expect(composer).toHaveValue("");

  await page.getByRole("button", { name: "1 件目のメモを編集" }).click();
  const editor = page.getByRole("textbox", { name: "メモを編集", exact: true });
  await expect(editor).toHaveValue("@探偵 #食堂 >10:00 アリバイ確認");
  await editor.fill("@執事 #書斎 >11:00 アリバイなし");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.reload();

  await expect(notes).toHaveCount(2);
  await expect(notes.nth(0)).toContainText("11:00@執事書斎アリバイなし");
  await expect(notes.nth(1)).toContainText("全員が集合した");
  await expect(page.getByText("アリバイ確認", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "1 件目のメモを編集" }).click();
  await editor.fill("保存しない変更");
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await page.reload();

  await expect(notes.nth(0)).toContainText("アリバイなし");
  await expect(page.getByText("保存しない変更", { exact: true })).toHaveCount(0);
});

test("ホームから設定・メモ・タイムテーブルへ移動し、戻る・進むと直リンクが使える", async ({
  page,
}) => {
  await page.goto("/");
  const main = page.getByRole("main");
  const navigation = page.getByRole("navigation", { name: "メインナビゲーション" });
  await expect(main.getByRole("heading", { name: "ホーム", exact: true })).toBeVisible();

  await navigation.getByRole("link", { name: "人物・場所・時刻", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(main.getByRole("heading", { name: "人物・場所・時刻" })).toBeVisible();
  await page.getByRole("textbox", { name: "人物を追加" }).fill("探偵");
  await page.getByRole("textbox", { name: "人物を追加" }).press("Enter");
  await expect(main.getByText("@探偵", { exact: true })).toBeVisible();

  await navigation.getByRole("link", { name: "タイムラインメモ", exact: true }).click();
  await expect(page).toHaveURL(/\/memo$/);
  await expect(
    navigation.getByRole("link", { name: "タイムラインメモ", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const composer = page.getByRole("textbox", { name: "メモ", exact: true });
  await composer.fill("@探偵 #食堂 >10:00 設定から登録した人物のメモ");
  await page.getByRole("button", { name: "記録", exact: true }).click();

  await navigation.getByRole("link", { name: "タイムテーブル", exact: true }).click();
  await expect(page).toHaveURL(/\/timetable$/);
  const timetable = page.getByRole("table");
  await expect(timetable.getByRole("columnheader", { name: "探偵", exact: true })).toBeVisible();
  await expect(timetable.getByRole("rowheader", { name: "10:00", exact: true })).toBeVisible();
  await expect(timetable.getByText("設定から登録した人物のメモ", { exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/memo$/);
  await expect(page.getByRole("textbox", { name: "メモ", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/timetable$/);
  await page.reload();

  await expect(timetable.getByText("設定から登録した人物のメモ", { exact: true })).toBeVisible();
  await navigation.getByRole("link", { name: "ホーム", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(main.getByRole("heading", { name: "ホーム", exact: true })).toBeVisible();
});
