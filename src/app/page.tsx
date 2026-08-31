import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

const FEATURES = [
  {
    icon: "🗓️",
    title: "予定日の近さで探せる",
    body: "妊娠週数が近い人ほど上に出ます。つわり、健診、入院準備——今まさに同じことで悩んでいる相手が見つかります。",
  },
  {
    icon: "📍",
    title: "地域は市区町村まで",
    body: "産院や自治体のサービス、保活の話が通じる距離感。番地や本名は登録しません。",
  },
  {
    icon: "💛",
    title: "相互いいねで初めて話せる",
    body: "どちらもいいねを押すまでトークは始まりません。急かされずに、自分のペースで。",
  },
  {
    icon: "🛟",
    title: "通報・ブロックはワンタップ",
    body: "勧誘や根拠のない医療アドバイスはガイドライン違反。合わないと感じたらすぐ離れられます。",
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ need_login?: string; deactivated?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/discover");

  const params = await searchParams;
  const activeCount = await prisma.user.count({ where: { isActive: true } });

  return (
    <main className="page page-narrow">
      {params.need_login && (
        <p className="notice notice-warn" role="status">
          このページを見るにはログインが必要です。
        </p>
      )}
      {params.deactivated && (
        <p className="notice notice-info" role="status">
          退会手続きが完了しました。またいつでも戻ってきてください。
        </p>
      )}

      <section className="hero">
        <div className="hero-art" aria-hidden="true">
          🤝
        </div>
        <h1>{APP_TAGLINE}</h1>
        <p className="lede">
          {APP_NAME}は、出産予定日・地域・いまの状況が近い妊婦さん同士をつなぐアプリです。
          恋愛や出会いのためのサービスではありません。
        </p>
        <div className="stack" style={{ marginTop: 22 }}>
          <Link href="/signup" className="btn btn-lg btn-block">
            はじめる（無料・30秒）
          </Link>
          <Link href="/login" className="btn btn-ghost btn-block">
            登録済みの方はログイン
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: "0.8rem" }}>
          現在 {activeCount} 名が登録中（デモデータを含みます）
        </p>
      </section>

      <hr className="divider" />

      <div className="stack">
        {FEATURES.map((f) => (
          <div className="card feature" key={f.title}>
            <div className="feature-icon" aria-hidden="true">
              {f.icon}
            </div>
            <div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="notice notice-warn" style={{ marginTop: 20 }}>
        <strong>医療についての大切なお願い</strong>
        <br />
        ここで交わされるのは体験談であって、医学的な助言ではありません。
        体調の不安・出血・強い痛みなどがあるときは、SNSや本アプリで相談する前に、
        かかりつけの産婦人科か地域の救急相談窓口へご連絡ください。
      </div>

      <footer className="footnote">
        <Link href="/safety">安全に使うためのガイドライン</Link>
        <br />
        本アプリは開発中のプロトタイプです。表示されているプロフィールはすべて架空のサンプルデータです。
      </footer>
    </main>
  );
}
