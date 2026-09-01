import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ReportPanel } from "@/components/ReportPanel";
import { Composer } from "./Composer";
import { CallButton } from "./CallButton";
import { callAvailability, callHoursLabel } from "@/lib/calls";
import { getMatchDetail } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { pregnancyStage } from "@/lib/pregnancy";
import { scoreMatch } from "@/lib/matching";

function clock(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dayLabel(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; error?: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  const detail = await getMatchDetail(me, id);
  if (!detail) notFound();

  const { match, partner } = detail;
  const query = await searchParams;
  const stage = pregnancyStage(partner.dueDate);
  const score = scoreMatch(me, partner);
  const availability = callAvailability(partner);

  const suggestions =
    match.messages.length === 0
      ? [
          `はじめまして！${stage.weeks}週なんですね、私もほぼ同じ時期です🌱`,
          "つわりはもう落ち着きましたか？",
          `${partner.city}あたりで通ってる産院、どちらですか？`,
        ]
      : [];

  let lastDay = "";

  return (
    <main className="page">
      <Link href="/matches" className="btn btn-quiet">
        ← トーク一覧
      </Link>

      <div className="card card-tight" style={{ marginBottom: 14 }}>
        <div className="row">
          <Avatar seed={partner.avatarSeed} name={partner.nickname} size={44} />
          <div className="grow">
            <div className="row-between">
              <Link href={`/users/${partner.id}`} style={{ color: "inherit", fontWeight: 700 }}>
                {partner.nickname}
              </Link>
              <span className="badge badge-primary">相性 {score.score}</span>
            </div>
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              {stage.label} ・ {partner.prefecture}
              {partner.city}
            </span>
          </div>
          <CallButton
            matchId={match.id}
            partnerName={partner.nickname}
            available={availability.ok}
            unavailableReason={availability.ok ? "" : availability.reason}
          />
        </div>
        <p className="hint" style={{ margin: "8px 0 0" }}>
          {callHoursLabel(partner)}・通話しても電話番号は交換されません
        </p>
      </div>

      {query.new && (
        <p className="notice notice-ok" role="status">
          マッチしました！ 話しかけてみましょう。
        </p>
      )}
      {query.error === "too_long" && (
        <p className="notice notice-error">メッセージが長すぎます（1000文字まで）。</p>
      )}

      {match.messages.length === 0 && (
        <div className="notice notice-info">
          はじめの一言に迷ったら、下の候補をタップして使ってください。
        </div>
      )}

      <div className="chat">
        {match.messages.map((m) => {
          const day = dayLabel(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const fromMe = m.senderId === me.id;
          if (m.kind === "call") {
            return (
              <div key={m.id}>
                {showDay && (
                  <p className="center muted" style={{ fontSize: "0.72rem", margin: "8px 0" }}>
                    {day}
                  </p>
                )}
                <p className="calllog">
                  <span aria-hidden="true">📞</span> {m.body}
                  <span className="calllog-time">{clock(m.createdAt)}</span>
                </p>
              </div>
            );
          }
          return (
            <div key={m.id}>
              {showDay && (
                <p className="center muted" style={{ fontSize: "0.72rem", margin: "8px 0" }}>
                  {day}
                </p>
              )}
              <div className={fromMe ? "bubble-row me" : "bubble-row"}>
                {!fromMe && (
                  <Avatar seed={partner.avatarSeed} name={partner.nickname} size={28} />
                )}
                <div className="bubble">{m.body}</div>
                <span className="bubble-time">{clock(m.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Composer matchId={match.id} suggestions={suggestions} />

      <div style={{ marginTop: 16 }}>
        <ReportPanel targetId={partner.id} targetName={partner.nickname} />
      </div>

      <p className="footnote">
        住所・勤務先・SNSのIDなど、個人が特定できる情報のやりとりは避けてください。
        体調の不安は、まずかかりつけの産婦人科へ。
      </p>
    </main>
  );
}
