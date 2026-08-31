import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ProfileForm } from "@/components/ProfileForm";
import { WeekBar } from "@/components/WeekBar";
import { deactivateAccount, logOut, unblockUser, updateProfile } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { parseInterests } from "@/lib/interests";
import { dueInLabel, pregnancyStage } from "@/lib/pregnancy";
import { getCounts } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = { title: "マイページ — マタマッチ" };

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ unblocked?: string }>;
}) {
  const me = await requireUser();
  const params = await searchParams;
  const stage = pregnancyStage(me.dueDate);
  const counts = await getCounts(me);
  const blocks = await prisma.block.findMany({
    where: { blockerId: me.id },
    include: { blocked: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page page-narrow">
      <h1>マイページ</h1>

      {params.unblocked && (
        <p className="notice notice-ok" role="status">
          ブロックを解除しました。
        </p>
      )}

      <div className="card">
        <div className="profile-hero">
          <Avatar seed={me.avatarSeed} name={me.nickname} size={58} />
          <div className="grow">
            <h2 className="profile-name">{me.nickname}</h2>
            <p className="muted" style={{ margin: 0, fontSize: "0.84rem" }}>
              {me.prefecture} {me.city} ・ {stage.label}
            </p>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="row-between" style={{ marginBottom: 6, fontSize: "0.83rem" }}>
            <span className="muted">{stage.trimesterLabel}</span>
            <span className="badge badge-gold">{dueInLabel(me.dueDate)}</span>
          </div>
          <WeekBar weeks={stage.weeks} />
        </div>
        <div className="meta-grid" style={{ marginTop: 14 }}>
          <div className="meta-item">
            <dt>届いているいいね</dt>
            <dd>
              <Link href="/likes">{counts.pendingLikes}件</Link>
            </dd>
          </div>
          <div className="meta-item">
            <dt>マッチ中</dt>
            <dd>
              <Link href="/matches">{counts.matches}人</Link>
            </dd>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>プロフィールを編集</h2>
      </div>
      <div className="card">
        <ProfileForm
          action={updateProfile}
          initial={{
            nickname: me.nickname,
            email: me.email,
            dueDate: toDateInput(me.dueDate),
            prefecture: me.prefecture,
            city: me.city,
            birthOrder: me.birthOrder,
            ageGroup: me.ageGroup,
            interests: parseInterests(me.interests),
            bio: me.bio,
            wantMeetup: me.wantMeetup,
          }}
          submitLabel="変更を保存する"
          mode="edit"
        />
      </div>

      <div className="section-title">
        <h2>ブロックした人</h2>
        <span className="count">{blocks.length}人</span>
      </div>
      {blocks.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          ブロックしている人はいません。
        </p>
      ) : (
        <div className="stack">
          {blocks.map((b) => (
            <div className="list-item" key={b.id}>
              <Avatar seed={b.blocked.avatarSeed} name={b.blocked.nickname} size={38} />
              <span className="grow list-title">{b.blocked.nickname}</span>
              <form action={unblockUser}>
                <input type="hidden" name="targetId" value={b.blockedId} />
                <button className="btn btn-ghost btn-sm" type="submit">
                  解除
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">
        <h2>アカウント</h2>
      </div>
      <div className="card stack">
        <p className="muted" style={{ margin: 0, fontSize: "0.84rem" }}>
          ログイン用メールアドレス: {me.email}
        </p>
        <form action={logOut}>
          <button className="btn btn-ghost btn-block" type="submit">
            ログアウト
          </button>
        </form>
        <form action={deactivateAccount}>
          <button className="btn btn-quiet" type="submit">
            退会する（プロフィールを非公開にします）
          </button>
        </form>
      </div>

      <p className="footnote">
        <Link href="/safety">安全に使うためのガイドライン</Link>
      </p>
    </main>
  );
}
