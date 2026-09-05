import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// CDN ではなくバンドル済みの worker を使い、オフラインでもサムネイルを生成できるようにする
GlobalWorkerOptions.workerSrc = workerSrc;

const THUMBNAIL_WIDTH_PX = 320;
const FIRST_PAGE_NUMBER = 1;
const BASE_SCALE = 1;

/**
 * PDF の1ページ目を canvas にレンダリングし、サムネイルの data URL を返す。
 */
export const renderPdfThumbnail = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });

  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(FIRST_PAGE_NUMBER);
    const baseViewport = page.getViewport({ scale: BASE_SCALE });
    const viewport = page.getViewport({ scale: THUMBNAIL_WIDTH_PX / baseViewport.width });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvas, viewport }).promise;

    return canvas.toDataURL("image/png");
  } finally {
    // サムネイル生成後は worker を解放する（PDF 本体の表示は iframe が担当する）
    await loadingTask.destroy();
  }
};
