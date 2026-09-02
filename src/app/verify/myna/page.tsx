import Link from "next/link";
import { linkMynaPortal } from "@/lib/actions";
import { requireUser } from "@/lib/session";
import { dueMonthLabel } from "@/lib/pregnancy";

export const metadata = { title: "マイナポータル連携 — マタマッチ" };

/**
 * プロトタイプのモック画面。
 * 本番ではここでマイナポータルの認可画面に飛ばし、自己情報取得APIで
 * 妊婦健診情報（分娩予定日を含む）を取得して確認する。
 */
export default async function MynaPage() {
  const me = await requireUser();

  return (
    <main className="page page-narrow">
      <Link href="/verify" className="btn btn-quiet">
        ← 戻る
      </Link>

      <div className="notice notice-warn">
        <strong>これはプロトタイプのモック画面です。</strong>
        実際のマイナポータルには接続していません。「同意して連携する」を押すと、確認できたことにして次に進みます。
      </div>

      <div className="card">
        <h1 style={{ fontSize: "1.2rem" }}>マタマッチに情報を提供します</h1>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-2)" }}>
          マイナポータルの自己情報取得APIを通じて、お住まいの自治体が保有する次の情報を取得します。
        </p>

        <ul className="myna-list">
          <li>
            <strong>妊婦健康診査の受診記録</strong>
            <span className="hint">受診日と受診券の情報。妊娠中であることの確認に使います。</span>
          </li>
          <li>
            <strong>分娩予定日</strong>
            <span className="hint">
              現在の登録は「{dueMonthLabel(me.dueDate)}ごろ」です。取得した値と照合します。
            </span>
          </li>
        </ul>

        <div className="notice notice-info">
          取得するのは上の2点だけです。<strong>氏名・住所・マイナンバーは受け取りません。</strong>
          健診結果の詳細もマタマッチには保存しません。
        </div>

        <p className="hint">
          保存されるのは「確認した日」「確認方法」「照合できた出産予定日」の3点で、
          出産予定日から8週後に自動的に失効します。
        </p>

        <form action={linkMynaPortal}>
          <button className="btn btn-lg btn-block" type="submit">
            同意して連携する
          </button>
        </form>
        <Link href="/verify" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
          やめる
        </Link>
      </div>
    </main>
  );
}
