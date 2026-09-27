import { useCallback, useEffect, useState } from "react";

import {
  createPdfDocuments,
  deleteAllPdfDocuments,
  loadAllPdfDocuments,
  type PdfDocument,
  savePdfDocument,
} from "#/entities/pdf-document";

/**
 * IndexedDB に保存された PDF 一覧の読み込み（query）と追加・削除（mutation）を扱う。
 * 画面には保存の完了を待たずに反映する。
 */
export const usePdfDocuments = () => {
  const [documents, setDocuments] = useState<readonly PdfDocument[]>([]);

  useEffect(() => {
    let isActive = true;

    const restore = async () => {
      try {
        const restored = await loadAllPdfDocuments();
        if (isActive) setDocuments(restored);
      } catch (error: unknown) {
        console.error("保存済み PDF の読み込みに失敗しました", error);
      }
    };

    void restore();

    return () => {
      isActive = false;
    };
  }, []);

  const addFiles = useCallback(async (files: readonly File[]) => {
    const added = createPdfDocuments(files);
    if (added.length === 0) return;

    setDocuments((prev) => [...prev, ...added]);

    for (const pdf of added) {
      try {
        await savePdfDocument(pdf);
      } catch (error: unknown) {
        console.error("PDF の保存に失敗しました", error);
      }
    }
  }, []);

  const deleteAll = useCallback(async () => {
    setDocuments([]);

    try {
      await deleteAllPdfDocuments();
    } catch (error: unknown) {
      console.error("PDF の削除に失敗しました", error);
    }
  }, []);

  return { documents, addFiles, deleteAll };
};
