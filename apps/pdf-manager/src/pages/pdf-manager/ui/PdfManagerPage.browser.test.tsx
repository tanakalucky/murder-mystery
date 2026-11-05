import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { loadAllPdfDocuments, type PdfDocument, savePdfDocument } from "#/entities/pdf-document";

import { PdfManagerPage } from "./PdfManagerPage";

// PDF の実描画はブラウザ/worker 依存のため、サムネイル生成のみモックする
vi.mock("#/entities/pdf-document/lib/render-pdf-thumbnail", () => ({
  renderPdfThumbnail: () => Promise.resolve("data:image/png;base64,thumb"),
}));

const deleteDatabase = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("pdf-manager-db");

    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error);
  });

const createPdf = (id: string, name: string, addedAt: number): PdfDocument => ({
  id,
  name,
  addedAt,
  file: new File(["%PDF-1.4"], name, { type: "application/pdf" }),
});

// 実アプリと同じプロバイダー構成で描画する（ヘッダーのテーマ切り替えが useTheme を使う）
const renderPage = () =>
  render(
    <ThemeProvider>
      <PdfManagerPage />
    </ThemeProvider>,
  );

describe("PdfManagerPage", () => {
  beforeEach(deleteDatabase);

  it("PDF を開き直しても同じ iframe が使い回される", async () => {
    // Arrange: iframe が作り直されるとスクロール位置が失われる
    await savePdfDocument(createPdf("id-1", "深夜の劇場_シナリオ.pdf", 100));
    const screen = await renderPage();
    const card = screen.getByRole("button", { name: /深夜の劇場_シナリオ\.pdf/ });

    // Act
    await card.click();
    const firstIframe = screen.container.querySelector("iframe");
    await screen.getByRole("button", { name: "一覧に戻る" }).click();
    await card.click();

    // Assert
    expect(screen.container.querySelector("iframe")).toBe(firstIframe);
    expect(screen.container.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("前へ・次へで行き来しても開いた PDF ごとの iframe が使い回される", async () => {
    // Arrange
    await savePdfDocument(createPdf("id-1", "第1幕.pdf", 100));
    await savePdfDocument(createPdf("id-2", "第2幕.pdf", 200));
    const screen = await renderPage();
    const prevButton = screen.getByRole("button", { name: "前の PDF" });
    const nextButton = screen.getByRole("button", { name: "次の PDF" });

    // Act
    await screen.getByRole("button", { name: /第1幕\.pdf/ }).click();
    await nextButton.click();
    await expect.poll(() => screen.container.querySelectorAll("iframe").length).toBe(2);
    const iframes = [...screen.container.querySelectorAll("iframe")];
    await prevButton.click();
    await nextButton.click();

    // Assert
    expect([...screen.container.querySelectorAll("iframe")]).toEqual(iframes);
  });

  it("全て削除を確認すると一覧と保存内容が空になる", async () => {
    // Arrange
    await savePdfDocument(createPdf("id-1", "深夜の劇場_シナリオ.pdf", 100));
    await savePdfDocument(createPdf("id-2", "解答編_進行表.pdf", 200));
    const screen = await renderPage();
    await expect
      .element(screen.getByRole("button", { name: /深夜の劇場_シナリオ\.pdf/ }))
      .toBeVisible();

    // Act
    await screen.getByRole("button", { name: "全て削除" }).click();
    await screen.getByRole("button", { name: "削除する" }).click();

    // Assert
    await expect.element(screen.getByText(/PDF がまだありません/)).toBeVisible();
    await expect.poll(async () => await loadAllPdfDocuments()).toEqual([]);
  });

  it("全て削除をキャンセルすると PDF は残る", async () => {
    // Arrange
    await savePdfDocument(createPdf("id-1", "深夜の劇場_シナリオ.pdf", 100));
    const screen = await renderPage();
    const card = screen.getByRole("button", { name: /深夜の劇場_シナリオ\.pdf/ });
    await expect.element(card).toBeVisible();

    // Act
    await screen.getByRole("button", { name: "全て削除" }).click();
    await screen.getByRole("button", { name: "キャンセル" }).click();

    // Assert
    await expect.element(card).toBeVisible();
    expect((await loadAllPdfDocuments()).map((document) => document.name)).toEqual([
      "深夜の劇場_シナリオ.pdf",
    ]);
  });

  it("PDF が1件もないときは全て削除ボタンを押せない", async () => {
    const screen = await renderPage();

    await expect.element(screen.getByRole("button", { name: "全て削除" })).toBeDisabled();
  });

  it("PDF が1件もないときは追加を促すメッセージを表示する", async () => {
    const screen = await renderPage();

    await expect.element(screen.getByText(/PDF がまだありません/)).toBeVisible();
  });
});
