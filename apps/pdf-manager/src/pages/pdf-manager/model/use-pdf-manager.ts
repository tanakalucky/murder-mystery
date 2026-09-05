import { useCallback, useEffect, useState } from "react";

import {
  createPdfDocuments,
  deleteAllPdfDocuments,
  loadAllPdfDocuments,
  type PdfDocument,
  renderPdfThumbnail,
  savePdfDocument,
  type ThumbnailState,
} from "#/entities/pdf-document";

export interface PdfListItem {
  readonly document: PdfDocument;
  readonly thumbnail: ThumbnailState;
  /**
   * 一度開いた PDF の Blob URL。null の間はビューアの iframe を生成しない。
   * 生成後は書き換えないことで iframe のスクロール位置を保持する。
   */
  readonly viewerSrc: string | null;
}

/** ビューアが生成済み（= 一度でも開かれた）PDF */
export type OpenedPdfListItem = PdfListItem & { readonly viewerSrc: string };

export const isOpened = (item: PdfListItem): item is OpenedPdfListItem => item.viewerSrc !== null;

const toListItem = (document: PdfDocument): PdfListItem => ({
  document,
  thumbnail: { status: "pending" },
  viewerSrc: null,
});

export const usePdfManager = () => {
  const [items, setItems] = useState<readonly PdfListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const generateThumbnail = useCallback(async (pdf: PdfDocument) => {
    const thumbnail = await renderPdfThumbnail(pdf.file)
      .then((url): ThumbnailState => ({ status: "ready", url }))
      .catch((error: unknown): ThumbnailState => {
        console.error("サムネイルの生成に失敗しました", error);
        return { status: "failed" };
      });

    setItems((prev) =>
      prev.map((item) => (item.document.id === pdf.id ? { ...item, thumbnail } : item)),
    );
  }, []);

  useEffect(() => {
    let isActive = true;

    const restore = async () => {
      try {
        const documents = await loadAllPdfDocuments();
        if (!isActive) return;

        setItems(documents.map(toListItem));
        // サムネイルは永続化せず、起動のたびに再生成する
        for (const pdf of documents) void generateThumbnail(pdf);
      } catch (error: unknown) {
        console.error("保存済み PDF の読み込みに失敗しました", error);
      }
    };

    void restore();

    return () => {
      isActive = false;
    };
  }, [generateThumbnail]);

  useEffect(() => {
    if (activeId === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId]);

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      const documents = createPdfDocuments(files);
      if (documents.length === 0) return;

      // 保存の完了を待たずに一覧へ反映する
      setItems((prev) => [...prev, ...documents.map(toListItem)]);
      for (const pdf of documents) void generateThumbnail(pdf);

      for (const pdf of documents) {
        try {
          await savePdfDocument(pdf);
        } catch (error: unknown) {
          console.error("PDF の保存に失敗しました", error);
        }
      }
    },
    [generateThumbnail],
  );

  const openDocument = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.document.id !== id || item.viewerSrc !== null) return item;

        return { ...item, viewerSrc: URL.createObjectURL(item.document.file) };
      }),
    );
    setActiveId(id);
  }, []);

  const backToList = useCallback(() => setActiveId(null), []);

  const deleteAll = useCallback(async () => {
    // アンマウントされる iframe の Blob URL を解放する
    for (const item of items) {
      if (item.viewerSrc !== null) URL.revokeObjectURL(item.viewerSrc);
    }
    setItems([]);
    setActiveId(null);

    try {
      await deleteAllPdfDocuments();
    } catch (error: unknown) {
      console.error("PDF の削除に失敗しました", error);
    }
  }, [items]);

  return { items, activeId, addFiles, openDocument, backToList, deleteAll };
};
