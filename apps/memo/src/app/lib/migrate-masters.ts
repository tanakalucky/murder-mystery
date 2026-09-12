import {
  EMPTY_MASTERS,
  loadMasters,
  registerValues,
  saveMasters,
} from "#/entities/timeline-master";
import { loadTimelineEvents } from "#/entities/timeline-event";

/**
 * 人物・場所・時刻をマスタとして持つ前は、メモから毎回導出していた。
 * マスタが未作成のブラウザでは、それまでのメモから 1 度だけ作り直す。
 * 記録した順に登録するので、並びは普段メモを書いたときと同じになる。
 */
export const migrateMasters = (): void => {
  if (loadMasters() !== null) return;

  const masters = loadTimelineEvents().reduce(
    (current, event) =>
      registerValues(current, {
        player: event.playerCharacter,
        location: event.location,
        time: event.time,
      }),
    EMPTY_MASTERS,
  );

  saveMasters(masters);
};
