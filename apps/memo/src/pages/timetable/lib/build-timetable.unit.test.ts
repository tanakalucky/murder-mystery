import type { TimelineMasters } from "#/entities/timeline-master";
import { describe, expect, it } from "vite-plus/test";

import { buildTimetable, UNASSIGNED } from "./build-timetable";

const masters = (players: readonly string[], times: readonly string[] = []): TimelineMasters => ({
  players,
  times,
  locations: [],
});

describe("buildTimetable", () => {
  it("時刻を行、人物を列にしてメモを振り分ける", () => {
    const timetable = buildTimetable(
      [
        { time: "10:00", playerCharacter: "探偵", body: "食堂にいた" },
        { time: "11:00", playerCharacter: "執事", body: "厨房にいた" },
      ],
      masters(["探偵", "執事"], ["10:00", "11:00"]),
    );

    expect(timetable.columns).toEqual(["探偵", "執事"]);
    expect(timetable.rows.map((row) => row.time)).toEqual(["10:00", "11:00"]);
    expect(timetable.rows[0]?.cells.map((cell) => cell.events.map((event) => event.body))).toEqual([
      ["食堂にいた"],
      [],
    ]);
  });

  it("列と行は登録した並びをそのまま使う", () => {
    const timetable = buildTimetable(
      [
        { time: "21:00", playerCharacter: "執事", body: "" },
        { time: "9:00", playerCharacter: "探偵", body: "" },
      ],
      masters(["探偵", "執事"], ["9:00", "21:00"]),
    );

    expect(timetable.columns).toEqual(["探偵", "執事"]);
    expect(timetable.rows.map((row) => row.time)).toEqual(["9:00", "21:00"]);
  });

  it("メモがまだ 1 件もない人物・時刻も空の列・行として出る", () => {
    const timetable = buildTimetable([], masters(["探偵", "執事"], ["10:00"]));

    expect(timetable.columns).toEqual(["探偵", "執事"]);
    expect(timetable.rows.map((row) => row.time)).toEqual(["10:00"]);
    expect(timetable.rows[0]?.cells.map((cell) => cell.events)).toEqual([[], []]);
  });

  it("同じ時刻・人物のメモは 1 つのセルにまとまる", () => {
    const timetable = buildTimetable(
      [
        { time: "10:00", playerCharacter: "探偵", body: "食堂にいた" },
        { time: "10:00", playerCharacter: "探偵", body: "鍵を拾った" },
      ],
      masters(["探偵"], ["10:00"]),
    );

    expect(timetable.rows[0]?.cells[0]?.events.map((event) => event.body)).toEqual([
      "食堂にいた",
      "鍵を拾った",
    ]);
  });

  it("人物が未指定のメモがあるときだけ未指定の列を足す", () => {
    const withUnassigned = buildTimetable(
      [
        { time: "10:00", playerCharacter: "探偵", body: "" },
        { time: "10:00", body: "全員が集合した" },
      ],
      masters(["探偵"], ["10:00"]),
    );
    const withoutUnassigned = buildTimetable(
      [{ time: "10:00", playerCharacter: "探偵", body: "" }],
      masters(["探偵"], ["10:00"]),
    );

    expect(withUnassigned.columns).toEqual(["探偵", UNASSIGNED]);
    expect(withUnassigned.rows[0]?.cells[1]?.events.map((event) => event.body)).toEqual([
      "全員が集合した",
    ]);
    expect(withoutUnassigned.columns).toEqual(["探偵"]);
  });

  it("時刻が未指定のメモは最後の行にまとめる", () => {
    const timetable = buildTimetable(
      [
        { time: "10:00", playerCharacter: "探偵", body: "食堂にいた" },
        { playerCharacter: "探偵", body: "時刻は覚えていない" },
      ],
      masters(["探偵"], ["10:00"]),
    );

    expect(timetable.rows.map((row) => row.time)).toEqual(["10:00", UNASSIGNED]);
    expect(timetable.rows[1]?.cells[0]?.events.map((event) => event.body)).toEqual([
      "時刻は覚えていない",
    ]);
  });

  it("メモも登録もなければ列も行も空になる", () => {
    expect(buildTimetable([], masters([]))).toEqual({ columns: [], rows: [] });
  });
});
