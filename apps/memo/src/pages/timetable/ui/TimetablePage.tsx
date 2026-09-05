import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router";

import { useTimelineEvents } from "#/entities/timeline-event";

import { buildTimetable, UNASSIGNED } from "../lib/build-timetable";

export const TimetablePage = () => {
  const events = useTimelineEvents();
  const { columns, rows } = buildTimetable(events);

  if (events.length === 0) {
    return (
      <div className="m-6 mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-20 text-center text-card-foreground">
        <CalendarDays className="size-12 text-muted-foreground" aria-hidden />

        <h1 className="text-xl font-bold">タイムテーブルにするメモがありません</h1>

        <p className="text-sm leading-relaxed text-muted-foreground">
          タイムラインメモで人物や時刻を書き添えると、ここに 時刻 × 人物
          の表が自動で組み上がります。
        </p>

        <Link
          to="/memo"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/80"
        >
          メモを入力しに行く
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-2xl font-bold">タイムテーブル</h1>

      {/* 見出しを固定したまま縦横に送るため、スクロールは表の外枠が担う */}
      <div className="max-h-[calc(100dvh-13rem)] w-full overflow-auto rounded-2xl border border-border">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 min-w-30 bg-sidebar px-4 py-3 font-bold text-sidebar-foreground">
                時間
              </th>

              {columns.map((playerCharacter) => (
                <th
                  key={playerCharacter}
                  className="sticky top-0 z-20 min-w-60 bg-sidebar px-4 py-3 font-bold text-sidebar-foreground"
                >
                  {playerCharacter === UNASSIGNED ? (
                    <span className="italic opacity-70">全体・未指定</span>
                  ) : (
                    playerCharacter
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.time}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-t border-r-2 border-border bg-card px-4 py-3 text-left font-bold"
                >
                  {row.time === UNASSIGNED ? (
                    <span className="text-muted-foreground italic">未指定</span>
                  ) : (
                    <span className="text-primary">{row.time}</span>
                  )}
                </th>

                {row.cells.map((cell) => (
                  <td
                    key={cell.playerCharacter}
                    className="border-t border-r border-border align-top last:border-r-0"
                  >
                    {cell.events.length === 0 ? (
                      <span className="flex items-center justify-center py-6 text-muted-foreground/40">
                        —
                      </span>
                    ) : (
                      <ul className="flex flex-col gap-2 p-3">
                        {cell.events.map((event, index) => (
                          // 同じセルのメモは並び順でしか区別できない
                          <li
                            key={index}
                            className="flex flex-col gap-2 rounded-lg border border-l-4 border-border border-l-primary bg-card p-3"
                          >
                            <p className="break-all whitespace-pre-wrap">{event.body}</p>

                            {Boolean(event.location) && (
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                <MapPin className="size-3" aria-hidden />
                                {event.location}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
