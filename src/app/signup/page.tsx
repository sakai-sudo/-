import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/lib/actions";
import { EMPTY_PROFILE, ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "プロフィール登録 — マタマッチ" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/discover");

  return (
    <main className="page page-narrow">
      <h1>プロフィール登録</h1>
      <p className="muted" style={{ fontSize: "0.87rem" }}>
        入力するのはマッチングに必要な項目だけです。本名・住所・電話番号は登録しません。
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <ProfileForm
          action={signUp}
          initial={EMPTY_PROFILE}
          submitLabel="登録して相手を探す"
          mode="signup"
        />
      </div>
      <p className="footnote">
        すでにアカウントをお持ちの方は <Link href="/login">ログイン</Link> へ。
      </p>
    </main>
  );
}
