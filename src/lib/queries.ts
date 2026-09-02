import type { User } from "@prisma/client";
import { prisma } from "./db";
import { scoreMatch, type MatchScore } from "./matching";
import { regionOf } from "./constants";
import { expireStaleVerifications, verifiedGateAllows } from "./verification";

export type Candidate = { user: User; match: MatchScore };

export type DiscoverFilters = {
  /** "all" | "prefecture" | "city" | "region" */
  area: string;
  /** 週数差の上限（0 は制限なし） */
  maxWeekDiff: number;
  birthOrder: string; // "all" | "first" | "experienced"
  interest: string; // タグ id、"all" で制限なし
  meetupOnly: boolean;
};

export const DEFAULT_FILTERS: DiscoverFilters = {
  area: "all",
  maxWeekDiff: 0,
  birthOrder: "all",
  interest: "all",
  meetupOnly: false,
};

/** ブロック関係にある相手（どちらの向きでも）の id 一覧 */
async function blockedUserIds(meId: string): Promise<Set<string>> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: meId }, { blockedId: meId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const b of blocks) {
    ids.add(b.blockerId === meId ? b.blockedId : b.blockerId);
  }
  return ids;
}

/** すでにマッチしている相手の id 一覧 */
async function matchedUserIds(meId: string): Promise<Set<string>> {
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }] },
    select: { userAId: true, userBId: true },
  });
  const ids = new Set<string>();
  for (const m of matches) {
    ids.add(m.userAId === meId ? m.userBId : m.userAId);
  }
  return ids;
}

/**
 * おすすめ候補を相性スコア順に返す。
 * 除外するのは「自分自身 / 退会済み / ブロック関係 / すでにいいね済み / マッチ済み」。
 */
export async function getCandidates(
  me: User,
  filters: DiscoverFilters = DEFAULT_FILTERS,
  now = new Date(),
): Promise<Candidate[]> {
  await expireStaleVerifications(now);
  const [blocked, matched, sentLikes] = await Promise.all([
    blockedUserIds(me.id),
    matchedUserIds(me.id),
    prisma.like.findMany({
      where: { senderId: me.id },
      select: { receiverId: true },
    }),
  ]);
  const excluded = new Set<string>([
    me.id,
    ...blocked,
    ...matched,
    ...sentLikes.map((l) => l.receiverId),
  ]);

  const myRegion = regionOf(me.prefecture);
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { notIn: Array.from(excluded) },
      ...(filters.area === "prefecture" ? { prefecture: me.prefecture } : {}),
      ...(filters.area === "city"
        ? { prefecture: me.prefecture, city: me.city }
        : {}),
      ...(filters.birthOrder !== "all" ? { birthOrder: filters.birthOrder } : {}),
      ...(filters.interest !== "all"
        ? { interests: { contains: filters.interest } }
        : {}),
      ...(filters.meetupOnly ? { wantMeetup: true } : {}),
    },
  });

  const scored = users
    .filter((u) =>
      filters.area === "region" && myRegion
        ? regionOf(u.prefecture) === myRegion
        : true,
    )
    .filter((u) => verifiedGateAllows(me, u, now))
    .map((user) => ({ user, match: scoreMatch(me, user, now) }))
    .filter((c) =>
      filters.maxWeekDiff > 0 ? c.match.weekDiff <= filters.maxWeekDiff : true,
    )
    .sort((a, b) => b.match.score - a.match.score || a.user.id.localeCompare(b.user.id));

  return scored;
}

/** 自分がもらった、まだ返していない「いいね」 */
export async function getPendingLikes(
  me: User,
  now = new Date(),
): Promise<Candidate[]> {
  const [blocked, mySent] = await Promise.all([
    blockedUserIds(me.id),
    prisma.like.findMany({
      where: { senderId: me.id },
      select: { receiverId: true },
    }),
  ]);
  const sentTo = new Set(mySent.map((l) => l.receiverId));

  const likes = await prisma.like.findMany({
    where: { receiverId: me.id, sender: { isActive: true } },
    include: { sender: true },
    orderBy: { createdAt: "desc" },
  });

  return likes
    .filter(
      (l) =>
        !blocked.has(l.senderId) &&
        !sentTo.has(l.senderId) &&
        verifiedGateAllows(me, l.sender, now),
    )
    .map((l) => ({ user: l.sender, match: scoreMatch(me, l.sender, now) }));
}

/** 自分が送って、まだ返事がない「いいね」 */
export async function getSentLikes(me: User, now = new Date()): Promise<Candidate[]> {
  const matched = await matchedUserIds(me.id);
  const likes = await prisma.like.findMany({
    where: { senderId: me.id, receiver: { isActive: true } },
    include: { receiver: true },
    orderBy: { createdAt: "desc" },
  });
  return likes
    .filter((l) => !matched.has(l.receiverId) && verifiedGateAllows(me, l.receiver, now))
    .map((l) => ({ user: l.receiver, match: scoreMatch(me, l.receiver, now) }));
}

export type MatchSummary = {
  id: string;
  createdAt: Date;
  partner: User;
  lastMessage: { body: string; createdAt: Date; fromMe: boolean } | null;
  messageCount: number;
};

export async function getMatchSummaries(me: User): Promise<MatchSummary[]> {
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: me.id }, { userBId: me.id }] },
    include: {
      userA: true,
      userB: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return matches
    .map((m) => {
      const partner = m.userAId === me.id ? m.userB : m.userA;
      const last = m.messages[0];
      return {
        id: m.id,
        createdAt: m.createdAt,
        partner,
        messageCount: m._count.messages,
        lastMessage: last
          ? {
              body: last.body,
              createdAt: last.createdAt,
              fromMe: last.senderId === me.id,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const ta = a.lastMessage?.createdAt ?? a.createdAt;
      const tb = b.lastMessage?.createdAt ?? b.createdAt;
      return tb.getTime() - ta.getTime();
    });
}

/** 自分が参加しているマッチのみ取得。他人のトークは覗けない */
export async function getMatchDetail(me: User, matchId: string) {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ userAId: me.id }, { userBId: me.id }],
    },
    include: {
      userA: true,
      userB: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!match) return null;
  const partner = match.userAId === me.id ? match.userB : match.userA;
  return { match, partner };
}

/** プロフィール詳細。ブロック関係なら見せない */
export async function getVisibleUser(me: User, userId: string) {
  if (userId === me.id) return null;
  const blocked = await blockedUserIds(me.id);
  if (blocked.has(userId)) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
  });
  if (!user) return null;
  if (!verifiedGateAllows(me, user)) return null;

  const [iLiked, likedMe, existingMatch] = await Promise.all([
    prisma.like.findUnique({
      where: { senderId_receiverId: { senderId: me.id, receiverId: userId } },
    }),
    prisma.like.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: me.id } },
    }),
    prisma.match.findFirst({
      where: {
        OR: [
          { userAId: me.id, userBId: userId },
          { userAId: userId, userBId: me.id },
        ],
      },
    }),
  ]);

  return {
    user,
    iLiked: Boolean(iLiked),
    likedMe: Boolean(likedMe),
    matchId: existingMatch?.id ?? null,
  };
}

export async function getCounts(me: User) {
  const [pending, matches] = await Promise.all([
    getPendingLikes(me),
    prisma.match.count({ where: { OR: [{ userAId: me.id }, { userBId: me.id }] } }),
  ]);
  return { pendingLikes: pending.length, matches };
}
