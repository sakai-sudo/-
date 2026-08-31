/**
 * プロトタイプ用のごく簡易なセッション。
 * Cookie にユーザー ID を入れるだけで、パスワード認証はしていない。
 * 本番化する際は必ず署名付きトークン + 認証基盤（メールリンク等）に差し替えること。
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "matamatch_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user ?? null;
}

/** ログイン必須ページで使う。未ログインなら / に戻す */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/?need_login=1");
  return user;
}
