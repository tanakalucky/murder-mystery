import { registerMasterValues } from "#/entities/timeline-master";
import { parseEventText, updateTimelineEvent } from "#/entities/timeline-event";

/**
 * 記録済みのメモを 1 件書き直し、書かれていた人物・場所・時刻をマスタにも登録する。
 * 2 つのストアの協調と、マスタを先に書く理由は submitMemo と同じ。
 *
 * 書き直しで使われなくなったマスタは残るが、それは設定画面から消せる。
 * 勝手に消すと、他のメモから参照されていない語を毎回作り直す羽目になる。
 */
export const updateMemo = (index: number, text: string): void => {
  const trimmed = text.trim();
  if (trimmed === "") return;

  const event = parseEventText(trimmed);
  registerMasterValues({
    player: event.playerCharacter,
    location: event.location,
    time: event.time,
  });
  updateTimelineEvent(index, event);
};
