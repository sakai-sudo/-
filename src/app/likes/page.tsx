import Link from "next/link";
import { CandidateCard } from "@/components/CandidateCard";
import { getPendingLikes, getSentLikes } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = { title: "いいね — マタマッチ" };

export default async function LikesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requireUser();
  const { tab } = await searchParams;
  const activeTab = tab === "sent" ? "sent" : "received";

  const [received, sent] = await Promise.all([getPendingLikes(me), getSentLikes(me)]);
  const list = activeTab === "sent" ? sent : received;

  return (
    <main className="page">
      <h1>いいね</h1>

      <nav className="tabs" aria-label="いいねの種類">
        <Link href="/likes" data-active={activeTab === "received"}>
          もらった（{received.length}）
        </Link>
        <Link href="/likes?tab=sent" data-active={activeTab === "sent"}>
          送った（{sent.length}）
        </Link>
      </nav>

      {activeTab === "received" ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          いいねを返すとトークが始まります。返さなければ相手には何も伝わりません。
        </p>
      ) : (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          相手が返してくれるまで、あなたがいいねしたことは相手の「もらった」に表示されます。
        </p>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">
            💛
          </span>
          {activeTab === "received"
            ? "まだいいねは届いていません。プロフィールのタグを増やすと見つけてもらいやすくなります。"
            : "まだいいねを送っていません。"}
          <div style={{ marginTop: 14 }}>
            <Link href="/discover" className="btn btn-soft btn-sm">
              妊婦さんをさがす
            </Link>
          </div>
        </div>
      ) : (
        <div className="stack">
          {list.map((c) => (
            <CandidateCard
              key={c.user.id}
              user={c.user}
              match={c.match}
              from={activeTab === "sent" ? "/likes?tab=sent" : "/likes"}
              variant={activeTab === "sent" ? "sent" : "received"}
            />
          ))}
        </div>
      )}
    </main>
  );
}
