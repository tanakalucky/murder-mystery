import type { TimelineMasters } from "#/entities/timeline-master";
import { useState } from "react";

import { MentionTextarea } from "./MentionTextarea";

interface Props {
  masters: TimelineMasters;
  onSubmit: (text: string) => void;
}

/** 新しいメモを書く入力欄。画面下部に置いて、書いたそばから登録していく */
export const EventComposer = ({ masters, onSubmit }: Props) => {
  const [text, setText] = useState("");

  const submit = () => {
    onSubmit(text);
    setText("");
  };

  return (
    <div className="shrink-0">
      <MentionTextarea
        masters={masters}
        value={text}
        label="メモ"
        placeholder="例: @探偵 #食堂 >10:00 アリバイ確認"
        onChange={setText}
        onSubmit={submit}
      />
    </div>
  );
};
