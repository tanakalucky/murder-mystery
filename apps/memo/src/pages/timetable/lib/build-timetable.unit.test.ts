import { describe, expect, it } from "vite-plus/test";

import { buildTimetable, UNASSIGNED } from "./build-timetable";

describe("buildTimetable", () => {
  it("時刻を行、人物を列にしてメモを振り分ける", () => {
    const timetable = buildTimetable([
      { time: "10:00", playerCharacter: "探偵", body: "食堂にいた" },
      { time: "11:00", playerCharacter: "執事", body: "厨房にいた" },
    ]);

    expect(timetable.columns).toEqual(["探偵", "執事"]);
    expect(timetable.rows.map((row) => row.time)).toEqual(["10:00", "11:00"]);
    expect(timetable.rows[0]?.cells.map((cell) => cell.events.map((event) => event.body))).toEqual([
      ["食堂にいた"],
      [],
    ]);
  });

  it("行は時刻の昇順に並ぶ", () => {
    const timetable = buildTimetable([
      { time: "21:00", body: "" },
      { time: "09:30", body: "" },
    ]);

    expect(timetable.rows.map((row) => row.time)).toEqual(["09:30", "21:00"]);
  });

  it("同じ時刻・人物のメモは 1 つのセルにまとまる", () => {
    const timetable = buildTimetable([
      { time: "10:00", playerCharacter: "探偵", body: "食堂にいた" },
      { time: "10:00", playerCharacter: "探偵", body: "鍵を拾った" },
    ]);

    expect(timetable.rows[0]?.cells[0]?.events.map((event) => event.body)).toEqual([
      "食堂にいた",
      "鍵を拾った",
    ]);
  });

  it("人物が未指定のメモがあるときだけ未指定の列を足す", () => {
    const withUnassigned = buildTimetable([
      { time: "10:00", playerCharacter: "探偵", body: "" },
      { time: "10:00", body: "全員が集合した" },
    ]);
    const withoutUnassigned = buildTimetable([
      { time: "10:00", playerCharacter: "探偵", body: "" },
    ]);

    expect(withUnassigned.columns).toEqual(["探偵", UNASSIGNED]);
    expect(withUnassigned.rows[0]?.cells[1]?.events.map((event) => event.body)).toEqual([
      "全員が集合した",
    ]);
    expect(withoutUnassigned.columns).toEqual(["探偵"]);
  });

  it("時刻が未指定のメモは最後の行にまとめる", () => {
    const timetable = buildTimetable([
      { time: "10:00", playerCharacter: "探偵", body: "食堂にいた" },
      { playerCharacter: "探偵", body: "時刻は覚えていない" },
    ]);

    expect(timetable.rows.map((row) => row.time)).toEqual(["10:00", UNASSIGNED]);
    expect(timetable.rows[1]?.cells[0]?.events.map((event) => event.body)).toEqual([
      "時刻は覚えていない",
    ]);
  });

  it("メモがなければ列も行も空になる", () => {
    expect(buildTimetable([])).toEqual({ columns: [], rows: [] });
  });
});
