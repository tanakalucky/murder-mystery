import type { TimelineEvent } from "../model/types";

/** 旧アプリ（Remix 版）と同じキー・同じ形で読み書きするので、保存済みのメモを引き継げる */
export const TIMELINE_STORAGE_KEY = "timeline";

export const loadTimelineEvents = (): TimelineEvent[] => {
  try {
    const stored = localStorage.getItem(TIMELINE_STORAGE_KEY);
    if (stored === null) return [];

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as TimelineEvent[]) : [];
  } catch (error: unknown) {
    console.error("メモの読み込みに失敗しました", error);
    return [];
  }
};

export const saveTimelineEvents = (events: readonly TimelineEvent[]): void => {
  try {
    if (events.length === 0) {
      localStorage.removeItem(TIMELINE_STORAGE_KEY);
    } else {
      localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(events));
    }
  } catch (error: unknown) {
    console.error("メモの保存に失敗しました", error);
  }
};
