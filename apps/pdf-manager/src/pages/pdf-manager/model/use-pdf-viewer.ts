import { useCallback, useEffect, useState } from "react";

import type { PdfDocument } from "#/entities/pdf-document";

/**
 * 表示中の PDF と、一度開いた PDF のビューア用 Blob URL を管理する。
 * Blob URL は生成後に書き換えないことで iframe のスクロール位置を保持する。
 */
export const usePdfViewer = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewerSrcs, setViewerSrcs] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    if (activeId === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId]);

  const open = useCallback(
    (pdf: PdfDocument) => {
      if (!viewerSrcs.has(pdf.id)) {
        setViewerSrcs(new Map(viewerSrcs).set(pdf.id, URL.createObjectURL(pdf.file)));
      }
      setActiveId(pdf.id);
    },
    [viewerSrcs],
  );

  const close = useCallback(() => setActiveId(null), []);

  /** 全ビューアを破棄する。アンマウントされる iframe の Blob URL もここで解放する */
  const closeAll = useCallback(() => {
    for (const src of viewerSrcs.values()) URL.revokeObjectURL(src);
    setViewerSrcs(new Map());
    setActiveId(null);
  }, [viewerSrcs]);

  return { activeId, viewerSrcs, open, close, closeAll };
};
