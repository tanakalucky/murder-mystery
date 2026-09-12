import { describe, expect, it } from "vite-plus/test";

import {
  addValue,
  EMPTY_MASTERS,
  moveValue,
  registerValues,
  removeValue,
  renameValue,
} from "./master-list";

describe("addValue", () => {
  it("人物と場所は登録した順に並ぶ", () => {
    let masters = addValue(EMPTY_MASTERS, "player", "執事");
    masters = addValue(masters, "player", "探偵");

    expect(masters.players).toEqual(["執事", "探偵"]);
  });

  it("時刻は登録した順によらず時刻の順に並ぶ", () => {
    let masters = addValue(EMPTY_MASTERS, "time", "21:00");
    masters = addValue(masters, "time", "9:00");
    masters = addValue(masters, "time", "10:00");

    expect(masters.times).toEqual(["9:00", "10:00", "21:00"]);
  });

  it("登録済みの値と空文字は足さない", () => {
    const masters = addValue(EMPTY_MASTERS, "player", "探偵");

    expect(addValue(masters, "player", "探偵")).toBe(masters);
    expect(addValue(masters, "player", "")).toBe(masters);
  });
});

describe("renameValue", () => {
  it("並びの位置を保ったまま書き換える", () => {
    let masters = addValue(EMPTY_MASTERS, "player", "偵探");
    masters = addValue(masters, "player", "執事");

    expect(renameValue(masters, "player", "偵探", "探偵").players).toEqual(["探偵", "執事"]);
  });

  it("同じ名前が既にあるときは 1 つに合流する", () => {
    let masters = addValue(EMPTY_MASTERS, "player", "探偵");
    masters = addValue(masters, "player", "執事");
    masters = addValue(masters, "player", "偵探");

    expect(renameValue(masters, "player", "偵探", "探偵").players).toEqual(["探偵", "執事"]);
  });

  it("時刻は直した結果の順に並び替える", () => {
    let masters = addValue(EMPTY_MASTERS, "time", "10:00");
    masters = addValue(masters, "time", "21:00");

    expect(renameValue(masters, "time", "21:00", "9:00").times).toEqual(["9:00", "10:00"]);
  });

  it("空文字・同じ名前・未登録の値では何もしない", () => {
    const masters = addValue(EMPTY_MASTERS, "player", "探偵");

    expect(renameValue(masters, "player", "探偵", "")).toBe(masters);
    expect(renameValue(masters, "player", "探偵", "探偵")).toBe(masters);
    expect(renameValue(masters, "player", "執事", "料理人")).toBe(masters);
  });
});

describe("removeValue", () => {
  it("値を取り除く", () => {
    let masters = addValue(EMPTY_MASTERS, "location", "食堂");
    masters = addValue(masters, "location", "書斎");

    expect(removeValue(masters, "location", "食堂").locations).toEqual(["書斎"]);
  });

  it("未登録の値では何もしない", () => {
    expect(removeValue(EMPTY_MASTERS, "location", "食堂")).toBe(EMPTY_MASTERS);
  });
});

describe("moveValue", () => {
  it("1 つ隣と入れ替える", () => {
    let masters = addValue(EMPTY_MASTERS, "player", "探偵");
    masters = addValue(masters, "player", "執事");

    expect(moveValue(masters, "player", "執事", -1).players).toEqual(["執事", "探偵"]);
    expect(moveValue(masters, "player", "探偵", 1).players).toEqual(["執事", "探偵"]);
  });

  it("端では何もしない", () => {
    const masters = addValue(EMPTY_MASTERS, "player", "探偵");

    expect(moveValue(masters, "player", "探偵", -1)).toBe(masters);
    expect(moveValue(masters, "player", "探偵", 1)).toBe(masters);
  });
});

describe("registerValues", () => {
  it("メモの 3 つの値をまとめて登録する", () => {
    const masters = registerValues(EMPTY_MASTERS, {
      player: "探偵",
      location: "食堂",
      time: "10:00",
    });

    expect(masters).toEqual({ players: ["探偵"], locations: ["食堂"], times: ["10:00"] });
  });

  it("未指定の値は登録しない", () => {
    expect(registerValues(EMPTY_MASTERS, { player: "探偵" })).toEqual({
      players: ["探偵"],
      locations: [],
      times: [],
    });
  });
});
