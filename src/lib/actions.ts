"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { createSession, destroySession, getCurrentUser, requireUser } from "./session";
import { serializeInterests } from "./interests";
import { hasErrors, readProfileForm, validateProfile, type FieldErrors } from "./validation";
import { REPORT_REASONS } from "./constants";
import { endCallsBetween } from "./calls";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
};

const EMPTY: FormState = { ok: false };

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ------------------------------ 登録 / ログイン ------------------------------ */

export async function signUp(_prev: FormState = EMPTY, form: FormData): Promise<FormState> {
  const input = readProfileForm(form);
  const fieldErrors = validateProfile(input);
  if (hasErrors(fieldErrors)) {
    return { ok: false, message: "入力内容を確認してください", fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return {
      ok: false,
      message: "このメールアドレスは登録済みです。ログインしてください。",
      fieldErrors: { email: "登録済みのメールアドレスです" },
    };
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      nickname: input.nickname,
      dueDate: new Date(`${input.dueDate}T00:00:00`),
      prefecture: input.prefecture,
      city: input.city,
      birthOrder: input.birthOrder,
      ageGroup: input.ageGroup,
      interests: serializeInterests(input.interests),
      bio: input.bio,
      wantMeetup: input.wantMeetup,
      acceptCalls: input.acceptCalls,
      callFromHour: input.callFromHour,
      callToHour: input.callToHour,
      avatarSeed: randomSeed(),
    },
  });

  await createSession(user.id);
  redirect("/discover?welcome=1");
}

export async function logIn(_prev: FormState = EMPTY, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, message: "メールアドレスを入力してください" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return {
      ok: false,
      message: "そのメールアドレスの登録が見つかりません。新規登録してください。",
    };
  }
  await createSession(user.id);
  redirect("/discover");
}

/** シードユーザーとしてすぐ試すための入口（プロトタイプ用） */
export async function logInAsDemo(form: FormData) {
  const userId = String(form.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login?error=notfound");
  await createSession(user.id);
  redirect("/discover");
}

export async function logOut() {
  await destroySession();
  redirect("/");
}

/* -------------------------------- プロフィール ------------------------------- */

export async function updateProfile(
  _prev: FormState = EMPTY,
  form: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const input = readProfileForm(form);
  const fieldErrors = validateProfile(input, { requireEmail: false });
  if (hasErrors(fieldErrors)) {
    return { ok: false, message: "入力内容を確認してください", fieldErrors };
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      nickname: input.nickname,
      dueDate: new Date(`${input.dueDate}T00:00:00`),
      prefecture: input.prefecture,
      city: input.city,
      birthOrder: input.birthOrder,
      ageGroup: input.ageGroup,
      interests: serializeInterests(input.interests),
      bio: input.bio,
      wantMeetup: input.wantMeetup,
      acceptCalls: input.acceptCalls,
      callFromHour: input.callFromHour,
      callToHour: input.callToHour,
    },
  });

  revalidatePath("/mypage");
  revalidatePath("/discover");
  return { ok: true, message: "プロフィールを保存しました" };
}

/* --------------------------------- いいね --------------------------------- */

/** 相手に「いいね」を送る。相手からも来ていればマッチ成立 */
export async function sendLike(form: FormData) {
  const me = await requireUser();
  const targetId = String(form.get("targetId") ?? "");
  const from = String(form.get("from") ?? "/discover");
  if (!targetId || targetId === me.id) redirect(from);

  const target = await prisma.user.findFirst({
    where: { id: targetId, isActive: true },
  });
  if (!target) redirect(from);

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: me.id, blockedId: targetId },
        { blockerId: targetId, blockedId: me.id },
      ],
    },
  });
  if (blocked) redirect(from);

  await prisma.like.upsert({
    where: { senderId_receiverId: { senderId: me.id, receiverId: targetId } },
    create: { senderId: me.id, receiverId: targetId },
    update: {},
  });

  const reverse = await prisma.like.findUnique({
    where: { senderId_receiverId: { senderId: targetId, receiverId: me.id } },
  });

  let newMatchId: string | null = null;
  if (reverse) {
    const [userAId, userBId] = [me.id, targetId].sort();
    const match = await prisma.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    });
    newMatchId = match.id;
  }

  revalidatePath("/discover");
  revalidatePath("/likes");
  revalidatePath("/matches");

  if (newMatchId) redirect(`/matches/${newMatchId}?new=1`);
  redirect(`${from}${from.includes("?") ? "&" : "?"}liked=${targetId}`);
}

