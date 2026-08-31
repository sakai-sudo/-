import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { getMatchSummaries } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { pregnancyStage } from "@/lib/pregnancy";

export const metadata = { title: "トーク — マタマッチ" };

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default async function MatchesPage() {
  const me = await requireUser();
  const matches = await getMatchSummaries(me);

  return (
    <main className="page">
      <h1>トーク</h1>

      {matches.length === 0 ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">
            💬
          </span>
          まだマッチした相手がいません。
          <br />
          お互いに「いいね」を送るとここにトークが並びます。
          <div style={{ marginTop: 14 }}>
            <Link href="/discover" className="btn btn-soft btn-sm">
              妊婦さんをさがす
            </Link>
          </div>
        </div>
      ) : (
        <div className="stack">
          {matches.map((m) => {
            const stage = pregnancyStage(m.partner.dueDate);
            return (
              <Link key={m.id} href={`/matches/${m.id}`} className="list-item">
                <Avatar seed={m.partner.avatarSeed} name={m.partner.nickname} size={46} />
                <div className="grow">
                  <div className="row-between">
                    <span className="list-title">{m.partner.nickname}</span>
                    <span className="muted" style={{ fontSize: "0.72rem" }}>
                      {timeAgo(m.lastMessage?.createdAt ?? m.createdAt)}
                    </span>
                  </div>
                  <div className="list-sub">
                    {m.lastMessage
                      ? `${m.lastMessage.fromMe ? "あなた: " : ""}${m.lastMessage.body}`
                      : `${stage.label} ・ ${m.partner.prefecture}${m.partner.city}`}
                  </div>
                </div>
                {m.messageCount === 0 && <span className="badge badge-accent">NEW</span>}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
