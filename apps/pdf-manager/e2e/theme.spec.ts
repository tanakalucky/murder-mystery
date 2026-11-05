import { expect, test } from "playwright/test";

test("テーマを切り替え、再読み込み後も選択を保持する", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await page.getByRole("button", { name: "ダークモードに切り替え", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "ライトモードに切り替え", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.reload();

  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(
    page.getByRole("button", { name: "ダークモードに切り替え", exact: true }),
  ).toBeVisible();
});
