"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "./Avatar";

type Incoming = {
  id: string;
  note: string;
  caller: { id: string; nickname: string; avatarSeed: string };
};

const POLL_MS = 3000;

/**
 * どの画面にいても着信に気づけるようにするバナー。
 * プッシュ通知はネイティブアプリ側の課題なので、Web ではポーリングで代用している。
 */
export function IncomingCallWatcher() {
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const onCallScreen = pathname.startsWith("/calls/");

  useEffect(() => {
    if (onCallScreen) {
      setIncoming(null);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    async function tick() {
      try {
        const res = await fetch("/api/calls/incoming", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!stopped) setIncoming(data.call ?? null);
        }
      } catch {
        // 一時的な失敗は次回のポーリングで拾う
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [onCallScreen]);

  if (!incoming || onCallScreen) return null;

  async function respond(action: "accept" | "decline") {
    if (!incoming || busy) return;
    setBusy(true);
    await fetch(`/api/calls/${incoming.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => undefined);
    if (action === "accept") {
      router.push(`/calls/${incoming.id}`);
    } else {
      setIncoming(null);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="incoming" role="alert" data-testid="incoming-call">
      <div className="row">
        <Avatar seed={incoming.caller.avatarSeed} name={incoming.caller.nickname} size={44} />
        <div className="grow">
          <strong>{incoming.caller.nickname}さんから着信</strong>
          <div className="list-sub">
            {incoming.note ? `「${incoming.note}」` : "アプリ内通話（電話番号は伝わりません）"}
          </div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button
          className="btn btn-ghost btn-sm grow"
          type="button"
          onClick={() => respond("decline")}
          disabled={busy}
        >
          見送る
        </button>
        <button
          className="btn btn-sm grow"
          type="button"
          onClick={() => respond("accept")}
          disabled={busy}
        >
          📞 応答する
        </button>
      </div>
    </div>
  );
}
