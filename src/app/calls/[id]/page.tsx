import { notFound } from "next/navigation";
import { CallRoom } from "./CallRoom";
import { prisma } from "@/lib/db";
import { expireStaleCalls } from "@/lib/calls";
import { requireUser } from "@/lib/session";

export const metadata = { title: "通話 — マタマッチ" };

export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  await expireStaleCalls();

  const call = await prisma.call.findFirst({
    where: { id, OR: [{ callerId: me.id }, { calleeId: me.id }] },
    include: { caller: true, callee: true },
  });
  if (!call) notFound();

  const isCaller = call.callerId === me.id;
  const partner = isCaller ? call.callee : call.caller;

  return (
    <main className="page" style={{ paddingBottom: "calc(var(--nav-h) + 24px)" }}>
      <CallRoom
        callId={call.id}
        role={isCaller ? "caller" : "callee"}
        initialStatus={call.status as "ringing" | "active" | "ended"}
        note={call.note}
        matchId={call.matchId}
        partner={{ nickname: partner.nickname, avatarSeed: partner.avatarSeed }}
      />
    </main>
  );
}
