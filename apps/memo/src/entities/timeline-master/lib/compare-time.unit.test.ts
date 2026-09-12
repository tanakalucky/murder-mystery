import { describe, expect, it } from "vite-plus/test";

import { timeInsertIndex, toMinutes } from "./compare-time";

describe("toMinutes", () => {
  it("時刻を分に直す", () => {
    expect(toMinutes("9:00")).toBe(540);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("21:00")).toBe(1260);
  });

  it("時刻として読めない値は null を返す", () => {
    expect(toMinutes("オープニング")).toBeNull();
    expect(toMinutes("10")).toBeNull();
    expect(toMinutes("10:0")).toBeNull();
  });
});

describe("timeInsertIndex", () => {
  it("桁数が違っても時刻の順に差し込む", () => {
    expect(timeInsertIndex(["9:00", "10:00", "21:00"], "9:30")).toBe(1);
    expect(timeInsertIndex(["9:00", "10:00", "21:00"], "8:00")).toBe(0);
    expect(timeInsertIndex(["9:00", "10:00", "21:00"], "22:00")).toBe(3);
  });

  it("時刻として読めない値は末尾に足す", () => {
    expect(timeInsertIndex(["9:00", "10:00"], "オープニング")).toBe(2);
  });

  it("時刻として読めない値は並びの判定に加えない", () => {
    // 「オープニング」を跨いで 10:00 の手前に入る
    expect(timeInsertIndex(["9:00", "オープニング", "10:00"], "9:30")).toBe(2);
  });
});
