import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  acceptCall,
  cancelCall,
  declineCall,
  endCall,
  expireStaleCalls,
} from "@/lib/calls";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function loadCall(callId: string, userId: string) {
  const call = await prisma.call.findFirst({
    where: {
      id: callId,
      OR: [{ callerId: userId }, { calleeId: userId }],
    },
  });
  return call;
}

/**
 * 通話の状態と、まだ受け取っていないシグナル（SDP / ICE）をまとめて返す。
 * クライアントはこれを短い間隔でポーリングする。
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await expireStaleCalls();

  const call = await loadCall(id, me.id);
  if (!call) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const since = Number.parseInt(
    new URL(request.url).searchParams.get("since") ?? "0",
    10,
  );

  // 自分が送ったシグナルは読み飛ばす
  const signals = await prisma.callSignal.findMany({
    where: { callId: id, id: { gt: Number.isFinite(since) ? since : 0 }, fromId: { not: me.id } },
    orderBy: { id: "asc" },
    take: 100,
  });

  return NextResponse.json({
    status: call.status,
    role: call.callerId === me.id ? "caller" : "callee",
    answeredAt: call.answeredAt?.toISOString() ?? null,
    durationSec: call.durationSec,
    signals: signals.map((s) => ({ id: s.id, kind: s.kind, payload: s.payload })),
  });
}

/** 応答・辞退・終了と、WebRTC シグナルの送信 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const call = await loadCall(id, me.id);
  if (!call) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => null);

  if (body?.signal) {
    const kind = String(body.signal.kind ?? "");
    const payload = String(body.signal.payload ?? "");
    if (!["offer", "answer", "candidate"].includes(kind) || !payload) {
      return NextResponse.json({ error: "bad_signal" }, { status: 400 });
    }
    if (call.status !== "active") {
      return NextResponse.json({ error: "not_active" }, { status: 409 });
    }
    await prisma.callSignal.create({
      data: { callId: id, fromId: me.id, kind, payload },
    });
    return NextResponse.json({ ok: true });
  }

  switch (body?.action) {
    case "accept":
      if (call.calleeId !== me.id)
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      await acceptCall(id);
      break;
    case "decline":
      if (call.calleeId !== me.id)
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      await declineCall(id);
      break;
    case "cancel":
      if (call.callerId !== me.id)
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      await cancelCall(id);
      break;
    case "end":
      await endCall(id);
      break;
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }

  const updated = await prisma.call.findUnique({ where: { id } });
  return NextResponse.json({ status: updated?.status ?? "ended" });
}
