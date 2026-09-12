import type { TimelineEvent, TimelineField } from "../model/types";

/** 項目ごとの「その値を使っているメモの件数」 */
export type TimelineUsage = Readonly<Record<TimelineField, ReadonlyMap<string, number>>>;

const countField = (
  events: readonly TimelineEvent[],
  field: TimelineField,
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();

  for (const event of events) {
    const value = event[field];
    if (value === undefined || value === "") continue;

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
};

/** 使用中のマスタを消させないために、設定画面が件数を出すのに使う */
export const countTimelineUsage = (events: readonly TimelineEvent[]): TimelineUsage => ({
  playerCharacter: countField(events, "playerCharacter"),
  location: countField(events, "location"),
  time: countField(events, "time"),
});
