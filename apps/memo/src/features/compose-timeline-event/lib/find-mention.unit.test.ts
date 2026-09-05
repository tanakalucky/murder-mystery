import { describe, expect, it } from "vite-plus/test";

import { applyMention, findMention } from "./find-mention";

describe("findMention", () => {
  it("接頭辞から打ちかけの文字までを拾う", () => {
    expect(findMention("メモ @探", 5)).toEqual({ kind: "player", query: "探", start: 3 });
  });

  it("接頭辞だけでも候補を出す", () => {
    expect(findMention("#", 1)).toEqual({ kind: "location", query: "", start: 0 });
  });

  it("接頭辞より後ろに空白が入っていれば拾わない", () => {
    expect(findMention("@探偵 アリバイ", 8)).toBeNull();
  });

  it("カーソルより後ろの文字は見ない", () => {
    expect(findMention("@探偵 と話した", 3)).toEqual({
      kind: "player",
      query: "探偵",
      start: 0,
    });
  });

  it("時刻と場所も接頭辞で見分ける", () => {
    expect(findMention("メモ >10:", 7)?.kind).toBe("time");
    expect(findMention("メモ #食", 5)?.kind).toBe("location");
  });

  it("接頭辞がなければ null を返す", () => {
    expect(findMention("鍵を拾った", 5)).toBeNull();
  });
});

describe("applyMention", () => {
  it("打ちかけの語を候補で置き換え、カーソルを空白の後ろに送る", () => {
    const mention = findMention("メモ @探", 5);
    if (mention === null) throw new Error("接頭辞つきの語が見つかりません");

    expect(applyMention("メモ @探", 5, mention, "探偵")).toEqual({
      text: "メモ @探偵 ",
      cursorPosition: 7,
    });
  });

  it("カーソルより後ろの文字は残す", () => {
    const text = "@探 と話した";
    const mention = findMention(text, 2);
    if (mention === null) throw new Error("接頭辞つきの語が見つかりません");

    expect(applyMention(text, 2, mention, "探偵").text).toBe("@探偵  と話した");
  });
});
