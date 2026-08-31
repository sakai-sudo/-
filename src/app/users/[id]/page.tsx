import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ScoreRing } from "@/components/ScoreRing";
import { TagList } from "@/components/TagList";
import { WeekBar } from "@/components/WeekBar";
import { ReportPanel } from "@/components/ReportPanel";
import { sendLike } from "@/lib/actions";
import { AGE_GROUP_LABEL, BIRTH_ORDER_LABEL } from "@/lib/constants";
import { scoreLabel, scoreMatch } from "@/lib/matching";
import { dueInLabel, dueMonthLabel, pregnancyStage } from "@/lib/pregnancy";
import { getVisibleUser } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  const visible = await getVisibleUser(me, id);
  if (!visible) notFound();

  const { user, iLiked, likedMe, matchId } = visible;
  const match = scoreMatch(me, user);
  const stage = pregnancyStage(user.dueDate);

  return (
    <main className="page page-narrow">
      <Link href="/discover" className="btn btn-quiet" style={{ marginBottom: 8 }}>
        ← さがすに戻る
      </Link>

      <div className="card">
        <div className="profile-hero">
          <Avatar seed={user.avatarSeed} name={user.nickname} size={66} />
          <div className="grow">
            <h1 className="profile-name">{user.nickname}</h1>
            <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
              {user.prefecture} {user.city}
            </p>
          </div>
          <ScoreRing score={match.score} size={62} />
        </div>

        <div className="wrap" style={{ marginTop: 14 }}>
          <span className="badge badge-accent">{scoreLabel(match.score)}</span>
          {match.reasons.map((r) => (
            <span
              key={`${r.kind}-${r.label}`}
              className={r.strong ? "badge badge-primary" : "badge"}
            >
              {r.label}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <strong>{stage.label}</strong>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              {stage.trimesterLabel} ・ {dueInLabel(user.dueDate)}
            </span>
          </div>
          <WeekBar weeks={stage.weeks} />
        </div>

        <dl className="meta-grid" style={{ marginTop: 16 }}>
          <div className="meta-item">
            <dt>出産予定</dt>
            <dd>{dueMonthLabel(user.dueDate)}ごろ</dd>
          </div>
          <div className="meta-item">
            <dt>今回の出産</dt>
            <dd>{BIRTH_ORDER_LABEL[user.birthOrder] ?? "-"}</dd>
          </div>
          <div className="meta-item">
            <dt>年代</dt>
            <dd>{AGE_GROUP_LABEL[user.ageGroup] ?? "-"}</dd>
          </div>
          <div className="meta-item">
            <dt>会うことについて</dt>
            <dd>{user.wantMeetup ? "前向き" : "オンラインのみ希望"}</dd>
          </div>
        </dl>

        {user.bio && (
          <>
            <div className="section-title">
              <h2>自己紹介</h2>
            </div>
            <p className="bio">{user.bio}</p>
          </>
        )}

        <div className="section-title">
          <h2>関心タグ</h2>
          {match.sharedInterests.length > 0 && (
            <span className="count">◎ が共通のタグ</span>
          )}
        </div>
        <TagList interests={user.interests} highlight={match.sharedInterests} />

        <div style={{ marginTop: 20 }}>
          {matchId ? (
            <Link href={`/matches/${matchId}`} className="btn btn-block">
              💬 トークを開く
            </Link>
          ) : iLiked ? (
            <button className="btn btn-block" type="button" disabled>
              いいね送信済み — 相手の返事を待っています
            </button>
          ) : (
            <form action={sendLike}>
              <input type="hidden" name="targetId" value={user.id} />
              <input type="hidden" name="from" value={`/users/${user.id}`} />
              <button className="btn btn-lg btn-block" type="submit">
                💛 {likedMe ? "いいねを返してトークを始める" : "いいねを送る"}
              </button>
            </form>
          )}
          {likedMe && !matchId && (
            <p className="notice notice-info" style={{ marginTop: 10 }}>
              {user.nickname}さんから、あなたにいいねが届いています。
            </p>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <ReportPanel targetId={user.id} targetName={user.nickname} />
      </div>

      <p className="footnote">
        プロフィールに書かれている内容は本人の申告です。医療的な判断は必ず主治医にご相談ください。
      </p>
    </main>
  );
}
