import { useSyncExternalStore } from "react";

import {
  loadTimelineEvents,
  saveTimelineEvents,
  TIMELINE_STORAGE_KEY,
} from "../api/timeline-storage";
import { parseEventText } from "../lib/parse-event-text";
import type { TimelineEvent } from "./types";

// メモ画面とタイムテーブル画面は別のルートなので、状態は React の外に置いて
// localStorage と同じ 1 つの実体を両画面から読む。
const listeners = new Set<() => void>();
let events: readonly TimelineEvent[] | null = null;

const getSnapshot = (): readonly TimelineEvent[] => (events ??= loadTimelineEvents());

const emit = (next: readonly TimelineEvent[]): void => {
  events = next;
  for (const listener of listeners) listener();
};

const handleStorage = (event: StorageEvent): void => {
  if (event.storageArea !== localStorage || event.key !== TIMELINE_STORAGE_KEY) return;

  emit(loadTimelineEvents());
};

const subscribe = (listener: () => void): (() => void) => {
  // 他のタブの変更は storage イベントで受け取る
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;

    // 誰も購読していない間（ホーム画面など）の変更は届かないので、
    // 手元の写しは捨てて次の購読時に localStorage から読み直す
    window.removeEventListener("storage", handleStorage);
    events = null;
  };
};

export const useTimelineEvents = (): readonly TimelineEvent[] =>
  useSyncExternalStore(subscribe, getSnapshot);

export const addTimelineEvent = (text: string): void => {
  const trimmed = text.trim();
  if (trimmed === "") return;

  const next = [...getSnapshot(), parseEventText(trimmed)];
  saveTimelineEvents(next);
  emit(next);
};

export const deleteAllTimelineEvents = (): void => {
  saveTimelineEvents([]);
  emit([]);
};
