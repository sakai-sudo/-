import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { AppBar } from "@/components/AppBar";
import { TabBar } from "@/components/TabBar";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getCounts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "出産予定日・住んでいる地域・いまの状況が近い妊婦さん同士をつなぐ、ママ友づくりのためのマッチングアプリです。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const counts = user ? await getCounts(user) : null;

  return (
    <html lang="ja">
      <body>
        <div className="shell">
          <AppBar
            right={
              user ? (
                <Link href="/mypage" className="badge badge-primary">
                  {user.nickname}
                </Link>
              ) : (
                <Link href="/login" className="btn btn-ghost btn-sm">
                  ログイン
                </Link>
              )
            }
          />
          {children}
          {user && counts && <TabBar counts={counts} />}
        </div>
      </body>
    </html>
  );
}
