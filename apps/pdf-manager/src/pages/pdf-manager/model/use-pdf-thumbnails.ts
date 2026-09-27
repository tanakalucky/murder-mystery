import { useEffect, useRef, useState } from "react";

import { type PdfDocument, renderPdfThumbnail, type ThumbnailState } from "#/entities/pdf-document";

const PENDING: ThumbnailState = { status: "pending" };

/**
 * 一覧に並んでいる PDF のサムネイルを生成し、PDF の id ごとの状態を返す。
 * サムネイルは永続化せず、起動のたびに再生成する。
 */
export const usePdfThumbnails = (documents: readonly PdfDocument[]) => {
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, ThumbnailState>>(new Map());
  // 生成を開始済みの id。一覧から外れた PDF の生成結果を捨てる判定にも使う
  const requestedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const requestedIds = requestedIdsRef.current;
    const currentIds = new Set(documents.map((pdf) => pdf.id));

    const removedIds = [...requestedIds].filter((id) => !currentIds.has(id));
    if (removedIds.length > 0) {
      for (const id of removedIds) requestedIds.delete(id);
      setThumbnails((prev) => new Map([...prev].filter(([id]) => currentIds.has(id))));
    }

    for (const pdf of documents) {
      if (requestedIds.has(pdf.id)) continue;
      requestedIds.add(pdf.id);

      void renderPdfThumbnail(pdf.file)
        .then((url): ThumbnailState => ({ status: "ready", url }))
        .catch((error: unknown): ThumbnailState => {
          console.error("サムネイルの生成に失敗しました", error);
          return { status: "failed" };
        })
        .then((thumbnail) => {
          if (!requestedIds.has(pdf.id)) return;
          setThumbnails((prev) => new Map(prev).set(pdf.id, thumbnail));
        });
    }
  }, [documents]);

  return (id: string): ThumbnailState => thumbnails.get(id) ?? PENDING;
};
