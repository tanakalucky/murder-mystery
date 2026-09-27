import type { PdfDocument } from "#/entities/pdf-document";
import { describe, expect, it } from "vite-plus/test";

import { findAdjacentPdfs } from "./find-adjacent-pdfs";

const createPdf = (id: string): PdfDocument => ({
  id,
  name: `${id}.pdf`,
  addedAt: 0,
  file: new File([], `${id}.pdf`, { type: "application/pdf" }),
});

const documents = [createPdf("a"), createPdf("b"), createPdf("c")];

describe("findAdjacentPdfs", () => {
  it("中間の PDF には前後の PDF を返す", () => {
    const { prev, next } = findAdjacentPdfs(documents, "b");

    expect(prev?.id).toBe("a");
    expect(next?.id).toBe("c");
  });

  it("先頭の PDF には前を返さない", () => {
    const { prev, next } = findAdjacentPdfs(documents, "a");

    expect(prev).toBeUndefined();
    expect(next?.id).toBe("b");
  });

  it("末尾の PDF には次を返さない", () => {
    const { prev, next } = findAdjacentPdfs(documents, "c");

    expect(prev?.id).toBe("b");
    expect(next).toBeUndefined();
  });

  it("1件だけのときは前後とも返さない", () => {
    expect(findAdjacentPdfs([createPdf("a")], "a")).toEqual({ prev: undefined, next: undefined });
  });

  it("一覧にない id には前後とも返さない", () => {
    expect(findAdjacentPdfs(documents, "missing")).toEqual({ prev: undefined, next: undefined });
  });
});
