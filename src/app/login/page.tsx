import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { Avatar } from "@/components/Avatar";
import { logInAsDemo } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { pregnancyStage } from "@/lib/pregnancy";

export const metadata = { title: "ログイン — マタマッチ" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/discover");

  const params = await searchParams;
  const demoUsers = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  return (
    <main className="page page-narrow">
      <h1>ログイン</h1>
      {params.error === "notfound" && (
        <p className="notice notice-error">アカウントが見つかりませんでした。</p>
      )}
      <div className="card">
        <LoginForm />
      </div>

      {demoUsers.length > 0 && (
        <>
          <div className="section-title">
            <h2>デモアカウントで試す</h2>
          </div>
          <p className="muted" style={{ fontSize: "0.83rem" }}>
            動作確認用のサンプルユーザーです。どれかを選ぶとそのまま中を見られます。
          </p>
          <div className="stack">
            {demoUsers.map((u) => {
              const stage = pregnancyStage(u.dueDate);
              return (
                <form action={logInAsDemo} key={u.id}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className="list-item"
                    style={{ width: "100%", cursor: "pointer", textAlign: "left" }}
                  >
                    <Avatar seed={u.avatarSeed} name={u.nickname} size={40} />
                    <span className="grow">
                      <span className="list-title">{u.nickname}</span>
                      <span className="list-sub" style={{ display: "block" }}>
                        {stage.label} ・ {u.prefecture}
                        {u.city}
                      </span>
                    </span>
                    <span className="badge badge-primary">選ぶ</span>
                  </button>
                </form>
              );
            })}
          </div>
        </>
      )}

      <p className="footnote">
        アカウントをお持ちでない方は <Link href="/signup">新規登録</Link> へ。
      </p>
    </main>
  );
}
