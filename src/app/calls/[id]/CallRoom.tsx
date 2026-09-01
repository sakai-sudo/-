"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type Role = "caller" | "callee";
type Status = "ringing" | "active" | "ended" | "declined" | "missed" | "canceled";

const POLL_MS = 700;

// 本番では TURN サーバーが必須（携帯回線やNAT越えのため）。
// 環境変数で差し替えられるようにしておく。
const ICE_SERVERS: RTCIceServer[] = (
  process.env.NEXT_PUBLIC_STUN_URLS ?? "stun:stun.l.google.com:19302"
)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean)
  .map((urls) => ({ urls }));

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<Status, string> = {
  ringing: "呼び出しています…",
  active: "通話中",
  ended: "通話を終了しました",
  declined: "相手が応答できませんでした",
  missed: "応答がありませんでした",
  canceled: "発信をキャンセルしました",
};

export function CallRoom({
  callId,
  role,
  initialStatus,
  note,
  matchId,
  partner,
}: {
  callId: string;
  role: Role;
  initialStatus: Status;
  note: string;
  matchId: string;
  partner: { nickname: string; avatarSeed: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [connection, setConnection] = useState<"idle" | "connecting" | "connected">("idle");
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cursorRef = useRef(0);
  const offerSentRef = useRef(false);
  const remoteReadyRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const statusRef = useRef<Status>(initialStatus);
  const closedRef = useRef(false);

  const postSignal = useCallback(
    async (kind: string, payload: unknown) => {
      await fetch(`/api/calls/${callId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signal: { kind, payload: JSON.stringify(payload) } }),
      }).catch(() => undefined);
    },
    [callId],
  );

  const teardown = useCallback(() => {
    closedRef.current = true;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const hangUp = useCallback(
    async (action: "end" | "cancel") => {
      teardown();
      await fetch(`/api/calls/${callId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
        keepalive: true,
      }).catch(() => undefined);
      router.replace(`/matches/${matchId}`);
      router.refresh();
    },
    [callId, matchId, router, teardown],
  );

  /* ------------------------- マイクと PeerConnection ------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (audioRef.current) {
            audioRef.current.srcObject = event.streams[0];
            audioRef.current.play().catch(() => undefined);
          }
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) void postSignal("candidate", event.candidate.toJSON());
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") setConnection("connected");
          else if (pc.connectionState === "connecting") setConnection("connecting");
          else if (pc.connectionState === "failed") setError("接続できませんでした。電波の良い場所でもう一度お試しください。");
        };
      } catch {
        setError("マイクを使えませんでした。ブラウザのマイク許可を確認してください。");
      }
    }

    void setup();
    return () => {
      cancelled = true;
      teardown();
    };
  }, [postSignal, teardown]);

  /* ------------------------------ ポーリング ------------------------------ */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (closedRef.current) return;
      try {
        const res = await fetch(`/api/calls/${callId}?since=${cursorRef.current}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();

          if (data.status !== statusRef.current) {
            statusRef.current = data.status;
            setStatus(data.status);
          }

          // PeerConnection がまだ用意できていないときはカーソルを進めない。
          // 進めてしまうと offer を取りこぼして永久に接続できなくなる。
          const pc = pcRef.current;
          if (pc) {
            for (const signal of data.signals ?? []) {
              cursorRef.current = Math.max(cursorRef.current, signal.id);
              const payload = JSON.parse(signal.payload);
              if (signal.kind === "offer") {
                await pc.setRemoteDescription(payload);
                remoteReadyRef.current = true;
                await flushCandidates(pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await postSignal("answer", answer);
              } else if (signal.kind === "answer") {
                if (!pc.currentRemoteDescription) {
                  await pc.setRemoteDescription(payload);
                  remoteReadyRef.current = true;
                  await flushCandidates(pc);
                }
              } else if (signal.kind === "candidate") {
                if (remoteReadyRef.current) {
                  await pc.addIceCandidate(payload).catch(() => undefined);
                } else {
                  pendingCandidatesRef.current.push(payload);
                }
              }
            }

            // 承諾されたら発信側が offer を作る
            if (
              data.status === "active" &&
              role === "caller" &&
              !offerSentRef.current
            ) {
              offerSentRef.current = true;
              setConnection("connecting");
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await postSignal("offer", offer);
            }
            if (data.status === "active" && role === "callee") setConnection((c) => (c === "idle" ? "connecting" : c));
          }

          if (["ended", "declined", "missed", "canceled"].includes(data.status)) {
            teardown();
            return;
          }
        }
      } catch {
        // ネットワークが一瞬切れただけの可能性があるので、次のポーリングで復帰させる
      }
      timer = setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [callId, postSignal, role, teardown]);

  async function flushCandidates(pc: RTCPeerConnection) {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const c of pending) await pc.addIceCandidate(c).catch(() => undefined);
  }

  /* -------------------------------- 経過時間 ------------------------------- */
  useEffect(() => {
    if (connection !== "connected") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [connection]);

  /* ---------------------- ページを閉じたら通話も終わらせる --------------------- */
  useEffect(() => {
    function onUnload() {
      navigator.sendBeacon?.(
        `/api/calls/${callId}`,
        new Blob([JSON.stringify({ action: "end" })], { type: "application/json" }),
      );
    }
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, [callId]);

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  async function respond(action: "accept" | "decline") {
    const res = await fetch(`/api/calls/${callId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    if (!res) return;
    if (action === "decline") {
      teardown();
      router.replace(`/matches/${matchId}`);
      router.refresh();
    }
  }

  const finished = ["ended", "declined", "missed", "canceled"].includes(status);
  const needsAnswer = role === "callee" && status === "ringing";

  return (
    <div className="callroom">
      {/* 相手の音声。UIには出さない */}
      <audio ref={audioRef} autoPlay playsInline data-testid="remote-audio" />

      <div className="callroom-body">
        <Avatar seed={partner.avatarSeed} name={partner.nickname} size={104} />
        <h1 className="callroom-name">{partner.nickname}</h1>

        <p className="callroom-status" data-testid="call-status" data-status={status}>
          {status === "active" && connection === "connected"
            ? formatElapsed(elapsed)
            : status === "active"
              ? "接続しています…"
              : role === "callee" && status === "ringing"
                ? "着信中"
                : STATUS_LABEL[status]}
        </p>

        {note && status === "ringing" && (
          <p className="callroom-note">「{note}」と伝えています</p>
        )}

        {error && (
          <p className="notice notice-error" style={{ maxWidth: 340 }}>
            {error}
          </p>
        )}

        <p className="callroom-privacy">
          🔒 電話番号は相手に伝わりません。音声は端末どうしで直接やりとりされます。
        </p>
      </div>

      <div className="callroom-actions">
        {needsAnswer ? (
          <>
            <button className="btn btn-lg btn-hangup" type="button" onClick={() => respond("decline")}>
              見送る
            </button>
            <button className="btn btn-lg" type="button" onClick={() => respond("accept")}>
              📞 応答する
            </button>
          </>
        ) : finished ? (
          <button
            className="btn btn-lg"
            type="button"
            onClick={() => {
              router.replace(`/matches/${matchId}`);
              router.refresh();
            }}
          >
            トークに戻る
          </button>
        ) : (
          <>
            <button
              className={muted ? "btn btn-soft btn-lg" : "btn btn-ghost btn-lg"}
              type="button"
              onClick={toggleMute}
              disabled={status !== "active"}
            >
              {muted ? "🔇 ミュート中" : "🎙 ミュート"}
            </button>
            <button
              className="btn btn-lg btn-hangup"
              type="button"
              onClick={() => hangUp(status === "ringing" && role === "caller" ? "cancel" : "end")}
            >
              {status === "ringing" && role === "caller" ? "発信をやめる" : "通話を終了"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
