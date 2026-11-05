import type { TimelineMasters } from "../model/types";

export const MASTERS_STORAGE_KEY = "timeline_masters";

export const loadMasters = (): TimelineMasters | null => {
  try {
    const stored = localStorage.getItem(MASTERS_STORAGE_KEY);
    if (stored === null) return null;

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return null;

    const { players, locations, times } = parsed as Record<string, unknown>;
    return {
      players: toStringList(players),
      locations: toStringList(locations),
      times: toStringList(times),
    };
  } catch (error: unknown) {
    console.error("人物・場所・時刻の読み込みに失敗しました", error);
    return null;
  }
};

export const saveMasters = (masters: TimelineMasters): void => {
  try {
    localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(masters));
  } catch (error: unknown) {
    console.error("人物・場所・時刻の保存に失敗しました", error);
  }
};

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
