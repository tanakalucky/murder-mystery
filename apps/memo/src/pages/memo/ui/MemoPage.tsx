import { clearMasters, useTimelineMasters } from "#/entities/timeline-master";
import {
  deleteAllTimelineEvents,
  EventCard,
  formatEventText,
  useTimelineEvents,
} from "#/entities/timeline-event";
import { EventComposer, EventEditor } from "#/features/compose-timeline-event";
import { DeleteAllButton } from "#/features/delete-all-data";
import { Button } from "@repo/ui/components/button";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { submitMemo } from "../model/submit-memo";
import { updateMemo } from "../model/update-memo";

const deleteEverything = () => {
  deleteAllTimelineEvents();
  clearMasters();
};

export const MemoPage = () => {
  const events = useTimelineEvents();
  const masters = useTimelineMasters();
  const masterCount = masters.players.length + masters.locations.length + masters.times.length;
  // 編集中のメモ。並び替えも 1 件だけの削除もできないので、位置で覚えておける
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-wide md:text-2xl">タイムラインメモ</h1>
        </div>

        <DeleteAllButton
          memoCount={events.length}
          masterCount={masterCount}
          onConfirm={deleteEverything}
        />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <section aria-label="メモ一覧と入力" className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            記録したメモ{" "}
            <span className="text-xs font-normal text-muted-foreground">{events.length} 件</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                メモはまだありません
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {events.map((event, index) => (
                  // メモは追加と書き直ししかできないので、並び順がそのまま識別子になる
                  <li key={index}>
                    {editingIndex === index ? (
                      <EventEditor
                        masters={masters}
                        initialText={formatEventText(event)}
                        onSubmit={(text) => {
                          updateMemo(index, text);
                          setEditingIndex(null);
                        }}
                        onCancel={() => setEditingIndex(null)}
                      />
                    ) : (
                      <EventCard
                        event={event}
                        action={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${String(index + 1)} 件目のメモを編集`}
                            onClick={() => setEditingIndex(index)}
                          >
                            <Pencil />
                          </Button>
                        }
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <EventComposer masters={masters} onSubmit={submitMemo} />
        </section>
        <aside aria-label="時系列のプレビュー" className="hidden min-h-0 overflow-y-auto xl:block">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-5 text-sm font-semibold">時系列</h2>
            {masters.times.length === 0 ? (
              <p className="text-xs text-muted-foreground">時刻未登録</p>
            ) : (
              <ul className="flex flex-col gap-5 border-l border-border pl-3">
                {masters.times.map((time) => (
                  <li key={time} className="text-xs">
                    <span className="font-semibold break-all text-primary tabular-nums">
                      {time}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {events.filter((event) => event.time === time).length} 件
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {events.some((event) => !event.time) && (
              <p className="mt-4 text-xs text-muted-foreground">
                時刻未指定 {events.filter((event) => !event.time).length} 件
              </p>
            )}
            <a
              href="/timetable"
              className="mt-5 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              タイムテーブルへ →
            </a>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">登場人物</h2>
            <p className="text-xs leading-7 break-all text-muted-foreground">
              {masters.players.join(" / ") || "人物未登録"}
            </p>
            <a
              href="/settings"
              className="mt-3 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              人物・場所・時刻へ →
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
};
