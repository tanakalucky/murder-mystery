import { registerMasterValues } from "#/entities/timeline-master";
import { addTimelineEvent, parseEventText } from "#/entities/timeline-event";

/**
 * メモを 1 件記録し、書かれていた人物・場所・時刻をマスタにも登録する。
 * エンティティ同士は参照し合えないので、2 つのストアの協調はこの層が持つ。
 *
 * マスタを先に書くのは、途中で落ちたときに「表に出ないメモ」を残さないため。
 * 逆順で落ちると軸のないメモが残るが、この順なら未使用のマスタが残るだけで、
 * それは設定画面から消せる。
 */
export const submitMemo = (text: string): void => {
  const trimmed = text.trim();
  if (trimmed === "") return;

  const event = parseEventText(trimmed);
  registerMasterValues({
    player: event.playerCharacter,
    location: event.location,
    time: event.time,
  });
  addTimelineEvent(event);
};
