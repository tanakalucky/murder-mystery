import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "vite-plus/test/browser";

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

  it("保存済みの PDF が追加順に一覧表示される", async () => {
    await savePdfDocument(createPdf("later", "解答編_進行表.pdf", 200));
    await savePdfDocument(createPdf("earlier", "深夜の劇場_シナリオ.pdf", 100));

    const screen = await renderPage();

    await expect
      .element(screen.getByRole("button", { name: /深夜の劇場_シナリオ\.pdf/ }))
      .toBeVisible();
    const cards = screen.container.querySelectorAll("li");
    expect([...cards].map((element) => element.textContent)).toEqual([
      "深夜の劇場_シナリオ.pdf",
      "解答編_進行表.pdf",
    ]);
  });

  it("カードをクリックすると PDF ビューアが開き、一覧に戻るで一覧へ戻れる", async () => {
    // Arrange
    await savePdfDocument(createPdf("id-1", "深夜の劇場_シナリオ.pdf", 100));
    const screen = await renderPage();
    const card = screen.getByRole("button", { name: /深夜の劇場_シナリオ\.pdf/ });
    const backButton = screen.getByRole("button", { name: "一覧に戻る" });

    // Act
    await card.click();

    // Assert: ビューアだけが見えている（非表示の一覧は要素として引けなくなる）
    await expect.element(backButton).toBeVisible();
    await expect.poll(() => card.query()).toBeNull();

    // Act
    await backButton.click();

    // Assert
    await expect.element(card).toBeVisible();
    await expect.poll(() => backButton.query()).toBeNull();
  });

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

  it("アップロードした PDF が一覧に追加され、次回起動用に保存される", async () => {
    // Arrange
    const screen = await renderPage();
    const fileInput = screen.container.querySelector("input[type='file']");
    if (!(fileInput instanceof HTMLInputElement)) throw new Error("ファイル入力が見つかりません");

    // Act
    await userEvent.upload(
      fileInput,
      new File(["%PDF-1.4"], "新シナリオ.pdf", { type: "application/pdf" }),
    );

    // Assert
    await expect.element(screen.getByRole("button", { name: /新シナリオ\.pdf/ })).toBeVisible();
    await expect
      .poll(async () => (await loadAllPdfDocuments()).map((document) => document.name))
      .toEqual(["新シナリオ.pdf"]);
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
