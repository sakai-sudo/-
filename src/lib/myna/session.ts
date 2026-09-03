/**
 * マイナポータルへ送り出してから戻ってくるまでの状態管理。
 * state で CSRF を防ぎ、PKCE の code_verifier をサーバー側に保持する。
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db";

const TTL_MS = 10 * 60 * 1000;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function codeChallengeFor(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export async function startLinkSession(userId: string) {
  // 期限切れの残骸を掃除しておく
  await prisma.mynaLinkSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const state = base64url(randomBytes(24));
  const codeVerifier = base64url(randomBytes(48));
  await prisma.mynaLinkSession.create({
    data: {
      state,
      userId,
      codeVerifier,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return { state, codeVerifier, codeChallenge: codeChallengeFor(codeVerifier) };
}

export type ConsumedSession =
  | { ok: true; userId: string; codeVerifier: string }
  | { ok: false; reason: "unknown_state" | "expired" | "already_used" };

/** state を1回だけ使えるようにする（再利用・期限切れは弾く） */
export async function consumeLinkSession(state: string): Promise<ConsumedSession> {
  const session = await prisma.mynaLinkSession.findUnique({ where: { state } });
  if (!session) return { ok: false, reason: "unknown_state" };
  if (session.consumedAt) return { ok: false, reason: "already_used" };
  if (session.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await prisma.mynaLinkSession.update({
    where: { state },
    data: { consumedAt: new Date() },
  });
  return { ok: true, userId: session.userId, codeVerifier: session.codeVerifier };
}
