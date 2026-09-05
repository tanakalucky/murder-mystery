import { cn } from "@repo/ui/lib/utils";

import { PdfCard } from "#/entities/pdf-document";
import { DeleteAllButton } from "#/features/delete-all-pdfs";
import { ThemeToggle } from "#/features/toggle-theme";
import { DropZone, UploadButton } from "#/features/upload-pdf";

import type { PdfListItem } from "../model/use-pdf-manager";

interface Props {
  items: readonly PdfListItem[];
  isVisible: boolean;
  onFilesAdded: (files: readonly File[]) => void;
  onOpen: (id: string) => void;
  onDeleteAll: () => void;
}

export const PdfListLayer = ({ items, isVisible, onFilesAdded, onOpen, onDeleteAll }: Props) => {
  return (
    <div className={cn("h-full flex-col", isVisible ? "flex" : "hidden")}>
      <div className="flex flex-none items-center gap-4 border-b border-border px-4 py-3">
        <span className="mr-auto text-lg font-semibold">PDF Manager</span>

        <DeleteAllButton count={items.length} onConfirm={onDeleteAll} />

        <UploadButton onFilesSelected={onFilesAdded} />

        <ThemeToggle />
      </div>

      <DropZone onFilesDropped={onFilesAdded} className="min-h-0 flex-1 overflow-auto p-6">
        {items.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
            {items.map((item) => (
              <li key={item.document.id} className="contents">
                <PdfCard
                  name={item.document.name}
                  thumbnail={item.thumbnail}
                  onOpen={() => onOpen(item.document.id)}
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
