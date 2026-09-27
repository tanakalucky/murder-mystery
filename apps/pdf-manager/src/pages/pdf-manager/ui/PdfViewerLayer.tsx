import { Button } from "@repo/ui/components/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  name: string;
  src: string;
  onBack: () => void;
  /** 前の PDF へ移動する。先頭のときは渡さない（ボタンが押せなくなる） */
  onPrev?: () => void;
  /** 次の PDF へ移動する。末尾のときは渡さない（ボタンが押せなくなる） */
  onNext?: () => void;
}

export const PdfViewerLayer = ({ name, src, onBack, onPrev, onNext }: Props) => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden />
          一覧に戻る
        </Button>

        <span className="mr-auto truncate text-sm font-semibold">{name}</span>

        <Button
          variant="secondary"
          size="icon"
          aria-label="前の PDF"
          disabled={onPrev === undefined}
          onClick={onPrev}
        >
          <ChevronLeft aria-hidden />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          aria-label="次の PDF"
          disabled={onNext === undefined}
          onClick={onNext}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>

      {/* src を書き換えず再生成もしないことで、PDF を切り替えてもスクロール位置が保たれる */}
      <iframe src={src} title={name} className="w-full flex-1 border-0" />
    </div>
  );
};
