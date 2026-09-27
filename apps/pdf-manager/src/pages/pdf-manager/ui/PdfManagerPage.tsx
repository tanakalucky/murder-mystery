import { Activity } from "react";

import { findAdjacentPdfs } from "../lib/find-adjacent-pdfs";
import { usePdfDocuments } from "../model/use-pdf-documents";
import { usePdfThumbnails } from "../model/use-pdf-thumbnails";
import { usePdfViewer } from "../model/use-pdf-viewer";
import { PdfListLayer } from "./PdfListLayer";
import { PdfViewerLayer } from "./PdfViewerLayer";

export const PdfManagerPage = () => {
  const { documents, addFiles, deleteAll } = usePdfDocuments();
  const getThumbnail = usePdfThumbnails(documents);
  const viewer = usePdfViewer();

  const handleDeleteAll = () => {
    viewer.closeAll();
    void deleteAll();
  };

  return (
    <>
      <Activity mode={viewer.activeId === null ? "visible" : "hidden"}>
        <PdfListLayer
          documents={documents}
          getThumbnail={getThumbnail}
          onFilesAdded={addFiles}
          onOpen={viewer.open}
          onDeleteAll={handleDeleteAll}
        />
      </Activity>

      {/*
       * 一度開いたビューアは DOM に残し続け、表示切り替えは display だけで行う。
       * アンマウントや src の再設定はスクロール位置を失わせるため禁止。
       */}
      {documents.map((pdf) => {
        const src = viewer.viewerSrcs.get(pdf.id);
        if (src === undefined) return null;

        const { prev, next } = findAdjacentPdfs(documents, pdf.id);

        return (
          <Activity key={pdf.id} mode={viewer.activeId === pdf.id ? "visible" : "hidden"}>
            <PdfViewerLayer
              name={pdf.name}
              src={src}
              onBack={viewer.close}
              onPrev={prev && (() => viewer.open(prev))}
              onNext={next && (() => viewer.open(next))}
            />
          </Activity>
        );
      })}
    </>
  );
};
