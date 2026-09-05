import { describe, expect, it } from "vite-plus/test";

import { parseEventText } from "./parse-event-text";

describe("parseEventText", () => {
  it("人物・場所・時刻を取り出し、残りを本文にする", () => {
    expect(parseEventText("@探偵 #食堂 >10:00 アリバイを 確認した")).toEqual({
      playerCharacter: "探偵",
      location: "食堂",
      time: "10:00",
      body: "アリバイを 確認した",
    });
  });

  it("接頭辞つきの語は本文のどこにあっても取り出す", () => {
    expect(parseEventText("鍵を拾った >10:00 場所は #書斎")).toEqual({
      playerCharacter: undefined,
      location: "書斎",
      time: "10:00",
      body: "鍵を拾った 場所は",
    });
  });

  it("接頭辞つきの語がなければ全体が本文になる", () => {
    expect(parseEventText("誰も名乗り出なかった")).toEqual({
      playerCharacter: undefined,
      location: undefined,
      time: undefined,
      body: "誰も名乗り出なかった",
    });
  });

  it("同じ接頭辞が複数あれば最後の指定を採る", () => {
    expect(parseEventText("@探偵 @執事 話した").playerCharacter).toBe("執事");
  });

  it("本文が接頭辞つきの語だけなら空文字になる", () => {
    expect(parseEventText("@探偵 >10:00").body).toBe("");
  });
});
