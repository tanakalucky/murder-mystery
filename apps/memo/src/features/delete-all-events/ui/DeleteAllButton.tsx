import { Button } from "@repo/ui/components/button";
import { Trash2 } from "lucide-react";
import { useRef } from "react";

interface Props {
  count: number;
  onConfirm: () => void;
}

export const DeleteAllButton = ({ count, onConfirm }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleConfirm = () => {
    onConfirm();
    dialogRef.current?.close();
  };

  return (
    <>
      <Button
        variant="secondary"
        disabled={count === 0}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Trash2 aria-hidden />
        全て削除
      </Button>

      {/* 取り消せない操作のため、ネイティブの modal dialog で確認を挟む */}
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-110 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg backdrop:bg-black/50"
      >
        <h2 className="text-xl font-semibold">記録したメモを全て削除しますか？</h2>

        <p className="mt-3 text-sm text-muted-foreground">
          {count}{" "}
          件のメモがこのブラウザから削除されます。人物・場所・時刻の入力候補も一緒に消えます。
          この操作は取り消せません。
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
            キャンセル
          </Button>

          <Button variant="destructive" onClick={handleConfirm}>
            削除する
          </Button>
        </div>
      </dialog>
    </>
  );
};
