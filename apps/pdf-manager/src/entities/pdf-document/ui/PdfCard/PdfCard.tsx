import type { ThumbnailState } from "../../model/types";

interface Props {
  name: string;
  thumbnail: Readonly<ThumbnailState>;
  onOpen: () => void;
}

const Thumbnail = ({ thumbnail }: Pick<Props, "thumbnail">) => {
  switch (thumbnail.status) {
    case "ready":
      // ファイル名はカード下部のテキストが読み上げるため、画像は装飾扱いにする
      return <img src={thumbnail.url} alt="" className="size-full object-cover" />;
    case "pending":
      return <span className="text-[11px] text-muted-foreground">読み込み中…</span>;
    case "failed":
      return <span className="text-[11px] text-muted-foreground">プレビューなし</span>;
  }
};

export const PdfCard = ({ name, thumbnail, onOpen }: Props) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={name}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-ring hover:shadow-md"
    >
      <div className="flex aspect-3/4 items-center justify-center overflow-hidden border-b border-border bg-muted">
        <Thumbnail thumbnail={thumbnail} />
      </div>

      <div className="px-3 pt-2 pb-3">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
      </div>
    </button>
  );
};
