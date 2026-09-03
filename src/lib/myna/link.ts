/**
 * マイナポータル連携の一連の流れ。
 * 画面から呼ぶのはこの2つだけで、モックか実接続かはここより下で吸収される。
 */
import type { User } from "@prisma/client";
import { prisma } from "../db";
import { expiresAtFor } from "../verification";
import { decideFromSelfInfo } from "./decide";
import { getMynaClient, mynaRedirectUri } from "./client";
import { consumeLinkSession, startLinkSession } from "./session";

export type LinkResult =
  | { ok: true; verifiedDueDate: Date; dueDateUpdated: boolean }
  | { ok: false; reason: string; suggestBoshiTecho: boolean };

/** 同意・本人確認の画面へ送り出す URL を作る */
export async function beginMynaLink(user: User): Promise<string> {
  const { state, codeChallenge } = await startLinkSession(user.id);
  return getMynaClient().buildAuthorizeUrl({
    state,
    codeChallenge,
    redirectUri: await mynaRedirectUri(),
  });
}

/** 戻ってきたところ。state を検証し、情報を取り、確認を付ける */
export async function completeMynaLink(
  state: string,
  code: string,
  now = new Date(),
): Promise<LinkResult> {
  const session = await consumeLinkSession(state);
  if (!session.ok) {
    const reason = {
      unknown_state: "連携の情報が確認できませんでした。もう一度お試しください。",
      expired: "時間が経ちすぎたため中断しました。もう一度お試しください。",
      already_used: "この連携はすでに完了しています。",
    }[session.reason];
    return { ok: false, reason, suggestBoshiTecho: false };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return { ok: false, reason: "アカウントが見つかりませんでした。", suggestBoshiTecho: false };
  }

  const client = getMynaClient();
  let info;
  try {
    const tokens = await client.exchangeCode({
      code,
      codeVerifier: session.codeVerifier,
      redirectUri: await mynaRedirectUri(),
    });
    info = await client.fetchMaternitySelfInfo(tokens);
  } catch {
    // 外部の障害を利用者のせいに見せない
    return {
      ok: false,
      reason: "マイナポータルとの通信に失敗しました。時間をおいてお試しください。",
      suggestBoshiTecho: true,
    };
  }

  const decision = decideFromSelfInfo(info, user.dueDate, now);
  if (decision.outcome === "rejected") {
    return {
      ok: false,
      reason: decision.reason,
      suggestBoshiTecho: decision.suggestBoshiTecho,
    };
  }

  await prisma.$transaction([
    prisma.verificationRequest.create({
      data: {
        userId: user.id,
        method: "myna",
        declaredDueDate: decision.verifiedDueDate,
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
        verificationExpiresAt: expiresAtFor(decision.verifiedDueDate),
        // 記録のほうが正しいので、登録の出産予定日も合わせる
        ...(decision.shouldUpdateDueDate ? { dueDate: decision.verifiedDueDate } : {}),
      },
    }),
  ]);

  return {
    ok: true,
    verifiedDueDate: decision.verifiedDueDate,
    dueDateUpdated: decision.shouldUpdateDueDate,
  };
}
