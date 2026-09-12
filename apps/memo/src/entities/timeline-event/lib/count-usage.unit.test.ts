import { describe, expect, it } from "vite-plus/test";

import { countTimelineUsage } from "./count-usage";

describe("countTimelineUsage", () => {
  it("同じ値を使っているメモの件数を数える", () => {
    const usage = countTimelineUsage([
      { playerCharacter: "探偵", location: "食堂", time: "10:00", body: "" },
      { playerCharacter: "探偵", location: "書斎", body: "" },
    ]);

    expect(usage.playerCharacter.get("探偵")).toBe(2);
    expect(usage.location.get("食堂")).toBe(1);
    expect(usage.time.get("10:00")).toBe(1);
  });

  it("未指定と空文字は数えない", () => {
    const usage = countTimelineUsage([
      { body: "誰も名乗り出なかった" },
      { playerCharacter: "", body: "" },
    ]);

    expect(usage.playerCharacter.size).toBe(0);
  });
});
