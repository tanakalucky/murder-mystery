import { Activity } from "react";
import { isOpened, usePdfManager } from "../model/use-pdf-manager";
import { PdfListLayer } from "./PdfListLayer";
import { PdfViewerLayer } from "./PdfViewerLayer";

export const PdfManagerPage = () => {
  const { items, activeId, addFiles, openDocument, backToList, deleteAll } = usePdfManager();

  return (
    <>
      <Activity mode={activeId === null ? "visible" : "hidden"}>
        <PdfListLayer
          items={items}
          onFilesAdded={addFiles}
          onOpen={openDocument}
          onDeleteAll={deleteAll}
        />
      </Activity>

      {/*
       * 一度開いたビューアは DOM に残し続け、表示切り替えは display だけで行う。
       * アンマウントや src の再設定はスクロール位置を失わせるため禁止。
       */}
      {items.filter(isOpened).map((item) => (
        <Activity
          key={item.document.id}
          mode={activeId === item.document.id ? "visible" : "hidden"}
        >
          <PdfViewerLayer name={item.document.name} src={item.viewerSrc} onBack={backToList} />
        </Activity>
      ))}
    </>
  );
};
