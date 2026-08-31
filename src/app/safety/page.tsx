import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `安全に使うために — ${APP_NAME}` };

const RULES = [
  {
    title: "医療の判断はここでしない",
    body: "出血・強い腹痛・胎動が感じられないなど気になる症状があるときは、アプリで相談する前にかかりつけの産婦人科、または地域の救急相談窓口へ連絡してください。ここでのやりとりはあくまで体験談の共有です。",
  },
  {
    title: "断定的な医療アドバイスは書かない・信じない",
    body: "「その薬は飲まないほうがいい」「その症状は大丈夫」といった断定は、相手の状況を知らないままでは危険です。見かけたら通報してください。",
  },
  {
    title: "個人が特定される情報は交換しない",
    body: "住所・勤務先・通っている産院の予約時間・SNSのIDなどは、信頼関係ができるまで伏せておくのが安全です。ニックネームでのやりとりで十分に話せます。",
  },
  {
    title: "実際に会うときは、人のいる場所で・短時間で",
    body: "会うのは体調の良い日に、日中の人の多いカフェなどで。家族に行き先を伝えてから出かけてください。無理な誘いは断って構いません。",
  },
  {
    title: "勧誘・営業はすべて違反",
    body: "商品販売、セミナー、宗教・政治への誘い、副業の紹介はガイドライン違反です。マルチ商法の勧誘は妊娠中のコミュニティで実際に起きています。少しでも怪しいと感じたらブロックしてください。",
  },
  {
    title: "つらい話をしなくていい",
    body: "流産・死産・持病など、話したくないことは書かなくて構いません。相手に聞かれても答える義務はありません。",
  },
];

export default function SafetyPage() {
  return (
    <main className="page page-narrow">
      <h1>安全に使うためのガイドライン</h1>
      <p className="muted" style={{ fontSize: "0.88rem" }}>
        {APP_NAME}は、妊娠中の不安を分かち合える相手を見つけるための場所です。
        恋愛・出会い・ビジネス目的での利用は禁止しています。
      </p>

      <div className="notice notice-warn" style={{ margin: "16px 0" }}>
        <strong>緊急時は迷わず医療機関へ</strong>
        <br />
        判断に迷うときは、母子健康手帳に記載されたかかりつけ産科の連絡先、
        または自治体の救急相談窓口（多くの地域で #7119 / 小児は #8000）を利用してください。
      </div>

      <div className="stack">
        {RULES.map((rule, i) => (
          <div className="card" key={rule.title}>
            <h2 style={{ fontSize: "1rem" }}>
              <span className="badge badge-primary" style={{ marginRight: 6 }}>
                {i + 1}
              </span>
              {rule.title}
            </h2>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--ink-2)" }}>
              {rule.body}
            </p>
          </div>
        ))}
      </div>

      <div className="section-title">
        <h2>困ったときは</h2>
      </div>
      <p style={{ fontSize: "0.88rem" }}>
        相手のプロフィール画面またはトーク画面の「通報・ブロック」から、いつでも報告できます。
        通報したことは相手に通知されません。ブロックすると、おすすめ一覧から相互に表示されなくなり、
        いいねとトークも解除されます。
      </p>

      <p className="footnote">
        <Link href="/discover">アプリに戻る</Link>
      </p>
    </main>
  );
}
