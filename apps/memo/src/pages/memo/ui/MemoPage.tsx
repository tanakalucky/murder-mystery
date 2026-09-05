import { useMemo } from "react";

import {
  addTimelineEvent,
  collectSuggestions,
  deleteAllTimelineEvents,
  EventCard,
  useTimelineEvents,
} from "#/entities/timeline-event";
import { EventComposer } from "#/features/compose-timeline-event";
import { DeleteAllButton } from "#/features/delete-all-events";

export const MemoPage = () => {
  const events = useTimelineEvents();
  const suggestions = useMemo(() => collectSuggestions(events), [events]);

  return (
    // 入力欄を画面下部に留めたまま、あふれたメモだけを送れるよう
    // 画面の高さいっぱいの縦並びにして、スクロールは一覧が担う
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">タイムラインメモ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1">@人物</code>{" "}
            <code className="rounded bg-muted px-1">#場所</code>{" "}
            <code className="rounded bg-muted px-1">&gt;時刻</code>{" "}
            を混ぜて書くと、あとからタイムテーブルに並べ替えられます。
          </p>
        </div>

        <DeleteAllButton count={events.length} onConfirm={deleteAllTimelineEvents} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            メモはまだありません。下の入力欄から記録を始めてください。
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {events.map((event, index) => (
              // メモは追加と全消ししかできないので、並び順がそのまま識別子になる
              <li key={index}>
                <EventCard event={event} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <EventComposer suggestions={suggestions} onSubmit={addTimelineEvent} />
    </div>
  );
};
