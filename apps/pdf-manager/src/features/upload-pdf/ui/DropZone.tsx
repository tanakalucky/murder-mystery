import { cn } from "@repo/ui/lib/utils";
import { type DragEvent, type ReactNode, useState } from "react";

interface Props {
  onFilesDropped: (files: readonly File[]) => void;
  className?: string;
  children: ReactNode;
}

export const DropZone = ({ onFilesDropped, className, children }: Props) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // preventDefault しないとブラウザがドロップされた PDF をそのまま開いてしまう
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // 子要素をまたぐたびに dragleave が発火するため、領域外に出たときだけ解除する
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;

    setIsDraggingOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    onFilesDropped(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(className, isDraggingOver && "bg-accent ring-2 ring-ring ring-inset")}
    >
      {children}
    </div>
  );
};
