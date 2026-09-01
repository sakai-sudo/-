/**
 * アプリ内音声通話のサーバー側ロジック。
 *
 * 設計の前提:
 *   - 電話番号は交換しない。通話はマッチ済みの相手とだけ、アプリ内で完結する
 *   - 妊娠中は体調が読めないので「いきなり着信」は避け、呼び出し → 承諾 の2段階にする
 *   - 相手が通話を受け付けない設定・時間外なら、そもそも発信させない
 *   - 音声は WebRTC で端末間を直接流れる。サーバーが中継するのは SDP と ICE だけ
 */
import type { Call, User } from "@prisma/client";
import { prisma } from "./db";
import { hourInAppTimezone } from "./timezone";

/** 呼び出しを何秒鳴らし続けたら不在着信にするか */
export const RING_TIMEOUT_SEC = 45;

/** 1回の通話の上限（切り忘れ対策） */
export const MAX_CALL_SEC = 60 * 60;

export type CallAvailability =
  | { ok: true }
  | { ok: false; reason: string };

/** 相手がいま通話を受け付けられるか */
export function callAvailability(callee: User, now = new Date()): CallAvailability {
  if (!callee.acceptCalls) {
    return { ok: false, reason: `${callee.nickname}さんは通話を受け付けていません` };
  }
  const hour = hourInAppTimezone(now);
  const { callFromHour: from, callToHour: to } = callee;
  const inRange = from <= to ? hour >= from && hour < to : hour >= from || hour < to;
  if (!inRange) {
    return {
      ok: false,
      reason: `${callee.nickname}さんの通話受付時間は ${from}:00〜${to}:00 です`,
    };
  }
  return { ok: true };
}

export function callHoursLabel(user: User): string {
  if (!user.acceptCalls) return "通話は受け付けていません";
  return `通話OK（${user.callFromHour}:00〜${user.callToHour}:00）`;
}

/** 呼び出したまま放置された通話を不在着信にする（読み取りのたびに遅延評価する） */
export async function expireStaleCalls(now = new Date()): Promise<void> {
  const ringDeadline = new Date(now.getTime() - RING_TIMEOUT_SEC * 1000);
  const stale = await prisma.call.findMany({
    where: { status: "ringing", createdAt: { lt: ringDeadline } },
  });
  for (const call of stale) {
    await prisma.call.update({
      where: { id: call.id },
      data: { status: "missed", endedAt: now },
    });
    await writeCallLog(call, "missed", 0);
  }

  // 終了処理が届かないまま放置された通話も閉じる
  const callDeadline = new Date(now.getTime() - MAX_CALL_SEC * 1000);
  const runaway = await prisma.call.findMany({
    where: { status: "active", answeredAt: { lt: callDeadline } },
  });
  for (const call of runaway) {
    await endCall(call.id, now);
  }
}

/** トークに通話の記録を残す（本文ではなく kind: "call" で区別する） */
async function writeCallLog(
  call: Call,
  outcome: "missed" | "declined" | "ended" | "canceled",
  durationSec: number,
) {
  const body =
    outcome === "ended"
      ? `通話 ${formatDuration(durationSec)}`
      : outcome === "missed"
        ? "不在着信"
        : outcome === "declined"
          ? "通話を見送りました"
          : "発信をキャンセルしました";

  await prisma.message.create({
    data: { matchId: call.matchId, senderId: call.callerId, kind: "call", body },
  });
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${String(s).padStart(2, "0")}秒`;
}

export type CreateCallResult =
  | { ok: true; callId: string }
  | { ok: false; error: string };

export async function createCall(
  me: User,
  matchId: string,
  note: string,
  now = new Date(),
): Promise<CreateCallResult> {
  await expireStaleCalls(now);

  const match = await prisma.match.findFirst({
    where: { id: matchId, OR: [{ userAId: me.id }, { userBId: me.id }] },
    include: { userA: true, userB: true },
  });
  if (!match) return { ok: false, error: "この相手とは通話できません" };

  const callee = match.userAId === me.id ? match.userB : match.userA;
  if (!callee.isActive) return { ok: false, error: "相手が退会しています" };

  const availability = callAvailability(callee, now);
  if (!availability.ok) return { ok: false, error: availability.reason };

  // すでに進行中の通話があれば、それに合流させる
  const ongoing = await prisma.call.findFirst({
    where: {
      matchId,
      status: { in: ["ringing", "active"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (ongoing) return { ok: true, callId: ongoing.id };

  // 相手が別の誰かと通話中なら発信させない
  const calleeBusy = await prisma.call.findFirst({
    where: {
      status: { in: ["ringing", "active"] },
      OR: [{ callerId: callee.id }, { calleeId: callee.id }],
    },
  });
  if (calleeBusy) {
    return { ok: false, error: `${callee.nickname}さんはいま別の通話中です` };
  }

  const call = await prisma.call.create({
    data: {
      matchId,
      callerId: me.id,
      calleeId: callee.id,
      note: note.slice(0, 60),
    },
  });
  return { ok: true, callId: call.id };
}

export async function acceptCall(callId: string, now = new Date()) {
  return prisma.call.updateMany({
    where: { id: callId, status: "ringing" },
    data: { status: "active", answeredAt: now },
  });
}

export async function declineCall(callId: string, now = new Date()) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call || call.status !== "ringing") return;
  await prisma.call.update({
    where: { id: callId },
    data: { status: "declined", endedAt: now },
  });
  await writeCallLog(call, "declined", 0);
}

export async function cancelCall(callId: string, now = new Date()) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call || call.status !== "ringing") return;
  await prisma.call.update({
    where: { id: callId },
    data: { status: "canceled", endedAt: now },
  });
  await writeCallLog(call, "canceled", 0);
}

export async function endCall(callId: string, now = new Date()) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return;
  if (call.status === "ringing") return cancelCall(callId, now);
  if (call.status !== "active") return;

  const started = call.answeredAt ?? call.createdAt;
  const durationSec = Math.max(
    0,
    Math.min(MAX_CALL_SEC, Math.round((now.getTime() - started.getTime()) / 1000)),
  );
  await prisma.call.update({
    where: { id: callId },
    data: { status: "ended", endedAt: now, durationSec },
  });
  await writeCallLog(call, "ended", durationSec);
}

/** ブロック時など、その相手との通話を強制的に終わらせる */
export async function endCallsBetween(aId: string, bId: string, now = new Date()) {
  const calls = await prisma.call.findMany({
    where: {
      status: { in: ["ringing", "active"] },
      OR: [
        { callerId: aId, calleeId: bId },
        { callerId: bId, calleeId: aId },
      ],
    },
  });
  for (const call of calls) await endCall(call.id, now);
}

/** 自分あてに鳴っている呼び出し（着信バナー用） */
export async function getIncomingCall(me: User, now = new Date()) {
  await expireStaleCalls(now);
  const call = await prisma.call.findFirst({
    where: { calleeId: me.id, status: "ringing" },
    include: { caller: true },
    orderBy: { createdAt: "desc" },
  });
  if (!call) return null;

  // ブロック済みの相手からの着信は出さない
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: me.id, blockedId: call.callerId },
        { blockerId: call.callerId, blockedId: me.id },
      ],
    },
  });
  if (blocked) return null;

  return call;
}
