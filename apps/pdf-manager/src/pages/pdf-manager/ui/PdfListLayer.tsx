import { PdfCard, type PdfDocument, type ThumbnailState } from "#/entities/pdf-document";
import { DeleteAllButton } from "#/features/delete-all-pdfs";
import { ThemeToggle } from "#/features/toggle-theme";
import { DropZone, UploadButton } from "#/features/upload-pdf";

interface Props {
  documents: readonly PdfDocument[];
  getThumbnail: (id: string) => ThumbnailState;
  onFilesAdded: (files: readonly File[]) => void;
  onOpen: (pdf: PdfDocument) => void;
  onDeleteAll: () => void;
}

export const PdfListLayer = ({
  documents,
  getThumbnail,
  onFilesAdded,
  onOpen,
  onDeleteAll,
}: Props) => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-4 border-b border-border px-4 py-3">
        <span className="mr-auto text-lg font-semibold">PDF Manager</span>

        <DeleteAllButton count={documents.length} onConfirm={onDeleteAll} />

        <UploadButton onFilesSelected={onFilesAdded} />

        <ThemeToggle />
      </div>

      <DropZone onFilesDropped={onFilesAdded} className="min-h-0 flex-1 overflow-auto p-6">
        {documents.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
            {documents.map((pdf) => (
              <li key={pdf.id} className="contents">
                <PdfCard
                  name={pdf.name}
                  thumbnail={getThumbnail(pdf.id)}
                  onOpen={() => onOpen(pdf)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            PDF
            がまだありません。「アップロード」から追加するか、この領域にドラッグ&ドロップしてください。
          </p>
        )}
      </DropZone>
    </div>
  );
};
