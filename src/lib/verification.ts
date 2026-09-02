/**
 * 妊婦であることの確認。
 *
 * 方針（詳細は docs/verification.md）:
 *   - 認証は利用の条件にしない。登録は軽くして、認証は「できることの範囲」を広げるもの
 *   - 本命はマイナポータルの自己情報取得API（妊婦健診情報）。画像を受け取らずに済む
 *   - 対応していない自治体向けに、母子健康手帳の「予定日ページのみ」を目視審査する経路を用意
 *   - 母子手帳の画像は公開領域の外に一時保存し、審査の結果が出た時点で実体ごと削除する
 *   - 認証は出産予定日 + 8週で失効させ、産後モードへ移行させる
 */
import { unlink } from "node:fs/promises";
import path from "node:path";
import type { User } from "@prisma/client";
import { prisma } from "./db";

export const VERIFICATION_VALID_WEEKS_AFTER_DUE = 8;

/** 母子手帳の画像を置く一時ディレクトリ。public/ の外に置き、審査後に削除する */
export const EVIDENCE_DIR = path.join(process.cwd(), ".verification-tmp");

export type VerificationStatus =
  | "none"
  | "pending"
  | "verified"
  | "expired"
  | "rejected";

export const VERIFICATION_METHOD_LABEL: Record<string, string> = {
  myna: "マイナポータル連携",
  boshi_techo: "母子健康手帳",
  clinic: "産院連携",
};

export function expiresAtFor(dueDate: Date): Date {
  return new Date(
    dueDate.getTime() + VERIFICATION_VALID_WEEKS_AFTER_DUE * 7 * 24 * 60 * 60 * 1000,
  );
}

export function isVerified(user: {
  verificationStatus: string;
  verificationExpiresAt: Date | null;
}, now = new Date()): boolean {
  if (user.verificationStatus !== "verified") return false;
  if (user.verificationExpiresAt && user.verificationExpiresAt < now) return false;
  return true;
}

export function verificationLabel(user: User, now = new Date()): string {
  if (isVerified(user, now)) return "妊婦確認済み";
  switch (user.verificationStatus) {
    case "pending":
      return "確認中";
    case "expired":
      return "確認の有効期限切れ";
    case "rejected":
      return "確認できませんでした";
    default:
      return "未確認";
  }
}

/** 期限切れの認証を expired に落とす（読み取りのたびに遅延評価する） */
export async function expireStaleVerifications(now = new Date()): Promise<void> {
  await prisma.user.updateMany({
    where: {
      verificationStatus: "verified",
      verificationExpiresAt: { lt: now },
    },
    data: { verificationStatus: "expired" },
  });
}

async function removeEvidence(evidenceRef: string | null | undefined) {
  if (!evidenceRef) return;
  // ディレクトリを抜け出すパスを渡されても EVIDENCE_DIR の外を触らせない
  const resolved = path.resolve(EVIDENCE_DIR, path.basename(evidenceRef));
  if (!resolved.startsWith(EVIDENCE_DIR)) return;
  await unlink(resolved).catch(() => undefined);
}

/** マイナポータル連携で確認できた場合（画像は介在しない） */
export async function verifyByMynaPortal(user: User, verifiedDueDate: Date) {
  const now = new Date();
  await prisma.$transaction([
    prisma.verificationRequest.create({
      data: {
        userId: user.id,
        method: "myna",
        declaredDueDate: verifiedDueDate,
        status: "approved",
        reviewedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: "verified",
        verificationMethod: "myna",
        verifiedAt: now,
        verificationExpiresAt: expiresAtFor(verifiedDueDate),
      },
    }),
  ]);
}

/** 母子手帳の提出を審査待ちに入れる */
export async function submitBoshiTechoRequest(
  user: User,
  evidenceRef: string,
  declaredDueDate: Date,
) {
  // 出し直しの場合、前の審査待ちは取り下げて証跡も消す
  const previous = await prisma.verificationRequest.findMany({
    where: { userId: user.id, status: "pending" },
  });
  for (const req of previous) {
    await removeEvidence(req.evidenceRef);
    await prisma.verificationRequest.update({
      where: { id: req.id },
      data: { status: "rejected", rejectReason: "再提出により取り下げ", evidenceRef: null, reviewedAt: new Date() },
    });
  }

  await prisma.$transaction([
    prisma.verificationRequest.create({
      data: {
        userId: user.id,
        method: "boshi_techo",
        evidenceRef,
        declaredDueDate,
        status: "pending",
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { verificationStatus: "pending", verificationMethod: "boshi_techo" },
    }),
  ]);
}

export async function approveRequest(requestId: string) {
  const req = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending") return;

  const now = new Date();
  await removeEvidence(req.evidenceRef);
  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: requestId },
      data: { status: "approved", reviewedAt: now, evidenceRef: null },
    }),
    prisma.user.update({
      where: { id: req.userId },
      data: {
        verificationStatus: "verified",
        verifiedAt: now,
        verificationExpiresAt: expiresAtFor(req.declaredDueDate),
      },
    }),
  ]);
}

export async function rejectRequest(requestId: string, reason: string) {
  const req = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending") return;

  await removeEvidence(req.evidenceRef);
  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        reviewedAt: new Date(),
        rejectReason: reason.slice(0, 200),
        evidenceRef: null,
      },
    }),
    prisma.user.update({
      where: { id: req.userId },
      data: { verificationStatus: "rejected" },
    }),
  ]);
}

/**
 * 「認証済みの人としかマッチしない」設定を踏まえて、この2人が出会えるか。
 *
 * 片側だけに効かせると「いいねしたのに相手からは見えない」状態が生まれるので、
 * どちらかが絞っていれば双方の一覧から相互に消す。
 */
export function verifiedGateAllows(
  me: { requireVerifiedMatch: boolean; verificationStatus: string; verificationExpiresAt: Date | null },
  other: { requireVerifiedMatch: boolean; verificationStatus: string; verificationExpiresAt: Date | null },
  now = new Date(),
): boolean {
  if (me.requireVerifiedMatch && !isVerified(other, now)) return false;
  if (other.requireVerifiedMatch && !isVerified(me, now)) return false;
  return true;
}

/** 審査画面を触れるかどうか。ADMIN_EMAILS に列挙されたアカウントのみ */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
