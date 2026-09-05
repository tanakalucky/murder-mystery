import { describe, expect, it } from "vite-plus/test";

import { collectSuggestions } from "./collect-suggestions";

describe("collectSuggestions", () => {
  it("メモに出てきた人物・場所・時刻を重複なく集める", () => {
    const suggestions = collectSuggestions([
      { playerCharacter: "探偵", location: "食堂", time: "10:00", body: "" },
      { playerCharacter: "探偵", location: "書斎", time: "10:00", body: "" },
    ]);

    expect(suggestions).toEqual({
      players: ["探偵"],
      locations: ["食堂", "書斎"],
      times: ["10:00"],
    });
  });

  it("人物と場所はメモに現れた順を保つ", () => {
    const suggestions = collectSuggestions([
      { playerCharacter: "執事", body: "" },
      { playerCharacter: "探偵", body: "" },
    ]);

    expect(suggestions.players).toEqual(["執事", "探偵"]);
  });

  it("時刻だけは昇順に並べ替える", () => {
    const suggestions = collectSuggestions([
      { time: "21:00", body: "" },
      { time: "09:30", body: "" },
      { time: "10:00", body: "" },
    ]);

    expect(suggestions.times).toEqual(["09:30", "10:00", "21:00"]);
  });

  it("未指定の属性は候補に含めない", () => {
    const suggestions = collectSuggestions([{ body: "誰も名乗り出なかった" }]);

    expect(suggestions).toEqual({ players: [], locations: [], times: [] });
  });
});
