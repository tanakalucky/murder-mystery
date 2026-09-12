import type { MasterKind, TimelineMasters } from "../model/types";
import { timeInsertIndex } from "./compare-time";

export const EMPTY_MASTERS: TimelineMasters = { players: [], locations: [], times: [] };

/** メモ 1 件が持つ 3 つの値。`entities/timeline-event` を参照しないよう構造だけで受ける */
export interface MasterValues {
  readonly player?: string;
  readonly location?: string;
  readonly time?: string;
}

const LIST_KEY = {
  player: "players",
  location: "locations",
  time: "times",
} as const satisfies Record<MasterKind, keyof TimelineMasters>;

export const listOf = (masters: TimelineMasters, kind: MasterKind): readonly string[] =>
  masters[LIST_KEY[kind]];

const withList = (
  masters: TimelineMasters,
  kind: MasterKind,
  list: readonly string[],
): TimelineMasters => ({ ...masters, [LIST_KEY[kind]]: list });

const insert = (list: readonly string[], index: number, value: string): string[] => [
  ...list.slice(0, index),
  value,
  ...list.slice(index),
];

const positionFor = (list: readonly string[], kind: MasterKind, value: string): number =>
  kind === "time" ? timeInsertIndex(list, value) : list.length;

/**
 * 登録済み・空文字なら何もしない。
 * 時刻だけは並びの正しい位置に差し込み、人物と場所は登録順をそのまま並び順にする。
 */
export const addValue = (
  masters: TimelineMasters,
  kind: MasterKind,
  value: string,
): TimelineMasters => {
  const list = listOf(masters, kind);
  if (value === "" || list.includes(value)) return masters;

  return withList(masters, kind, insert(list, positionFor(list, kind, value), value));
};

/**
 * 打ち間違いを直すための操作。同じ名前が既にあるときは 2 つが 1 つに合流する。
 * 時刻は直した結果が正しい位置に来るよう差し込み直す。
 */
export const renameValue = (
  masters: TimelineMasters,
  kind: MasterKind,
  from: string,
  to: string,
): TimelineMasters => {
  const list = listOf(masters, kind);
  if (to === "" || from === to || !list.includes(from)) return masters;

  const rest = list.filter((value) => value !== from && value !== to);
  // 合流したときは、元の並びで先に出てくるほうの位置を引き継ぐ
  const existing = list.indexOf(to);
  const anchor = existing === -1 ? list.indexOf(from) : Math.min(list.indexOf(from), existing);
  const kept = list.slice(0, anchor).length;
  const index = kind === "time" ? timeInsertIndex(rest, to) : kept;

  return withList(masters, kind, insert(rest, index, to));
};

export const removeValue = (
  masters: TimelineMasters,
  kind: MasterKind,
  value: string,
): TimelineMasters => {
  const list = listOf(masters, kind);
  if (!list.includes(value)) return masters;

  return withList(
    masters,
    kind,
    list.filter((item) => item !== value),
  );
};

/** 1 つ隣と入れ替える。端では何もしない */
export const moveValue = (
  masters: TimelineMasters,
  kind: MasterKind,
  value: string,
  offset: -1 | 1,
): TimelineMasters => {
  const list = listOf(masters, kind);
  const index = list.indexOf(value);
  const neighbor = list[index + offset];
  if (index === -1 || neighbor === undefined) return masters;

  const moved = [...list];
  moved[index] = neighbor;
  moved[index + offset] = value;

  return withList(masters, kind, moved);
};

/** メモの登録に合わせてマスタを増やす。既にある値はそのまま */
export const registerValues = (masters: TimelineMasters, values: MasterValues): TimelineMasters => {
  let next = addValue(masters, "player", values.player ?? "");
  next = addValue(next, "location", values.location ?? "");

  return addValue(next, "time", values.time ?? "");
};
