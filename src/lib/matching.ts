/**
 * 相性スコアの算出。
 *
 * 「同じ時期に、近い場所で、似た状況の妊婦さん」ほど話が合うという前提で、
 * 5つの観点を重み付けして 0〜100 点にまとめる。
 *
 *   週数の近さ  32点  … 悩みの内容は妊娠週数でほぼ決まるため最重要
 *   エリアの近さ 26点  … 産院・自治体サービス・保活の話が通じる
 *   興味タグ     24点  … 会話のきっかけ
 *   初産/経産    10点  … 経験値が揃うと相談しやすい
 *   年代の近さ    8点  … 補助的
 *
 * 重みは MATCH_WEIGHTS を書き換えれば調整できる。
 */

import { ageGroupIndex, regionOf } from "./constants";
import { parseInterests } from "./interests";
import { pregnancyStage } from "./pregnancy";

export const MATCH_WEIGHTS = {
  week: 32,
  area: 26,
  interest: 24,
  birthOrder: 10,
  age: 8,
} as const;

export type MatchableUser = {
  id: string;
  dueDate: Date;
  prefecture: string;
  city: string;
  birthOrder: string;
  ageGroup: string;
  interests: string;
};

export type ScoreReason = {
  kind: keyof typeof MATCH_WEIGHTS;
  label: string;
  /** その観点で強い一致（バッジを強調表示する） */
  strong: boolean;
};

export type MatchScore = {
  score: number;
  reasons: ScoreReason[];
  weekDiff: number;
  sharedInterests: string[];
};

/** 週数差 → 得点（0週差=満点、12週以上離れると僅か） */
function weekPoints(diff: number): number {
  const w = MATCH_WEIGHTS.week;
  if (diff <= 1) return w;
  if (diff <= 2) return w * 0.88;
  if (diff <= 4) return w * 0.7;
  if (diff <= 6) return w * 0.5;
  if (diff <= 9) return w * 0.32;
  if (diff <= 13) return w * 0.16;
  return w * 0.05;
}

/** エリア → 得点（同市区町村 > 同都道府県 > 同地方） */
function areaPoints(a: MatchableUser, b: MatchableUser): number {
  const w = MATCH_WEIGHTS.area;
  if (a.prefecture === b.prefecture && normalizeCity(a.city) === normalizeCity(b.city)) {
    return w;
  }
  if (a.prefecture === b.prefecture) return w * 0.62;
  const ra = regionOf(a.prefecture);
  const rb = regionOf(b.prefecture);
  if (ra && rb && ra === rb) return w * 0.24;
  return 0;
}

function normalizeCity(city: string): string {
  return city.trim().replace(/\s+/g, "");
}

/** 興味タグ → 得点（共通数を重視した Jaccard の変形） */
function interestPoints(shared: number, union: number): number {
  if (union === 0) return 0;
  const w = MATCH_WEIGHTS.interest;
  const jaccard = shared / union;
  // 共通が3つ以上あれば体感としてかなり近いので、そこで満点に近づける
  const countBoost = Math.min(1, shared / 3);
  return w * (jaccard * 0.45 + countBoost * 0.55);
}

function agePoints(a: string, b: string): number {
  const ia = ageGroupIndex(a);
  const ib = ageGroupIndex(b);
  if (ia < 0 || ib < 0) return 0;
  const diff = Math.abs(ia - ib);
  const w = MATCH_WEIGHTS.age;
  if (diff === 0) return w;
  if (diff === 1) return w * 0.6;
  if (diff === 2) return w * 0.25;
  return 0;
}

export function scoreMatch(
  me: MatchableUser,
  other: MatchableUser,
  now = new Date(),
): MatchScore {
  const myStage = pregnancyStage(me.dueDate, now);
  const otherStage = pregnancyStage(other.dueDate, now);
  const weekDiff = Math.abs(myStage.weeks - otherStage.weeks);

  const myTags = new Set(parseInterests(me.interests));
  const otherTags = parseInterests(other.interests);
  const sharedInterests = otherTags.filter((t) => myTags.has(t));
  const union = new Set([...myTags, ...otherTags]).size;

  const points = {
    week: weekPoints(weekDiff),
    area: areaPoints(me, other),
    interest: interestPoints(sharedInterests.length, union),
    birthOrder: me.birthOrder === other.birthOrder ? MATCH_WEIGHTS.birthOrder : 0,
    age: agePoints(me.ageGroup, other.ageGroup),
  };

  const total = Object.values(points).reduce((s, v) => s + v, 0);

  const reasons: ScoreReason[] = [];

  if (weekDiff === 0) {
    reasons.push({ kind: "week", label: "妊娠週数がほぼ同じ", strong: true });
  } else if (weekDiff <= 2) {
    reasons.push({ kind: "week", label: `週数が${weekDiff}週差`, strong: true });
  } else if (weekDiff <= 6) {
    reasons.push({ kind: "week", label: `週数が${weekDiff}週差`, strong: false });
  } else if (otherStage.weeks > myStage.weeks) {
    reasons.push({ kind: "week", label: "少し先を歩む先輩", strong: false });
  }

  if (points.area === MATCH_WEIGHTS.area) {
    reasons.push({ kind: "area", label: `同じ${other.city}`, strong: true });
  } else if (me.prefecture === other.prefecture) {
    reasons.push({ kind: "area", label: `同じ${other.prefecture}`, strong: true });
  } else {
    const r = regionOf(other.prefecture);
    if (r && r === regionOf(me.prefecture)) {
      reasons.push({ kind: "area", label: "同じ地方", strong: false });
    }
  }

  if (sharedInterests.length > 0) {
    reasons.push({
      kind: "interest",
      label: `共通のタグ${sharedInterests.length}個`,
      strong: sharedInterests.length >= 3,
    });
  }

  if (points.birthOrder > 0) {
    reasons.push({
      kind: "birthOrder",
      label: me.birthOrder === "first" ? "どちらも初産" : "どちらも経産",
      strong: false,
    });
  }

  if (points.age === MATCH_WEIGHTS.age) {
    reasons.push({ kind: "age", label: "同じ年代", strong: false });
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, total))),
    reasons,
    weekDiff,
    sharedInterests,
  };
}

/** スコアの体感ラベル */
export function scoreLabel(score: number): string {
  if (score >= 80) return "とても話が合いそう";
  if (score >= 65) return "話が合いそう";
  if (score >= 45) return "共通点あり";
  return "少し離れています";
}
