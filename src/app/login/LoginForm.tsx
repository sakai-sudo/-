"use client";

import { useActionState } from "react";
import { logIn } from "@/lib/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(logIn, { ok: false });
  return (
    <form action={formAction} noValidate>
      {state.message && (
        <p className="notice notice-error" role="status">
          {state.message}
        </p>
      )}
      <div className="field">
        <label className="label" htmlFor="email">
          登録したメールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <span className="hint">
          プロトタイプのためパスワードはありません。本番では必ず認証を追加してください。
        </span>
      </div>
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
