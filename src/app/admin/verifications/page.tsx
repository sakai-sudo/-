import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { adminApproveVerification, adminRejectVerification } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { pregnancyStage } from "@/lib/pregnancy";
import { requireUser } from "@/lib/session";
import { VERIFICATION_METHOD_LABEL, isAdmin } from "@/lib/verification";

export const metadata = { title: "妊婦確認の審査 — マタマッチ" };

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const me = await requireUser();
  if (!isAdmin(me)) redirect("/discover");

  const { done } = await searchParams;
  const pending = await prisma.verificationRequest.findMany({
    where: { status: "pending" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  const recent = await prisma.verificationRequest.findMany({
    where: { status: { not: "pending" } },
    include: { user: true },
    orderBy: { reviewedAt: "desc" },
    take: 10,
  });

  return (
    <main className="page">
      <h1>妊婦確認の審査</h1>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        判定すると、預かっている画像はその場で削除されます。氏名・住所が写り込んでいる場合は
        承認せず、マスキングのうえ再提出を案内してください。
      </p>

      {done === "approved" && <p className="notice notice-ok">承認しました。</p>}
      {done === "rejected" && <p className="notice notice-info">差し戻しました。</p>}

      <div className="section-title">
        <h2>審査待ち</h2>
        <span className="count">{pending.length}件</span>
      </div>

      {pending.length === 0 ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">
            📭
          </span>
          審査待ちはありません。
        </div>
      ) : (
        <div className="stack">
          {pending.map((req) => {
            const stage = pregnancyStage(req.declaredDueDate);
            return (
              <div className="card" key={req.id}>
                <div className="row">
                  <Avatar seed={req.user.avatarSeed} name={req.user.nickname} size={40} />
                  <div className="grow">
                    <strong>{req.user.nickname}</strong>
                    <div className="list-sub">
                      {VERIFICATION_METHOD_LABEL[req.method] ?? req.method} ・ 申告{stage.label} ・{" "}
                      {req.user.prefecture}
                      {req.user.city}
                    </div>
                  </div>
                </div>

                {req.evidenceRef ? (
                  <a
                    href={`/api/admin/evidence/${encodeURIComponent(req.evidenceRef)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="evidence-link"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/admin/evidence/${encodeURIComponent(req.evidenceRef)}`}
                      alt="提出された母子健康手帳のページ"
                      className="evidence-thumb"
                    />
                  </a>
                ) : (
                  <p className="hint">画像なし（連携による確認）</p>
                )}

                <div className="row" style={{ marginTop: 12, gap: 8, alignItems: "flex-start" }}>
                  <form action={adminApproveVerification}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <button className="btn btn-sm" type="submit">
                      承認する
                    </button>
                  </form>
                  <form action={adminRejectVerification} className="grow row" style={{ gap: 6 }}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input
                      type="text"
                      name="reason"
                      placeholder="差し戻しの理由"
                      defaultValue="予定日が読み取れませんでした"
                      aria-label="差し戻しの理由"
                    />
                    <button className="btn btn-ghost btn-sm" type="submit">
                      差し戻す
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-title">
        <h2>最近の判定</h2>
      </div>
      {recent.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          まだありません。
        </p>
      ) : (
        <div className="stack">
          {recent.map((req) => (
            <div className="list-item" key={req.id}>
              <span className="grow">
                <span className="list-title">{req.user.nickname}</span>
                <span className="list-sub" style={{ display: "block" }}>
                  {VERIFICATION_METHOD_LABEL[req.method] ?? req.method}
                  {req.rejectReason ? ` ・ ${req.rejectReason}` : ""}
                </span>
              </span>
              <span className={req.status === "approved" ? "badge badge-primary" : "badge"}>
                {req.status === "approved" ? "承認" : "差し戻し"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="footnote">
        <Link href="/discover">アプリに戻る</Link>
      </p>
    </main>
  );
}
