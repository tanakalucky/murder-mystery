import { useSyncExternalStore } from "react";

import {
  loadTimelineEvents,
  saveTimelineEvents,
  TIMELINE_STORAGE_KEY,
} from "../api/timeline-storage";
import type { TimelineEvent, TimelineField } from "./types";

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

export const addTimelineEvent = (event: TimelineEvent): void => {
  const next = [...getSnapshot(), event];
  saveTimelineEvents(next);
  emit(next);
};

/**
 * 記録済みのメモを 1 件書き直す。
 * メモに識別子はなく、並び替えも 1 件だけの削除もできないので、位置がそのまま宛先になる。
 */
export const updateTimelineEvent = (index: number, event: TimelineEvent): void => {
  const current = getSnapshot();
  if (index < 0 || index >= current.length) return;

  const next = current.map((existing, position) => (position === index ? event : existing));
  saveTimelineEvents(next);
  emit(next);
};

/**
 * マスタの打ち間違いを直したときに、既に書いたメモも追従させる。
 * メモは人物や場所を名前そのもので持っているので、名前を変えるならここも変える。
 */
export const renameTimelineValue = (field: TimelineField, from: string, to: string): void => {
  const current = getSnapshot();
  const next = current.map((event) => (event[field] === from ? { ...event, [field]: to } : event));
  if (next.every((event, index) => event === current[index])) return;

  saveTimelineEvents(next);
  emit(next);
};

export const deleteAllTimelineEvents = (): void => {
  saveTimelineEvents([]);
  emit([]);
};
