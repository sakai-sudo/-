/**
 * 取得した妊婦健診情報から「妊婦確認を通すかどうか」を決める、純粋なロジック。
 * 副作用がないので単体テストしやすくしてある（decide.test.ts）。
 */
import type { MaternitySelfInfo } from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** 直近の受診がこれより古いと、いま妊娠中とは言い切れない */
export const STALE_CHECKUP_DAYS = 180;

/** 分娩予定日として受け付ける範囲（過ぎている場合は産後8週まで許容） */
export const MAX_DAYS_PAST_DUE = 56;
export const MAX_DAYS_UNTIL_DUE = 300;

/** 本人の申告と記録がこれ以上ずれていたら、記録のほうを正として上書きする */
export const DUE_DATE_SYNC_THRESHOLD_DAYS = 3;

export type VerificationDecision =
  | {
      outcome: "verified";
      /** 確認できた分娩予定日（これを正とする） */
      verifiedDueDate: Date;
      /** 本人の登録と食い違っていて、更新すべきか */
      shouldUpdateDueDate: boolean;
      lastCheckupOn: Date | null;
    }
  | {
      outcome: "rejected";
      /** 画面に出す理由。ユーザーが次に何をすればよいか分かる文言にする */
      reason: string;
      /** 自治体が未対応なら、母子手帳の経路へ誘導する */
      suggestBoshiTecho: boolean;
    };

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY);
}

export function decideFromSelfInfo(
  info: MaternitySelfInfo,
  declaredDueDate: Date,
  now = new Date(),
): VerificationDecision {
  if (!info.municipalitySupported) {
    return {
      outcome: "rejected",
      reason:
        "お住まいの自治体は、まだマイナポータルでの母子保健情報の連携に対応していないようです。",
      suggestBoshiTecho: true,
    };
  }

  const checkups = [...info.checkups].sort(
    (a, b) => b.examinedOn.getTime() - a.examinedOn.getTime(),
  );
  const lastCheckup = checkups[0] ?? null;

  if (!lastCheckup) {
    return {
      outcome: "rejected",
      reason:
        "妊婦健診の記録が見つかりませんでした。健診を受けてから自治体の記録に反映されるまで時間がかかることがあります。",
      suggestBoshiTecho: true,
    };
  }

  const sinceLastCheckup = daysBetween(now, lastCheckup.examinedOn);
  if (sinceLastCheckup > STALE_CHECKUP_DAYS) {
    return {
      outcome: "rejected",
      reason: `直近の妊婦健診が${Math.floor(sinceLastCheckup / 30)}か月以上前でした。最新の健診が記録に反映されてから、もう一度お試しください。`,
      suggestBoshiTecho: true,
    };
  }

  // 予定日は記録にあればそれを、なければ本人の申告を使う
  const dueDate = info.expectedBirthDate ?? declaredDueDate;
  const daysUntilDue = daysBetween(dueDate, now);

  if (daysUntilDue > MAX_DAYS_UNTIL_DUE) {
    return {
      outcome: "rejected",
      reason: "記録上の分娩予定日が先すぎます。登録内容をご確認ください。",
      suggestBoshiTecho: false,
    };
  }
  if (daysUntilDue < -MAX_DAYS_PAST_DUE) {
    return {
      outcome: "rejected",
      reason:
        "記録上の分娩予定日から時間が経っています。ご出産済みの場合は、育児期のプロフィールに切り替えてご利用ください。",
      suggestBoshiTecho: false,
    };
  }

  const gap = Math.abs(daysBetween(dueDate, declaredDueDate));
  return {
    outcome: "verified",
    verifiedDueDate: dueDate,
    shouldUpdateDueDate: gap > DUE_DATE_SYNC_THRESHOLD_DAYS,
    lastCheckupOn: lastCheckup.examinedOn,
  };
}
