import type { TimelineMasters } from "#/entities/timeline-master";
import { Button } from "@repo/ui/components/button";
import { useState } from "react";

import { MentionTextarea } from "./MentionTextarea";

interface Props {
  masters: TimelineMasters;
  /** 書き直す前のメモを入力欄の形に戻したもの */
  initialText: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

/**
 * 記録済みのメモを書き直す入力欄。一覧の中でカードと入れ替わる。
 *
 * 新規入力と違って Enter だけでは終われない（間違えて確定すると元の文が消える）ので、
 * 保存とキャンセルのボタンも出す。空にしたら保存させないのは、
 * 中身のないメモを残すより編集をやめてもらうほうが分かりやすいため。
 */
export const EventEditor = ({ masters, initialText, onSubmit, onCancel }: Props) => {
  const [text, setText] = useState(initialText);
  const isEmpty = text.trim() === "";

  const submit = () => {
    if (isEmpty) return;

    onSubmit(text);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <MentionTextarea
        masters={masters}
        value={text}
        label="メモを編集"
        // 編集ボタンを押した直後なので、入力欄にフォーカスを移す
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        onChange={setText}
        onSubmit={submit}
        onCancel={onCancel}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          キャンセル
        </Button>

        <Button type="button" size="lg" disabled={isEmpty} onClick={submit}>
          保存
        </Button>
      </div>
    </div>
  );
};
