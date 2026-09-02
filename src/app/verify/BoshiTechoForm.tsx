"use client";

import { useActionState, useState } from "react";
import { submitBoshiTecho } from "@/lib/actions";

export function BoshiTechoForm() {
  const [state, formAction, pending] = useActionState(submitBoshiTecho, { ok: false });
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={formAction}>
      {state.message && (
        <p className="notice notice-error" role="status">
          {state.message}
        </p>
      )}

      <div className="masking-guide" aria-hidden="true">
        <div className="masking-page">
          <span className="masking-block">氏名・住所は隠す</span>
          <span className="masking-keep">出産予定日</span>
          <span className="masking-block">交付番号は隠す</span>
        </div>
      </div>

      <ol className="hint" style={{ paddingLeft: "1.2em", lineHeight: 2 }}>
        <li>母子健康手帳の<strong>「出産予定日」が書かれたページ</strong>を開く</li>
        <li>氏名・住所・交付番号を<strong>紙などで隠す</strong></li>
        <li>予定日の部分が読めるように1枚だけ撮る</li>
      </ol>

      <div className="field">
        <label className="label" htmlFor="evidence">
          画像を選ぶ
        </label>
        <input
          id="evidence"
          name="evidence"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        {fileName && <span className="hint">選択中: {fileName}</span>}
      </div>

      <label className="check" style={{ marginBottom: 14 }}>
        <input type="checkbox" name="masked" required />
        <span>氏名・住所・交付番号を隠したうえで撮影しました</span>
      </label>

      <p className="notice notice-warn">
        送っていただいた画像は審査のあいだだけ預かり、<strong>結果が出た時点で削除します。</strong>
        保存するのは「いつ・どの方法で確認したか」と出産予定日だけです。
      </p>

      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "送信中…" : "確認を申請する"}
      </button>
    </form>
  );
}
