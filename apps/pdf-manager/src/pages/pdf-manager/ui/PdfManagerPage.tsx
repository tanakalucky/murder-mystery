import { isOpened, usePdfManager } from "../model/use-pdf-manager";
import { PdfListLayer } from "./PdfListLayer";
import { PdfViewerLayer } from "./PdfViewerLayer";

export const PdfManagerPage = () => {
  const { items, activeId, addFiles, openDocument, backToList, deleteAll } = usePdfManager();

  return (
    <>
      <PdfListLayer
        items={items}
        isVisible={activeId === null}
        onFilesAdded={addFiles}
        onOpen={openDocument}
        onDeleteAll={deleteAll}
      />

      {/*
       * 一度開いたビューアは DOM に残し続け、表示切り替えは display だけで行う。
       * アンマウントや src の再設定はスクロール位置を失わせるため禁止。
       */}
      {items.filter(isOpened).map((item) => (
        <PdfViewerLayer
          key={item.document.id}
          name={item.document.name}
          src={item.viewerSrc}
          isVisible={activeId === item.document.id}
          onBack={backToList}
        />
      ))}
    </>
  );
};
