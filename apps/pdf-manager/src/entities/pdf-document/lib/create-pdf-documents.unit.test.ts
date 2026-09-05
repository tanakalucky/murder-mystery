import { describe, expect, it } from "vite-plus/test";

import { createPdfDocuments } from "./create-pdf-documents";

const createFile = (name: string, type: string): File => new File(["dummy"], name, { type });

describe("createPdfDocuments", () => {
  it("PDF 以外のファイルは取り込まない", () => {
    const files = [
      createFile("シナリオ.pdf", "application/pdf"),
      createFile("挿絵.png", "image/png"),
    ];

    const documents = createPdfDocuments(files);

    expect(documents.map((document) => document.name)).toEqual(["シナリオ.pdf"]);
  });

  it("MIME タイプが空でも拡張子が .pdf なら取り込む", () => {
    const documents = createPdfDocuments([createFile("ハンドアウト_C.PDF", "")]);

    expect(documents.map((document) => document.name)).toEqual(["ハンドアウト_C.PDF"]);
  });

  it("同時に選択したファイルにも追加順どおりのソートキーを付ける", () => {
    // Arrange: 同一バッチのファイルは Date.now() が同値になりうる
    const files = ["1.pdf", "2.pdf", "3.pdf"].map((name) => createFile(name, "application/pdf"));

    // Act
    const documents = createPdfDocuments(files);

    // Assert
    const sortedByAddedAt = [...documents].sort((a, b) => a.addedAt - b.addedAt);
    expect(sortedByAddedAt.map((document) => document.name)).toEqual(["1.pdf", "2.pdf", "3.pdf"]);
  });

  it("ファイルごとに異なる id を付ける", () => {
    const files = ["1.pdf", "2.pdf"].map((name) => createFile(name, "application/pdf"));

    const documents = createPdfDocuments(files);

    expect(new Set(documents.map((document) => document.id)).size).toBe(2);
  });

  it("PDF が1件も含まれない場合は空配列を返す", () => {
    const documents = createPdfDocuments([createFile("メモ.txt", "text/plain")]);

    expect(documents).toEqual([]);
  });
});
