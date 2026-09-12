const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

/** `H:MM` / `HH:MM` を分に直す。時刻として読めない値は `null` */
export const toMinutes = (value: string): number | null => {
  const match = TIME_PATTERN.exec(value);
  if (match === null) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * 時刻を差し込む位置。文字列のまま比べると `9:00` が `10:00` の後ろに来るので分で比べる。
 * `オープニング` のような時刻として読めない値は並びの判定に加えず、末尾に足す。
 */
export const timeInsertIndex = (times: readonly string[], value: string): number => {
  const target = toMinutes(value);
  if (target === null) return times.length;

  const index = times.findIndex((time) => {
    const minutes = toMinutes(time);
    return minutes !== null && minutes > target;
  });

  return index === -1 ? times.length : index;
};