/** 送った「いいね」を取り消す */
export async function cancelLike(form: FormData) {
  const me = await requireUser();
  const targetId = String(form.get("targetId") ?? "");
  await prisma.like
    .delete({
      where: { senderId_receiverId: { senderId: me.id, receiverId: targetId } },
    })
    .catch(() => undefined);
  revalidatePath("/likes");
  redirect("/likes?tab=sent");
}

/** もらった「いいね」を見送る（相手には通知しない） */
export async function passLike(form: FormData) {
  const me = await requireUser();
  const targetId = String(form.get("targetId") ?? "");
  await prisma.like
    .delete({
      where: { senderId_receiverId: { senderId: targetId, receiverId: me.id } },
    })
    .catch(() => undefined);
  revalidatePath("/likes");
  redirect("/likes");
}

/* --------------------------------- トーク --------------------------------- */

export async function sendMessage(form: FormData) {
  const me = await requireUser();
  const matchId = String(form.get("matchId") ?? "");
  const body = String(form.get("body") ?? "").trim();

  if (!body) redirect(`/matches/${matchId}`);
  if (body.length > 1000) redirect(`/matches/${matchId}?error=too_long`);

  const match = await prisma.match.findFirst({
    where: { id: matchId, OR: [{ userAId: me.id }, { userBId: me.id }] },
  });
  if (!match) redirect("/matches");

  await prisma.message.create({
    data: { matchId, senderId: me.id, body },
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  redirect(`/matches/${matchId}`);
}

/* ------------------------------ 通報 / ブロック ----------------------------- */

/** ブロックを登録し、いいね・マッチ・トークも解除する */
async function applyBlock(meId: string, targetId: string) {
  // 通話中なら即座に切る
  await endCallsBetween(meId, targetId);

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: meId, blockedId: targetId } },
    create: { blockerId: meId, blockedId: targetId },
    update: {},
  });

  const [userAId, userBId] = [meId, targetId].sort();
  await prisma.$transaction([
    prisma.like.deleteMany({
      where: {
        OR: [
          { senderId: meId, receiverId: targetId },
          { senderId: targetId, receiverId: meId },
        ],
      },
    }),
    // マッチを消すと、ひもづくメッセージも onDelete: Cascade で消える
    prisma.match.deleteMany({ where: { userAId, userBId } }),
  ]);

  revalidatePath("/discover");
  revalidatePath("/likes");
  revalidatePath("/matches");
  revalidatePath("/mypage");
}

export async function blockUser(form: FormData) {
  const me = await requireUser();
  const targetId = String(form.get("targetId") ?? "");
  if (!targetId || targetId === me.id) redirect("/discover");

  await applyBlock(me.id, targetId);
  redirect("/discover?blocked=1");
}

export async function reportUser(
  _prev: FormState = EMPTY,
  form: FormData,
): Promise<FormState> {
  const me = await requireUser();
  const targetId = String(form.get("targetId") ?? "");
  const reason = String(form.get("reason") ?? "");
  const detail = String(form.get("detail") ?? "").trim().slice(0, 1000);
  const alsoBlock = form.get("alsoBlock") === "on";

  if (!REPORT_REASONS.some((r) => r.id === reason)) {
    return { ok: false, message: "通報の理由を選択してください" };
  }
  if (!targetId || targetId === me.id) {
    return { ok: false, message: "対象が見つかりません" };
  }

  await prisma.report.create({
    data: { reporterId: me.id, reportedId: targetId, reason, detail },
  });

  // ブロックすると相手のプロフィールは見えなくなるので、
  // このページに留まらず一覧へ戻してから結果を伝える
  if (alsoBlock) {
    await applyBlock(me.id, targetId);
    redirect("/discover?reported=1&blocked=1");
  }

  return {
    ok: true,
    message: "通報を受け付けました。運営が内容を確認します。",
  };
}

/* --------------------------------- 退会 ---------------------------------- */

export async function deactivateAccount() {
  const me = await getCurrentUser();
  if (!me) redirect("/");
  await prisma.user.update({ where: { id: me.id }, data: { isActive: false } });
  await destroySession();
  redirect("/?deactivated=1");
}

/** ブロックを解除する */
export async function unblockUser(form: FormData) {
  const me = await requireUser();
  const targetId = String(form.get("targetId") ?? "");
  await prisma.block
    .delete({
      where: { blockerId_blockedId: { blockerId: me.id, blockedId: targetId } },
    })
    .catch(() => undefined);
  revalidatePath("/mypage");
  revalidatePath("/discover");
  redirect("/mypage?unblocked=1");
}
