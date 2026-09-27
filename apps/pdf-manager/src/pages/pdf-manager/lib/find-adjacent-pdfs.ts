import type { PdfDocument } from "#/entities/pdf-document";

interface AdjacentPdfs {
  readonly prev: PdfDocument | undefined;
  readonly next: PdfDocument | undefined;
}

/**
 * 一覧の並び順で指定した PDF の前後にある PDF を返す。端ではループせず undefined を返す。
 */
export const findAdjacentPdfs = (documents: readonly PdfDocument[], id: string): AdjacentPdfs => {
  const index = documents.findIndex((pdf) => pdf.id === id);
  if (index === -1) return { prev: undefined, next: undefined };

  return { prev: documents[index - 1], next: documents[index + 1] };
};
