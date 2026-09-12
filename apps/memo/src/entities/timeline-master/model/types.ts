/** マスタが持つ 3 種類の値。メモ本文では接頭辞で書き分ける */
export type MasterKind = "player" | "location" | "time";

export const MASTER_PREFIX: Record<MasterKind, string> = {
  player: "@",
  location: "#",
  time: ">",
};

/** 入力候補もタイムテーブルの軸も、導出せずにこのマスタだけから引く */
export interface TimelineMasters {
  readonly players: readonly string[];
  readonly locations: readonly string[];
  readonly times: readonly string[];
}
