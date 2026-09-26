import { Button } from "@repo/ui/components/button";
import { ArrowLeft } from "lucide-react";

interface Props {
  name: string;
  src: string;
  onBack: () => void;
}

export const PdfViewerLayer = ({ name, src, onBack }: Props) => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden />
          一覧に戻る
        </Button>

        <span className="truncate text-sm font-semibold">{name}</span>
      </div>

      {/* src を書き換えず再生成もしないことで、PDF を切り替えてもスクロール位置が保たれる */}
      <iframe src={src} title={name} className="w-full flex-1 border-0" />
    </div>
  );
};
