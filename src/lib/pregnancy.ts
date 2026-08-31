/** 妊娠週数まわりの計算。出産予定日を妊娠40週0日として逆算する */

export const GESTATION_WEEKS = 40;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 日付を「その日の 00:00（ローカル）」に丸める */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysUntil(dueDate: Date, now = new Date()): number {
  return Math.round(
    (startOfDay(dueDate).getTime() - startOfDay(now).getTime()) / MS_PER_DAY,
  );
}

export type PregnancyStage = {
  /** 妊娠週数（0〜42 にクランプ） */
  weeks: number;
  /** 週数の端数の日数（0〜6） */
  days: number;
  /** 予定日まであと何日（過ぎている場合は負） */
  daysLeft: number;
  /** 1=初期 / 2=中期 / 3=後期 / 4=予定日以降 */
  trimester: 1 | 2 | 3 | 4;
  trimesterLabel: string;
  /** 「28週3日」形式 */
  label: string;
};

export function pregnancyStage(dueDate: Date, now = new Date()): PregnancyStage {
  const daysLeft = daysUntil(dueDate, now);
  const totalDays = GESTATION_WEEKS * 7 - daysLeft;
  const clamped = Math.max(0, Math.min(42 * 7, totalDays));
  const weeks = Math.floor(clamped / 7);
  const days = clamped % 7;

  let trimester: 1 | 2 | 3 | 4;
  if (daysLeft < 0) trimester = 4;
  else if (weeks < 16) trimester = 1;
  else if (weeks < 28) trimester = 2;
  else trimester = 3;

  const trimesterLabel = {
    1: "妊娠初期",
    2: "妊娠中期",
    3: "妊娠後期",
    4: "予定日を過ぎています",
  }[trimester];

  return {
    weeks,
    days,
    daysLeft,
    trimester,
    trimesterLabel,
    label: `${weeks}週${days}日`,
  };
}

/** 予定日までの残り日数を人が読める形に（相手にも見せて良い粒度） */
export function dueInLabel(dueDate: Date, now = new Date()): string {
  const d = daysUntil(dueDate, now);
  if (d < 0) return `予定日から${Math.abs(d)}日`;
  if (d === 0) return "予定日は今日";
  if (d < 14) return `あと${d}日`;
  return `あと約${Math.round(d / 7)}週間`;
}

/** 出産予定月（相手に見せるのはここまで。日付そのものは公開しない） */
export function dueMonthLabel(dueDate: Date): string {
  return `${dueDate.getFullYear()}年${dueDate.getMonth() + 1}月`;
}
