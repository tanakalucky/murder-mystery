import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router";

import { useTimelineMasters } from "#/entities/timeline-master";
import { useTimelineEvents } from "#/entities/timeline-event";

import { buildTimetable, UNASSIGNED } from "../lib/build-timetable";

export const TimetablePage = () => {
  const events = useTimelineEvents();
  const masters = useTimelineMasters();
  const { columns, rows } = buildTimetable(events, masters);

  // 登録だけして使っていない人物・時刻も軸になるので、軸が 1 本も立たないときだけ空にする
  if (columns.length === 0 && rows.length === 0) {
    return (
      <div className="mx-auto my-5 flex w-[calc(100%-2rem)] max-w-2xl flex-col items-center gap-6 rounded-xl border border-border bg-card px-6 py-10 text-center text-card-foreground">
        <CalendarDays className="size-12 text-muted-foreground" aria-hidden />

        <h1 className="text-xl font-bold">タイムテーブル</h1>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/memo"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            メモへ
          </Link>

          <Link
            to="/settings"
            className="rounded-lg border border-border px-6 py-3 text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            人物・時刻を登録
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <h1 className="shrink-0 border-b border-border pb-5 text-xl font-semibold tracking-wide md:text-2xl">
        タイムテーブル
      </h1>

      {/* 見出しを固定したまま縦横に送るため、スクロールは表の外枠が担う */}
      <div className="min-h-0 w-full flex-1 overflow-auto rounded-xl border border-border">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 min-w-24 bg-accent px-4 py-3 font-bold text-accent-foreground">
                時間
              </th>

              {columns.map((playerCharacter) => (
                <th
                  key={playerCharacter}
                  className="sticky top-0 z-20 min-w-52 bg-accent px-4 py-3 font-bold text-accent-foreground"
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
