import Link from "next/link";
import { BoshiTechoForm } from "./BoshiTechoForm";
import { requireUser } from "@/lib/session";
import {
  VERIFICATION_METHOD_LABEL,
  expireStaleVerifications,
  isVerified,
} from "@/lib/verification";
import { dueMonthLabel } from "@/lib/pregnancy";

export const metadata = { title: "妊婦確認 — マタマッチ" };

function formatDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{
    done?: string;
    due_updated?: string;
    myna_error?: string;
    suggest?: string;
  }>;
}) {
  await expireStaleVerifications();
  const me = await requireUser();
  const params = await searchParams;
  const { done } = params;
  const verified = isVerified(me);

  return (
    <main className="page page-narrow">
      <h1>妊婦であることの確認</h1>

      {done === "myna" && (
        <p className="notice notice-ok" role="status">
          マイナポータル連携で確認できました。ありがとうございます。
          {params.due_updated === "1" &&
            " 自治体の記録に合わせて、出産予定日を更新しました。"}
        </p>
      )}
      {params.myna_error && (
        <p className="notice notice-error" role="status">
          {params.myna_error}
          {params.suggest === "boshi" && (
            <>
              <br />
              下の<strong>方法2（母子健康手帳）</strong>でも確認できます。
            </>
          )}
        </p>
      )}
      {done === "submitted" && (
        <p className="notice notice-ok" role="status">
          申請を受け付けました。運営が確認しだい、バッジが付きます。
        </p>
      )}

      {/* ---------------------------- いまの状態 ---------------------------- */}
      <div className="card">
        <div className="row-between">
          <strong>いまの状態</strong>
          {verified ? (
            <span className="badge badge-primary">✓ 妊婦確認済み</span>
          ) : me.verificationStatus === "pending" ? (
            <span className="badge badge-gold">確認中</span>
          ) : (
            <span className="badge badge-outline">未確認</span>
          )}
        </div>

        {verified && (
          <dl className="meta-grid" style={{ marginTop: 12 }}>
            <div className="meta-item">
              <dt>確認方法</dt>
              <dd>{VERIFICATION_METHOD_LABEL[me.verificationMethod ?? ""] ?? "-"}</dd>
            </div>
            <div className="meta-item">
              <dt>有効期限</dt>
              <dd style={{ fontSize: "0.9rem" }}>
                {me.verificationExpiresAt ? formatDate(me.verificationExpiresAt) : "-"}
              </dd>
            </div>
          </dl>
        )}

        {verified && (
          <p className="hint" style={{ marginTop: 10 }}>
            出産予定日（{dueMonthLabel(me.dueDate)}）から8週で自動的に失効します。産後は育児期のモードに切り替わります。
          </p>
        )}

        {me.verificationStatus === "rejected" && (
          <p className="notice notice-error" style={{ marginTop: 12 }}>
            前回の申請は確認できませんでした。予定日のページが読み取れているか確かめて、もう一度お試しください。
          </p>
        )}
        {me.verificationStatus === "expired" && (
          <p className="notice notice-warn" style={{ marginTop: 12 }}>
            確認の有効期限が切れました。出産後の方は、育児期のプロフィールに切り替えてご利用ください。
          </p>
        )}
      </div>

      {/* --------------------------- 何が変わるのか --------------------------- */}
      <div className="section-title">
        <h2>確認すると何が変わる？</h2>
      </div>
      <div className="card card-tight">
        <table className="compare">
          <thead>
            <tr>
              <th />
              <th>未確認</th>
              <th>確認済み</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>プロフィール閲覧・いいね</td>
              <td className="yes">○</td>
              <td className="yes">○</td>
            </tr>
            <tr>
              <td>トーク</td>
              <td className="yes">○</td>
              <td className="yes">○</td>
            </tr>
            <tr>
              <td>アプリ内通話</td>
              <td className="no">×</td>
              <td className="yes">○</td>
            </tr>
            <tr>
              <td>確認済みの人だけに絞る設定</td>
              <td className="no">×</td>
              <td className="yes">○</td>
            </tr>
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 10 }}>
          確認は登録の条件ではありません。未確認のままでも探す・いいね・トークはできます。
          声が残らない通話だけは、確認できた方同士に限っています。
        </p>
      </div>

      {!verified && me.verificationStatus !== "pending" && (
        <>
          {/* ------------------------- マイナポータル ------------------------- */}
          <div className="section-title">
            <h2>方法1：マイナポータル連携</h2>
            <span className="count">おすすめ・写真不要</span>
          </div>
          <div className="card">
            <p style={{ margin: "0 0 10px", fontSize: "0.9rem" }}>
              自治体が持っている<strong>妊婦健診の情報</strong>をマイナポータル経由で確認します。
              画像を送る必要がなく、<strong>氏名や住所をこちらに預けずに済みます。</strong>
            </p>
            <p className="hint">
              お住まいの自治体が母子保健情報の連携に対応している場合に使えます。対応していない場合は方法2をお使いください。
            </p>
            <Link href="/verify/myna" className="btn btn-block" style={{ marginTop: 8 }}>
              マイナポータルで確認する
            </Link>
          </div>

          {/* --------------------------- 母子手帳 --------------------------- */}
          <div className="section-title">
            <h2>方法2：母子健康手帳</h2>
            <span className="count">全国で使えます</span>
          </div>
          <div className="card">
            <BoshiTechoForm />
          </div>
        </>
      )}

      {me.verificationStatus === "pending" && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            申請を確認しています。結果が出るまで少しお時間をください。
          </p>
          <p className="hint" style={{ marginTop: 8 }}>
            お預かりした画像は、結果が出た時点で削除します。
          </p>
        </div>
      )}

      <p className="footnote">
        この確認は「いま妊娠中の方だけが集まる場」を保つためのものです。
        <Link href="/safety">安全に使うためのガイドライン</Link>
      </p>
    </main>
  );
}
