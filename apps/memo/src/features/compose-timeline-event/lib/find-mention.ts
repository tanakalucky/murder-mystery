export type MentionKind = "player" | "location" | "time";

export const MENTION_PREFIX: Record<MentionKind, string> = {
  player: "@",
  location: "#",
  time: ">",
};

export interface Mention {
  readonly kind: MentionKind;
  /** 接頭辞の後ろに打ち込み済みの文字。候補の絞り込みに使う */
  readonly query: string;
  /** 接頭辞そのものの位置。候補を確定するときはここから書き換える */
  readonly start: number;
}

// 先に当たったものを採るので、`@a>b` は場所ではなく人物として扱う
const PATTERNS: readonly { kind: MentionKind; pattern: RegExp }[] = [
  { kind: "player", pattern: /@([^\s@]*)$/ },
  { kind: "time", pattern: />([^\s>]*)$/ },
  { kind: "location", pattern: /#([^\s#]*)$/ },
];

/** カーソル位置が接頭辞つきの語の途中なら、その語を返す */
export const findMention = (text: string, cursorPosition: number): Mention | null => {
  const beforeCursor = text.slice(0, cursorPosition);

  for (const { kind, pattern } of PATTERNS) {
    const match = pattern.exec(beforeCursor);
    if (match) return { kind, query: match[1] ?? "", start: match.index };
  }

  return null;
};

export interface MentionApplied {
  readonly text: string;
  readonly cursorPosition: number;
}

/** 打ちかけの語を選んだ候補で置き換え、続けて入力できるよう末尾に空白を足す */
export const applyMention = (
  text: string,
  cursorPosition: number,
  mention: Mention,
  value: string,
): MentionApplied => {
  const inserted = `${MENTION_PREFIX[mention.kind]}${value} `;

  return {
    text: text.slice(0, mention.start) + inserted + text.slice(cursorPosition),
    cursorPosition: mention.start + inserted.length,
  };
};
