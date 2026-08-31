import Link from "next/link";
import type { User } from "@prisma/client";
import { Avatar } from "./Avatar";
import { ScoreRing } from "./ScoreRing";
import { TagList } from "./TagList";
import { cancelLike, passLike, sendLike } from "@/lib/actions";
import { BIRTH_ORDER_LABEL } from "@/lib/constants";
import { dueInLabel, pregnancyStage } from "@/lib/pregnancy";
import { scoreLabel, type MatchScore } from "@/lib/matching";

export function CandidateCard({
  user,
  match,
  from,
  variant = "discover",
}: {
  user: User;
  match: MatchScore;
  from: string;
  variant?: "discover" | "received" | "sent";
}) {
  const stage = pregnancyStage(user.dueDate);

  return (
    <article className="card">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <Avatar seed={user.avatarSeed} name={user.nickname} size={52} />
        <div className="grow">
          <div className="row-between">
            <Link href={`/users/${user.id}`} style={{ color: "inherit" }}>
              <span className="profile-name">{user.nickname}</span>
            </Link>
            <ScoreRing score={match.score} />
          </div>
          <div className="wrap" style={{ marginTop: 4 }}>
            <span className="badge badge-primary">{stage.label}</span>
            <span className="badge">{stage.trimesterLabel}</span>
            <span className="badge badge-outline">{dueInLabel(user.dueDate)}</span>
          </div>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.84rem" }}>
            {user.prefecture} {user.city} ・ {BIRTH_ORDER_LABEL[user.birthOrder]}
            {user.wantMeetup ? " ・ 会うのもOK" : ""}
          </p>
        </div>
      </div>

      {match.reasons.length > 0 && (
        <div className="wrap" style={{ marginTop: 12 }}>
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
      )}

      {user.bio && (
        <p
          className="muted"
          style={{
            margin: "12px 0 0",
            fontSize: "0.87rem",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {user.bio}
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        <TagList
          interests={user.interests}
          highlight={match.sharedInterests}
          limit={6}
        />
      </div>

      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <Link href={`/users/${user.id}`} className="btn btn-ghost btn-sm grow center">
          プロフィールを見る
        </Link>

        {variant === "sent" ? (
          <form action={cancelLike}>
            <input type="hidden" name="targetId" value={user.id} />
            <button className="btn btn-ghost btn-sm" type="submit">
              取り消す
            </button>
          </form>
        ) : (
          <form action={sendLike}>
            <input type="hidden" name="targetId" value={user.id} />
            <input type="hidden" name="from" value={from} />
            <button className="btn btn-sm" type="submit">
              {variant === "received" ? "💛 いいねを返す" : "💛 いいね"}
            </button>
          </form>
        )}

        {variant === "received" && (
          <form action={passLike}>
            <input type="hidden" name="targetId" value={user.id} />
            <button className="btn btn-quiet" type="submit">
              見送る
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
