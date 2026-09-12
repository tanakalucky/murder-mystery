import {
  addMaster,
  type MasterKind,
  MASTER_PREFIX,
  moveMaster,
  removeMaster,
} from "#/entities/timeline-master";
import { Button } from "@repo/ui/components/button";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { renameMasterValue } from "../model/rename-master-value";

interface Props {
  kind: MasterKind;
  title: string;
  hint: string;
  placeholder: string;
  values: readonly string[];
  /** 値ごとの「その値を使っているメモの件数」 */
  usage: ReadonlyMap<string, number>;
}

interface PendingRename {
  readonly from: string;
  readonly to: string;
  readonly count: number;
}

export const MasterListEditor = ({ kind, title, hint, placeholder, values, usage }: Props) => {
  const addInputId = useId();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pending, setPending] = useState<PendingRename | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const prefix = MASTER_PREFIX[kind];

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    addMaster(kind, draft);
    setDraft("");
  };

  const startEditing = (value: string) => {
    setEditing(value);
    setEditText(value);
  };

  const handleRename = (event: FormEvent, from: string) => {
    event.preventDefault();
    const to = editText.trim();
    if (to === "" || to === from) {
      setEditing(null);
      return;
    }

    // 既に書いたメモまで書き換わるので、使われているものだけ確認を挟む
    const count = usage.get(from) ?? 0;
    if (count > 0) {
      setPending({ from, to, count });
      dialogRef.current?.showModal();
      return;
    }

    renameMasterValue(kind, from, to);
    setEditing(null);
  };

  const confirmRename = () => {
    if (pending !== null) renameMasterValue(kind, pending.from, pending.to);
    dialogRef.current?.close();
    setPending(null);
    setEditing(null);
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <div>
        <h2 className="font-bold">
          <span className="mr-1 text-primary">{prefix}</span>
          {title}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>

      <form className="flex gap-2" onSubmit={handleAdd}>
        <label className="sr-only" htmlFor={addInputId}>
          {title}を追加
        </label>

        <input
          id={addInputId}
          value={draft}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          onChange={(event) => setDraft(event.target.value)}
        />

        <Button type="submit" size="lg" disabled={draft.trim() === ""}>
          <Plus aria-hidden />
          追加
        </Button>
      </form>

      {values.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          まだ登録されていません。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {values.map((value, index) => {
            const count = usage.get(value) ?? 0;

            return (
              <li
                key={value}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
              >
                {editing === value ? (
                  <form
                    className="flex min-w-0 flex-1 gap-2"
                    onSubmit={(event) => handleRename(event, value)}
                  >
                    <label className="sr-only" htmlFor={`${addInputId}-${String(index)}`}>
                      {value}の新しい名前
                    </label>

                    <input
                      id={`${addInputId}-${String(index)}`}
                      // 編集ボタンを押した直後なので、入力欄にフォーカスを移す
                      // oxlint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      value={editText}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      onChange={(event) => setEditText(event.target.value)}
                    />

                    <Button type="submit" size="icon" aria-label={`${value}の変更を保存`}>
                      <Check />
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label={`${value}の編集をやめる`}
                      onClick={() => setEditing(null)}
                    >
                      <X />
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 text-sm font-bold break-all">
                      <span className="mr-0.5 text-muted-foreground">{prefix}</span>
                      {value}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {count === 0 ? "未使用" : `${String(count)} 件のメモで使用中`}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${value}を上へ移動`}
                      disabled={index === 0}
                      onClick={() => moveMaster(kind, value, -1)}
                    >
                      <ChevronUp />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${value}を下へ移動`}
                      disabled={index === values.length - 1}
                      onClick={() => moveMaster(kind, value, 1)}
                    >
                      <ChevronDown />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${value}を編集`}
                      onClick={() => startEditing(value)}
                    >
                      <Pencil />
                    </Button>

                    {/* 使われている値を消すとメモ側だけ孤立するので、未使用のものしか消せない */}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={
                        count === 0 ? `${value}を削除` : `${value}は使用中のため削除できません`
                      }
                      disabled={count > 0}
                      onClick={() => removeMaster(kind, value)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-110 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg backdrop:bg-black/50"
      >
        <h3 className="text-xl font-semibold">記録済みのメモも書き換えますか？</h3>

        <p className="mt-3 text-sm text-muted-foreground">
          {pending === null
            ? ""
            : `${prefix}${pending.from} を ${prefix}${pending.to} に変更すると、この値を使っている ${String(pending.count)} 件のメモも一緒に書き換わります。`}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              dialogRef.current?.close();
              setPending(null);
            }}
          >
            キャンセル
          </Button>

          <Button onClick={confirmRename}>書き換える</Button>
        </div>
      </dialog>
    </section>
  );
};
