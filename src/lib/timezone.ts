/**
 * 日本国内向けのサービスなので、時刻の判定はサーバーのロケールではなく
 * 常に Asia/Tokyo で行う。（コンテナが UTC で動いていても結果を変えない）
 */
export const APP_TIMEZONE = "Asia/Tokyo";

const HOUR_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  hour12: false,
});

/** 日本時間での「時」（0〜23） */
export function hourInAppTimezone(date: Date): number {
  const hour = Number.parseInt(HOUR_FORMAT.format(date), 10);
  // 24:00 表記で返ってくる環境があるため丸める
  return hour % 24;
}
