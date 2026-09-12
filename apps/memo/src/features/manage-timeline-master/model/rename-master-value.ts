import { type MasterKind, renameMaster } from "#/entities/timeline-master";
import { renameTimelineValue, type TimelineField } from "#/entities/timeline-event";

const FIELD = {
  player: "playerCharacter",
  location: "location",
  time: "time",
} as const satisfies Record<MasterKind, TimelineField>;

/**
 * マスタと、それを使っている既存のメモを 1 操作で書き換える。
 * エンティティ同士は参照し合えないので、2 つのストアの協調はこの層が持つ。
 */
export const renameMasterValue = (kind: MasterKind, from: string, to: string): void => {
  renameMaster(kind, from, to);
  renameTimelineValue(FIELD[kind], from, to);
};
