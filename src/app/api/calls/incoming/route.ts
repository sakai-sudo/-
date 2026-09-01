import { NextResponse } from "next/server";
import { getIncomingCall } from "@/lib/calls";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 着信バナー用のポーリング先。鳴っている呼び出しがなければ null を返す */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ call: null });

  const call = await getIncomingCall(me);
  if (!call) return NextResponse.json({ call: null });

  return NextResponse.json({
    call: {
      id: call.id,
      note: call.note,
      createdAt: call.createdAt.toISOString(),
      caller: {
        id: call.caller.id,
        nickname: call.caller.nickname,
        avatarSeed: call.caller.avatarSeed,
      },
    },
  });
}
