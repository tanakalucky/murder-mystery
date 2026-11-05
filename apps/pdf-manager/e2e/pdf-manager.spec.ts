import { fileURLToPath } from "node:url";
import { expect, test } from "playwright/test";

test("実際の PDF を追加し、開く・前後へ移動・一覧へ戻る・再読み込み後の復元ができる", async ({
  page,
}) => {
  await page.goto("/");
  const names = ["act-1.pdf", "act-2.pdf", "act-3.pdf"];
  const cards = page.locator("li button");

  await page
    .locator('input[type="file"]')
    .setInputFiles(
      names.map((name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))),
    );

  await expect(cards).toHaveCount(3);
  await expect(cards).toHaveText(names);
  // pdf.js と worker を通して、有効な PDF から実際にサムネイルが生成されることを確かめる。
  for (const name of names) {
    const card = page.getByRole("button", { name, exact: true });
    await expect(card.locator("img")).toBeVisible();
    await expect
      .poll(() => card.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
  }

  await page.getByRole("button", { name: "act-1.pdf", exact: true }).click();
  const previous = page.getByRole("button", { name: "前の PDF", exact: true });
  const next = page.getByRole("button", { name: "次の PDF", exact: true });
  await expect(page.locator('iframe[title="act-1.pdf"]')).toBeVisible();
  await expect(page.locator('iframe[title="act-1.pdf"]')).toHaveAttribute("src", /^blob:/);
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(page.locator('iframe[title="act-2.pdf"]')).toBeVisible();
  await next.click();
  await expect(page.locator('iframe[title="act-3.pdf"]')).toBeVisible();
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(page.locator('iframe[title="act-2.pdf"]')).toBeVisible();

  await page.getByRole("button", { name: "一覧に戻る", exact: true }).click();
  await expect(cards).toHaveText(names);
  await page.reload();

  await expect(cards).toHaveText(names);
  await page.getByRole("button", { name: "act-2.pdf", exact: true }).click();
  await expect(page.locator('iframe[title="act-2.pdf"]')).toBeVisible();
  await expect(page.locator('iframe[title="act-2.pdf"]')).toHaveAttribute("src", /^blob:/);
  await expect(previous).toBeEnabled();
  await expect(next).toBeEnabled();
});
