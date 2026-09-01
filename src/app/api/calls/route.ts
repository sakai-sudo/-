import { NextResponse } from "next/server";
import { createCall } from "@/lib/calls";
import { getCurrentUser } from "@/lib/session";

/** 通話をリクエストする（相手にはまだ音声はつながらない。呼び出しが鳴るだけ） */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const matchId = typeof body?.matchId === "string" ? body.matchId : "";
  const note = typeof body?.note === "string" ? body.note : "";
  if (!matchId) return NextResponse.json({ error: "matchId is required" }, { status: 400 });

  const result = await createCall(me, matchId, note);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ callId: result.callId });
}
