import type { TimelineMasters } from "#/entities/timeline-master";
import type { TimelineEvent } from "#/entities/timeline-event";

/** 人物・時刻が未指定のメモをまとめる列/行のキー */
export const UNASSIGNED = "";

export interface TimetableCell {
  readonly playerCharacter: string;
  readonly events: readonly TimelineEvent[];
}

export interface TimetableRow {
  readonly time: string;
  readonly cells: readonly TimetableCell[];
}

export interface Timetable {
  /** 列見出しの人物。`UNASSIGNED` は「全体・未指定」 */
  readonly columns: readonly string[];
  readonly rows: readonly TimetableRow[];
}

/**
 * メモを 時刻 × 人物 の表に組み替える。
 * 軸は登録済みの人物・時刻をそのままの並びで使うので、メモがまだ 1 件もない人物や
 * 時刻も空の列・行として出る。開始前に組んだ枠が先に見えるのが狙い。
 * 人物や時刻が未指定のメモも取りこぼさないよう、そういうメモがあるときだけ
 * 「未指定」の列・行を末尾に足す。
 */
export const buildTimetable = (
  events: readonly TimelineEvent[],
  masters: TimelineMasters,
): Timetable => {
  const columns = [...masters.players];
  if (events.some((event) => !event.playerCharacter)) columns.push(UNASSIGNED);

  const timeKeys = [...masters.times];
  if (events.some((event) => !event.time)) timeKeys.push(UNASSIGNED);

  const rows = timeKeys.map((time) => ({
    time,
    cells: columns.map((playerCharacter) => ({
      playerCharacter,
      events: events.filter(
        (event) =>
          (event.time ?? UNASSIGNED) === time &&
          (event.playerCharacter ?? UNASSIGNED) === playerCharacter,
      ),
    })),
  }));

  return { columns, rows };
};
