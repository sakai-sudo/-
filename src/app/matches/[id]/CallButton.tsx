"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_NOTES = ["少しだけ話せませんか？", "15分ほど話したいです", "つわりの話を聞きたくて"];

/**
 * 通話は「かける」前にひとこと添えられるようにしている。
 * 妊娠中は体調が読めないので、相手が出るかどうかを判断する材料を渡したい。
 */
export function CallButton({
  matchId,
  partnerName,
  available,
  unavailableReason,
}: {
  matchId: string;
  partnerName: string;
  available: boolean;
  unavailableReason: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(PRESET_NOTES[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId, note }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "いま発信できませんでした。時間をおいてお試しください。");
      setBusy(false);
      return;
    }
    const data = await res.json();
    router.push(`/calls/${data.callId}`);
  }

  if (!available) {
    return (
      <button className="btn btn-ghost btn-sm" type="button" disabled title={unavailableReason}>
        📞 通話不可
      </button>
    );
  }

  return (
    <>
      <button className="btn btn-soft btn-sm" type="button" onClick={() => setOpen(true)}>
        📞 通話
      </button>

      {open && (
        <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="通話をリクエスト">
          <div className="sheet">
            <h2 style={{ fontSize: "1.05rem" }}>{partnerName}さんに通話をリクエスト</h2>
            <p className="hint">
              電話番号は交換されません。相手が応答してはじめて音声がつながります。
            </p>

            <div className="field">
              <span className="label">ひとこと添える</span>
              <div className="wrap">
                {PRESET_NOTES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="tag-toggle"
                    onClick={() => setNote(n)}
                    style={
                      note === n
                        ? { borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary-strong)" }
                        : undefined
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={note}
                maxLength={60}
                onChange={(e) => setNote(e.target.value)}
                aria-label="呼び出しに添える一言"
              />
            </div>

            {error && <p className="notice notice-error">{error}</p>}

            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn-ghost grow"
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                やめる
              </button>
              <button className="btn grow" type="button" onClick={start} disabled={busy}>
                {busy ? "発信中…" : "📞 呼び出す"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
