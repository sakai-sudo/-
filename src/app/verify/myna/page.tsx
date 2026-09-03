import Link from "next/link";
import { redirect } from "next/navigation";
import { startMynaLink } from "@/lib/actions";
import { requireUser } from "@/lib/session";
import { dueMonthLabel } from "@/lib/pregnancy";
import { getMynaClient } from "@/lib/myna/client";
import { isVerified } from "@/lib/verification";

export const metadata = { title: "マイナポータル連携 — マタマッチ" };

export default async function MynaPage() {
  const me = await requireUser();
  if (isVerified(me)) redirect("/verify");
  const mode = getMynaClient().mode;

  return (
    <main className="page page-narrow">
      <Link href="/verify" className="btn btn-quiet">
        ← 戻る
      </Link>

      {mode === "mock" && (
        <div className="notice notice-warn">
          <strong>いまは開発用のモックで動いています。</strong>
          実際のマイナポータルには接続していません（利用申請の承認後、環境変数
          <code>MYNA_MODE=live</code> で本番に切り替わります）。
        </div>
      )}

      <div className="card">
        <h1 style={{ fontSize: "1.2rem" }}>マイナポータルで確認する</h1>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-2)" }}>
          このあとマイナポータルの画面に移り、マイナンバーカードでの本人確認とご本人の同意のうえで、
          お住まいの自治体が持つ次の情報を受け取ります。
        </p>

        <ul className="myna-list">
          <li>
            <strong>妊婦健康診査の受診記録</strong>
            <span className="hint">受診日。いま妊娠中であることの確認に使います。</span>
          </li>
          <li>
            <strong>分娩予定日</strong>
            <span className="hint">
              現在の登録は「{dueMonthLabel(me.dueDate)}ごろ」です。記録と食い違っていれば、記録のほうに合わせて更新します。
            </span>
          </li>
        </ul>

        <div className="notice notice-info">
          受け取るのは上の2点だけです。<strong>氏名・住所・マイナンバーは受け取りません。</strong>
          健診結果の中身もマタマッチには保存しません。
        </div>

        <p className="hint">
          保存するのは「確認した日」「確認方法」「確認できた出産予定日」の3点だけで、
          出産予定日から8週後に自動的に失効します。
        </p>

        <form action={startMynaLink}>
          <button className="btn btn-lg btn-block" type="submit">
            マイナポータルへ進む
          </button>
        </form>
        <Link href="/verify" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
          やめる
        </Link>
      </div>

      <p className="footnote">
        自治体が母子保健情報の連携に対応していない場合は、この方法では確認できません。
        その場合は<Link href="/verify">母子健康手帳での確認</Link>をご利用ください。
      </p>
    </main>
  );
}
