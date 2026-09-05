import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { PdfDocument } from "../model/types";
import { deleteAllPdfDocuments, loadAllPdfDocuments, savePdfDocument } from "./pdf-storage";

const deleteDatabase = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("pdf-manager-db");

    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error);
  });

const createPdf = (id: string, name: string, addedAt: number, body = "%PDF-1.4"): PdfDocument => ({
  id,
  name,
  addedAt,
  file: new File([body], name, { type: "application/pdf" }),
});

describe("PDF ストレージ", () => {
  beforeEach(deleteDatabase);

  it("何も保存していないときは空配列を返す", async () => {
    const documents = await loadAllPdfDocuments();

    expect(documents).toEqual([]);
  });

  it("保存した PDF を追加順（古い→新しい）で読み出せる", async () => {
    await savePdfDocument(createPdf("later", "解答編_進行表.pdf", 200));
    await savePdfDocument(createPdf("earlier", "深夜の劇場_シナリオ.pdf", 100));

    const documents = await loadAllPdfDocuments();

    expect(documents.map((document) => document.name)).toEqual([
      "深夜の劇場_シナリオ.pdf",
      "解答編_進行表.pdf",
    ]);
  });

  it("保存した PDF の中身を復元できる", async () => {
    await savePdfDocument(createPdf("id-1", "ハンドアウト_C.pdf", 1, "%PDF-1.7 body"));

    const documents = await loadAllPdfDocuments();

    expect(await documents[0].file.text()).toBe("%PDF-1.7 body");
  });

  it("全削除すると保存済みの PDF がすべて消える", async () => {
    await savePdfDocument(createPdf("id-1", "深夜の劇場_シナリオ.pdf", 100));
    await savePdfDocument(createPdf("id-2", "解答編_進行表.pdf", 200));

    await deleteAllPdfDocuments();

    expect(await loadAllPdfDocuments()).toEqual([]);
  });

  it("保存済みの PDF がなくても全削除はエラーにならない", async () => {
    await deleteAllPdfDocuments();

    expect(await loadAllPdfDocuments()).toEqual([]);
  });

  it("同じ id で保存し直すと上書きされる", async () => {
    await savePdfDocument(createPdf("id-1", "旧.pdf", 1));
    await savePdfDocument(createPdf("id-1", "新.pdf", 1));

    const documents = await loadAllPdfDocuments();

    expect(documents.map((document) => document.name)).toEqual(["新.pdf"]);
  });
});
