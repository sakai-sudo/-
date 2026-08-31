import Link from "next/link";
import { CandidateCard } from "@/components/CandidateCard";
import { WeekBar } from "@/components/WeekBar";
import { FilterBar } from "./FilterBar";
import { getCandidates, type DiscoverFilters } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { dueInLabel, pregnancyStage } from "@/lib/pregnancy";
import { INTEREST_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const metadata = { title: "さがす — マタマッチ" };

type SearchParams = {
  area?: string;
  week?: string;
  order?: string;
  tag?: string;
  meetup?: string;
  liked?: string;
  welcome?: string;
  blocked?: string;
  reported?: string;
};

function toFilters(p: SearchParams): DiscoverFilters {
  return {
    area: ["region", "prefecture", "city"].includes(p.area ?? "") ? p.area! : "all",
    maxWeekDiff: Number.parseInt(p.week ?? "0", 10) || 0,
    birthOrder: ["first", "experienced"].includes(p.order ?? "") ? p.order! : "all",
    interest: p.tag && p.tag in INTEREST_LABEL ? p.tag : "all",
    meetupOnly: p.meetup === "on",
  };
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const me = await requireUser();
  const params = await searchParams;
  const filters = toFilters(params);
  const candidates = await getCandidates(me, filters);
  const myStage = pregnancyStage(me.dueDate);

  const likedUser = params.liked
    ? await prisma.user.findUnique({
        where: { id: params.liked },
        select: { nickname: true },
      })
    : null;

  const query = new URLSearchParams();
  if (params.area) query.set("area", params.area);
  if (params.week) query.set("week", params.week);
  if (params.order) query.set("order", params.order);
  if (params.tag) query.set("tag", params.tag);
  if (params.meetup) query.set("meetup", params.meetup);
  const from = query.toString() ? `/discover?${query}` : "/discover";

  return (
    <main className="page">
      {params.welcome && (
        <p className="notice notice-ok" role="status">
          登録ありがとうございます。まずは気になる方に「いいね」を送ってみましょう。
        </p>
      )}
      {params.reported && (
        <p className="notice notice-ok" role="status">
          通報を受け付けました。運営が内容を確認します。
        </p>
      )}
      {params.blocked && !params.reported && (
        <p className="notice notice-ok" role="status">
          ブロックしました。おすすめ一覧から相互に表示されなくなります。
        </p>
      )}
      {params.blocked && params.reported && (
        <p className="notice notice-info" role="status">
          あわせてブロックしました。いいねとトークも解除されています。
        </p>
      )}
      {likedUser && (
        <p className="notice notice-info" role="status">
          {likedUser.nickname}さんに「いいね」を送りました。相手も返してくれたらトークが始まります。
        </p>
      )}

      <div className="card card-tight" style={{ marginBottom: 16 }}>
        <div className="row-between">
          <div>
            <strong>{me.nickname}</strong>さん・{myStage.label}
            <span className="muted"> （{myStage.trimesterLabel}）</span>
          </div>
          <span className="badge badge-gold">{dueInLabel(me.dueDate)}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <WeekBar weeks={myStage.weeks} />
        </div>
      </div>

      <div className="card card-tight" style={{ marginBottom: 16 }}>
        <FilterBar />
      </div>

      <div className="section-title">
        <h2>あなたに近い妊婦さん</h2>
        <span className="count">{candidates.length}人</span>
      </div>

      {candidates.length === 0 ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">
            🍃
          </span>
          条件に合う方が見つかりませんでした。
          <br />
          エリアや週数の条件を広げてみてください。
          <div style={{ marginTop: 14 }}>
            <Link href="/discover" className="btn btn-soft btn-sm">
              条件をリセット
            </Link>
          </div>
        </div>
      ) : (
        <div className="stack">
          {candidates.map((c) => (
            <CandidateCard
              key={c.user.id}
              user={c.user}
              match={c.match}
              from={from}
            />
          ))}
        </div>
      )}

      <p className="footnote">
        スコアは「妊娠週数の近さ・エリア・共通タグ・初産経産・年代」から算出した参考値です。
        <br />
        <Link href="/safety">安全に使うためのガイドライン</Link>
      </p>
    </main>
  );
}
