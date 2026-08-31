"use client";

import { useActionState } from "react";
import { blockUser, reportUser } from "@/lib/actions";
import { REPORT_REASONS } from "@/lib/constants";

export function ReportPanel({
  targetId,
  targetName,
}: {
  targetId: string;
  targetName: string;
}) {
  const [state, formAction, pending] = useActionState(reportUser, { ok: false });

  return (
    <details className="card card-tight">
      <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "0.88rem" }}>
        通報・ブロック
      </summary>

      <p className="hint" style={{ marginTop: 10 }}>
        勧誘、根拠のない医療アドバイス、攻撃的な言動などを見つけたら教えてください。
        通報したことは相手に通知されません。
      </p>

      {state.message && (
        <p className={state.ok ? "notice notice-ok" : "notice notice-error"} role="status">
          {state.message}
        </p>
      )}

      {!state.ok && (
        <form action={formAction}>
          <input type="hidden" name="targetId" value={targetId} />
          <div className="field">
            <label className="label" htmlFor="reason">
              理由
            </label>
            <select id="reason" name="reason" defaultValue="" required>
              <option value="">選択してください</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="detail">
              詳しい状況（任意）
            </label>
            <textarea id="detail" name="detail" maxLength={1000} rows={3} />
          </div>
          <label className="check" style={{ marginBottom: 12 }}>
            <input type="checkbox" name="alsoBlock" defaultChecked />
            <span>あわせて{targetName}さんをブロックする</span>
          </label>
          <button className="btn btn-accent btn-sm" type="submit" disabled={pending}>
            {pending ? "送信中…" : "通報する"}
          </button>
        </form>
      )}

      <hr className="divider" />

      <form
        action={blockUser}
        onSubmit={(e) => {
          if (
            !confirm(
              `${targetName}さんをブロックします。おすすめ一覧から相互に表示されなくなり、いいねとトークも解除されます。よろしいですか？`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="targetId" value={targetId} />
        <button className="btn btn-ghost btn-sm" type="submit">
          通報せずにブロックだけする
        </button>
      </form>
    </details>
  );
}
