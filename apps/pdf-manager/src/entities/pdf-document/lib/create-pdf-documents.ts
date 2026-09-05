import type { PdfDocument } from "../model/types";

const PDF_MIME_TYPE = "application/pdf";
const PDF_EXTENSION = ".pdf";

const isPdfFile = (file: File): boolean => {
  return file.type === PDF_MIME_TYPE || file.name.toLowerCase().endsWith(PDF_EXTENSION);
};

/**
 * アップロード/ドロップされたファイルから PDF だけを取り出し、追加順のメタデータを付与する。
 */
export const createPdfDocuments = (files: readonly File[]): readonly PdfDocument[] => {
  const baseAddedAt = Date.now();

  return files.filter(isPdfFile).map((file, index) => ({
    id: crypto.randomUUID(),
    name: file.name,
    // 同一バッチのファイルは Date.now() が同値になるため、連番をずらして追加順を保つ
    addedAt: baseAddedAt + index,
    file,
  }));
};
