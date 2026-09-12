import { describe, expect, it } from "vite-plus/test";

import { parseEventText } from "./parse-event-text";
import { formatEventText } from "./format-event-text";

describe("formatEventText", () => {
  it("接頭辞つきの語を先頭にまとめ、本文を後ろに置く", () => {
    const text = formatEventText({
      playerCharacter: "探偵",
      location: "食堂",
      time: "10:00",
      body: "アリバイ確認",
    });

    expect(text).toBe("@探偵 #食堂 >10:00 アリバイ確認");
  });

  it("未指定の項目と空文字は書き出さない", () => {
    expect(formatEventText({ playerCharacter: "", time: "10:00", body: "集合" })).toBe(
      ">10:00 集合",
    );
    expect(formatEventText({ body: "全員が集合した" })).toBe("全員が集合した");
    expect(formatEventText({ playerCharacter: "探偵", body: "" })).toBe("@探偵");
  });

  it("書き出した文字列を読み直しても同じメモになる", () => {
    const event = parseEventText("#食堂 アリバイ確認 >10:00 @探偵");

    expect(parseEventText(formatEventText(event))).toEqual(event);
  });
});
