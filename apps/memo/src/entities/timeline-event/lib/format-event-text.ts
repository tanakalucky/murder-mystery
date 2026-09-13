import type { TimelineEvent } from "../model/types";

/**
 * メモを入力欄に戻せる文字列にする。編集を始めるときに使う。
 *
 * 書いたときの語順は残っていないので、接頭辞つきの語を先頭に集めて並べ直す。
 * `@` だけを打つと空文字が入るが、それは表示にも出ていないので落とす。
 */
export const formatEventText = (event: TimelineEvent): string => {
  const { playerCharacter, location, time, body } = event;
  const words: string[] = [];

  if (playerCharacter !== undefined && playerCharacter !== "") words.push(`@${playerCharacter}`);
  if (location !== undefined && location !== "") words.push(`#${location}`);
  if (time !== undefined && time !== "") words.push(`>${time}`);
  if (body !== "") words.push(body);

  return words.join(" ");
};
