import type { TimelineEvent } from "../model/types";

export interface Suggestions {
  readonly players: readonly string[];
  readonly locations: readonly string[];
  readonly times: readonly string[];
}

const distinct = (values: readonly (string | undefined)[]): string[] => [
  ...new Set(values.filter((value): value is string => value !== undefined && value !== "")),
];

/**
 * 入力補完の候補はメモから毎回導出する。人物・場所・時刻はメモの登録と同時にしか
 * 増えず、全消しで一緒に消えるため、メモとは別に持ち回っても内容は変わらない。
 */
export const collectSuggestions = (events: readonly TimelineEvent[]): Suggestions => ({
  players: distinct(events.map((event) => event.playerCharacter)),
  locations: distinct(events.map((event) => event.location)),
  times: distinct(events.map((event) => event.time)).sort((a, b) => a.localeCompare(b)),
});
