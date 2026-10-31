import type { TimelineMasters } from "#/entities/timeline-master";
import { Button } from "@repo/ui/components/button";
import { Plus } from "lucide-react";
import { useState } from "react";

import { MentionTextarea } from "./MentionTextarea";

interface Props {
  masters: TimelineMasters;
  onSubmit: (text: string) => void;
}

export const EventComposer = ({ masters, onSubmit }: Props) => {
  const [text, setText] = useState("");

  const submit = () => {
    if (text.trim() === "") return;
    onSubmit(text);
    setText("");
  };

  return (
    <div className="shrink-0 rounded-xl border border-primary/50 bg-card p-3 shadow-xs md:p-4">
      <div className="mb-2 text-xs font-semibold text-primary" aria-hidden>
        新しいメモ
      </div>
      <MentionTextarea
        masters={masters}
        value={text}
        label="メモ"
        placeholder="@人物 #場所 >時刻"
        onChange={setText}
        onSubmit={submit}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Enter 記録 · Shift+Enter 改行</span>
        <Button type="button" disabled={text.trim() === ""} onClick={submit}>
          <Plus aria-hidden />
          記録
        </Button>
      </div>
    </div>
  );
};
