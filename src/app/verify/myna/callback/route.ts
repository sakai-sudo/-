import { NextResponse } from "next/server";
import { completeMynaLink } from "@/lib/myna/link";
import { getCurrentUser } from "@/lib/session";
import { appOrigin } from "@/lib/origin";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/** マイナポータル（またはモック）からの戻り先 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // request.url は内部アドレスになりうるので、公開オリジンは header から取る
  const base = await appOrigin();

  const me = await getCurrentUser();
  if (!me) return NextResponse.redirect(`${base}/?need_login=1`);

  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      `${base}/verify?myna_error=${encodeURIComponent("マイナポータルでの手続きが中断されました。")}`,
    );
  }

  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!state || !code) {
    return NextResponse.redirect(
      `${base}/verify?myna_error=${encodeURIComponent("連携の情報が不足しています。もう一度お試しください。")}`,
    );
  }

  const result = await completeMynaLink(state, code);

  revalidatePath("/verify");
  revalidatePath("/mypage");
  revalidatePath("/discover");

  if (!result.ok) {
    const params = new URLSearchParams({ myna_error: result.reason });
    if (result.suggestBoshiTecho) params.set("suggest", "boshi");
    return NextResponse.redirect(`${base}/verify?${params}`);
  }

  const params = new URLSearchParams({ done: "myna" });
  if (result.dueDateUpdated) params.set("due_updated", "1");
  return NextResponse.redirect(`${base}/verify?${params}`);
}
