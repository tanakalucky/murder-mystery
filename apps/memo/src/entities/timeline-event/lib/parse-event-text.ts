import type { TimelineEvent } from "../model/types";

/**
 * 入力文字列から接頭辞つきの語を取り出して構造化する。
 * 取り出した語は本文から取り除き、残りを空白でつなぎ直して本文にする。
 */
export const parseEventText = (text: string): TimelineEvent => {
  const bodyWords: string[] = [];
  let playerCharacter: string | undefined;
  let location: string | undefined;
  let time: string | undefined;

  for (const word of text.split(/\s+/)) {
    if (word.startsWith("@")) {
      playerCharacter = word.slice(1);
    } else if (word.startsWith("#")) {
      location = word.slice(1);
    } else if (word.startsWith(">")) {
      time = word.slice(1);
    } else {
      bodyWords.push(word);
    }
  }

  return { body: bodyWords.join(" "), playerCharacter, location, time };
};
