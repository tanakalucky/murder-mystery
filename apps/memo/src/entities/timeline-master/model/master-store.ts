import { useSyncExternalStore } from "react";

import { loadMasters, MASTERS_STORAGE_KEY, saveMasters } from "../api/master-storage";
import {
  addValue,
  EMPTY_MASTERS,
  type MasterValues,
  moveValue,
  registerValues,
  removeValue,
  renameValue,
} from "../lib/master-list";
import type { MasterKind, TimelineMasters } from "./types";

// メモ画面・タイムテーブル画面・設定画面は別のルートなので、timeline-store と同じく
// 状態は React の外に置いて localStorage と同じ 1 つの実体を全画面から読む。
const listeners = new Set<() => void>();
let masters: TimelineMasters | null = null;

const getSnapshot = (): TimelineMasters => (masters ??= loadMasters() ?? EMPTY_MASTERS);

// 純粋な操作は変化がないと同じ参照を返すので、無駄な書き込みと再描画がここで止まる
const commit = (next: TimelineMasters): void => {
  if (next === getSnapshot()) return;

  masters = next;
  saveMasters(next);
  for (const listener of listeners) listener();
};

const handleStorage = (event: StorageEvent): void => {
  if (event.storageArea !== localStorage || event.key !== MASTERS_STORAGE_KEY) return;

  masters = loadMasters() ?? EMPTY_MASTERS;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;

    window.removeEventListener("storage", handleStorage);
    masters = null;
  };
};

export const useTimelineMasters = (): TimelineMasters =>
  useSyncExternalStore(subscribe, getSnapshot);

export const registerMasterValues = (values: MasterValues): void =>
  commit(registerValues(getSnapshot(), values));

export const addMaster = (kind: MasterKind, value: string): void =>
  commit(addValue(getSnapshot(), kind, value.trim()));

export const renameMaster = (kind: MasterKind, from: string, to: string): void =>
  commit(renameValue(getSnapshot(), kind, from, to.trim()));

export const removeMaster = (kind: MasterKind, value: string): void =>
  commit(removeValue(getSnapshot(), kind, value));

export const moveMaster = (kind: MasterKind, value: string, offset: -1 | 1): void =>
  commit(moveValue(getSnapshot(), kind, value, offset));

export const clearMasters = (): void => commit(EMPTY_MASTERS);
