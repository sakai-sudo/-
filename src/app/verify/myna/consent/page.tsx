import Link from "next/link";
import { notFound } from "next/navigation";
import { getMynaClient } from "@/lib/myna/client";
import { MOCK_SCENARIOS, buildMockCode, type MockScenario } from "@/lib/myna/mock";
import { requireUser } from "@/lib/session";

export const metadata = { title: "（モック）マイナポータル — マタマッチ" };

/**
 * 本物の認可画面の代わりに出す、開発用の擬似同意画面。
 * MYNA_MODE=live のときは存在しない扱いにする。
 */
export default async function MockConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (getMynaClient().mode !== "mock") notFound();

  const me = await requireUser();
  const { state } = await searchParams;
  if (!state) notFound();

  const href = (scenario: MockScenario) =>
    `/verify/myna/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(
      buildMockCode(scenario, me.dueDate),
    )}`;

  return (
    <main className="page page-narrow">
      <div className="mock-chrome">
        <span className="mock-chrome-label">開発用モック</span>
        マイナポータル（本物ではありません）
      </div>

      <div className="card">
        <h1 style={{ fontSize: "1.1rem" }}>マタマッチに情報を提供しますか？</h1>
        <p className="hint">
          本番ではこの画面でマイナンバーカードを読み取り、本人確認と同意を行います。
        </p>

        <ul className="myna-list">
          <li>
            <strong>妊婦健康診査の受診記録</strong>
          </li>
          <li>
            <strong>分娩予定日</strong>
          </li>
        </ul>

        {/* next/link はプリフェッチで GET を先に実行してしまい state を消費するので、素の a を使う */}
        <a className="btn btn-lg btn-block" href={href("ok")}>
          同意して情報を提供する
        </a>
        <Link className="btn btn-ghost btn-block" href="/verify" style={{ marginTop: 8 }}>
          同意しない
        </Link>
      </div>

      <div className="section-title">
        <h2>他の結果を試す</h2>
        <span className="count">動作確認用</span>
      </div>
      <p className="hint">
        自治体の対応状況や記録の内容によって結果が変わります。実装を触らずに各分岐を確認できます。
      </p>
      <div className="stack">
        {(Object.keys(MOCK_SCENARIOS) as MockScenario[])
          .filter((s) => s !== "ok")
          .map((scenario) => (
            <a key={scenario} href={href(scenario)} className="list-item">
              <span className="grow">
                <span className="list-title">{MOCK_SCENARIOS[scenario]}</span>
                <span className="list-sub" style={{ display: "block" }}>
                  {scenario}
                </span>
              </span>
              <span className="badge badge-outline">試す</span>
            </a>
          ))}
      </div>
    </main>
  );
}
