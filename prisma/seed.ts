/**
 * デモ用のサンプルデータ。実在の人物とは一切関係のない架空のプロフィールです。
 * 出産予定日は「実行日からの相対日数」で作るので、いつ実行しても週数がばらけます。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

/** 今日から days 日後の日付 */
function due(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + days * DAY);
}

type Seed = {
  nickname: string;
  email: string;
  dueInDays: number;
  prefecture: string;
  city: string;
  birthOrder: "first" | "experienced";
  ageGroup: string;
  interests: string[];
  bio: string;
  wantMeetup: boolean;
  acceptCalls?: boolean;
  callFromHour?: number;
  callToHour?: number;
};

const USERS: Seed[] = [
  {
    nickname: "みかん",
    email: "mikan@example.com",
    dueInDays: 84,
    prefecture: "東京都",
    city: "世田谷区",
    birthOrder: "first",
    ageGroup: "30_34",
    interests: ["natural_birth", "working", "hoikatsu", "walking", "cafe", "drama"],
    bio: "初マタ、フルタイムで働きながらの妊娠生活です。\n仕事の引き継ぎと保活の情報を集めるのに必死…同じくらいの週数の方とゆるく情報交換できたら嬉しいです。",
    wantMeetup: true,
  },
  {
    nickname: "こむぎ",
    email: "komugi@example.com",
    dueInDays: 79,
    prefecture: "東京都",
    city: "世田谷区",
    birthOrder: "first",
    ageGroup: "30_34",
    interests: ["natural_birth", "working", "hoikatsu", "cafe", "handmade"],
    bio: "同じ区内です。里帰りはせず、こちらで産む予定です。\n産院は用賀のあたりに通っています。近所のマタニティ向けカフェを開拓中。",
    wantMeetup: true,
    callFromHour: 9,
    callToHour: 22,
  },
  {
    nickname: "ひなた",
    email: "hinata@example.com",
    dueInDays: 90,
    prefecture: "東京都",
    city: "杉並区",
    birthOrder: "first",
    ageGroup: "25_29",
    interests: ["epidural", "working", "naming", "manga_game", "oshikatsu"],
    bio: "無痛分娩の予定です。名づけが全然決まらず夫と毎晩会議しています。\nインドア派なのでオンラインで話せる方だと気楽です。",
    wantMeetup: false,
    acceptCalls: false,
  },
  {
    nickname: "あおい",
    email: "aoi@example.com",
    dueInDays: 72,
    prefecture: "神奈川県",
    city: "川崎市中原区",
    birthOrder: "experienced",
    ageGroup: "30_34",
    interests: ["older_child", "solo_parenting", "money", "cooking", "walking"],
    bio: "2歳児がいる2人目妊娠中です。上の子の相手をしながらの後期はなかなか手強い…\n同じく上の子ありの方、どう過ごしてるか知りたいです。",
    wantMeetup: true,
  },
  {
    nickname: "ゆず",
    email: "yuzu@example.com",
    dueInDays: 150,
    prefecture: "東京都",
    city: "練馬区",
    birthOrder: "first",
    ageGroup: "25_29",
    interests: ["morning_sickness", "working", "baby_goods", "drama", "pets"],
    bio: "まだつわりが残っていて、においがつらい日があります。\n猫と暮らしています。ドラマを流しながら横になっているのが日課です。",
    wantMeetup: false,
    acceptCalls: false,
  },
  {
    nickname: "まる",
    email: "maru@example.com",
    dueInDays: 88,
    prefecture: "大阪府",
    city: "吹田市",
    birthOrder: "first",
    ageGroup: "35_39",
    interests: ["after_fertility", "natural_birth", "career", "maternity_yoga", "cafe"],
    bio: "不妊治療を経てようやくここまで来ました。年齢的な不安もあるけれど、毎日のマタニティヨガで気を紛らわせています。",
    wantMeetup: true,
  },
  {
    nickname: "のん",
    email: "non@example.com",
    dueInDays: 40,
    prefecture: "東京都",
    city: "世田谷区",
    birthOrder: "experienced",
    ageGroup: "35_39",
    interests: ["c_section", "older_child", "baby_goods", "cooking", "money"],
    bio: "予定帝王切開で日程が決まりました。入院準備リストを作りながら、上の子の預け先を調整中です。\n先輩というより同志として話せたら。",
    wantMeetup: true,
  },
  {
    nickname: "さくら",
    email: "sakura@example.com",
    dueInDays: 200,
    prefecture: "愛知県",
    city: "名古屋市中区",
    birthOrder: "first",
    ageGroup: "25_29",
    interests: ["morning_sickness", "working", "naming", "oshikatsu", "manga_game"],
    bio: "安定期に入るまでドキドキしています。会社にはまだ言えていません。\n推し活が心の支えです。",
    wantMeetup: false,
  },
  {
    nickname: "ことり",
    email: "kotori@example.com",
    dueInDays: 96,
    prefecture: "福岡県",
    city: "福岡市中央区",
    birthOrder: "first",
    ageGroup: "30_34",
    interests: ["satogaeri", "epidural", "hoikatsu", "cafe", "handmade"],
    bio: "里帰り出産の予定で、来月から実家に移ります。\n手作りのおくるみを縫っています。オンラインでのおしゃべり歓迎。",
    wantMeetup: false,
  },
  {
    nickname: "りんご",
    email: "ringo@example.com",
    dueInDays: 60,
    prefecture: "北海道",
    city: "札幌市北区",
    birthOrder: "experienced",
    ageGroup: "30_34",
    interests: ["older_child", "relocated", "cooking", "money", "walking"],
    bio: "転勤で札幌に来たばかりで、知り合いがいません。\n2人目なので流れは分かるものの、土地勘がないので情報がほしいです。",
    wantMeetup: true,
  },
  {
    nickname: "ももこ",
    email: "momoko@example.com",
    dueInDays: 30,
    prefecture: "神奈川県",
    city: "横浜市港北区",
    birthOrder: "first",
    ageGroup: "30_34",
    interests: ["natural_birth", "on_leave", "baby_goods", "maternity_yoga", "drama"],
    bio: "産休に入って毎日そわそわしています。あと1か月。\n入院バッグに何を入れたか、みんなの実例が知りたいです。",
    wantMeetup: true,
  },
  {
    nickname: "しずく",
    email: "shizuku@example.com",
    dueInDays: 118,
    prefecture: "東京都",
    city: "江東区",
    birthOrder: "first",
    ageGroup: "25_29",
    interests: ["working", "hoikatsu", "career", "cafe", "walking"],
    bio: "復職前提で保活を始めました。区の説明会に行ってきたので、聞いた話をシェアできます。",
    wantMeetup: true,
  },
  {
    nickname: "なぎ",
    email: "nagi@example.com",
    dueInDays: 105,
    prefecture: "京都府",
    city: "京都市左京区",
    birthOrder: "first",
    ageGroup: "35_39",
    interests: ["after_fertility", "bed_rest", "handmade", "drama", "pets"],
    bio: "少し安静指示が出ていて、家で過ごす日が多いです。\n横になりながらできる話し相手を探しています。",
    wantMeetup: false,
    callFromHour: 13,
    callToHour: 20,
  },
  {
    nickname: "ふたば",
    email: "futaba@example.com",
    dueInDays: 66,
    prefecture: "埼玉県",
    city: "さいたま市浦和区",
    birthOrder: "first",
    ageGroup: "30_34",
    interests: ["multiples", "c_section", "baby_goods", "money", "cooking"],
    bio: "双子妊娠中で、管理入院の可能性があると言われています。\n多胎の方の話がなかなか周りで聞けないので、ここで見つかったら嬉しいです。",
    wantMeetup: false,
  },
  {
    nickname: "ゆき",
    email: "yuki@example.com",
    dueInDays: 52,
    prefecture: "宮城県",
    city: "仙台市青葉区",
    birthOrder: "experienced",
    ageGroup: "u24",
    interests: ["older_child", "solo_parenting", "money", "manga_game", "cooking"],
    bio: "夫が単身赴任中で、ほぼワンオペです。上の子は1歳。\n同じような状況の方と励まし合いたい。",
    wantMeetup: true,
  },
  {
    nickname: "あん",
    email: "an@example.com",
    dueInDays: 92,
    prefecture: "東京都",
    city: "世田谷区",
    birthOrder: "first",
    ageGroup: "35_39",
    interests: ["epidural", "working", "career", "cafe", "maternity_yoga", "hoikatsu"],
    bio: "管理職をしながらの初マタ。産休までのタスクが山積みです。\n世田谷の保活事情、切実に知りたいです。",
    wantMeetup: true,
  },
  {
    nickname: "こはる",
    email: "koharu@example.com",
    dueInDays: 170,
    prefecture: "兵庫県",
    city: "西宮市",
    birthOrder: "first",
    ageGroup: "25_29",
    interests: ["morning_sickness", "naming", "drama", "oshikatsu", "cafe"],
    bio: "つわり真っ最中で、食べられるものが限られています。\n同じ時期の方と「今日食べられたもの」を報告し合いたいです。",
    wantMeetup: false,
  },
  {
    nickname: "そら",
    email: "sora@example.com",
    dueInDays: 14,
    prefecture: "東京都",
    city: "中野区",
    birthOrder: "first",
    ageGroup: "30_34",
    interests: ["natural_birth", "on_leave", "walking", "cooking", "baby_goods"],
    bio: "もういつ来てもおかしくない時期です。毎日散歩しています。\n後期の過ごし方について聞かれたら答えられます。",
    wantMeetup: true,
  },
  {
    nickname: "つむぎ",
    email: "tsumugi@example.com",
    dueInDays: 130,
    prefecture: "広島県",
    city: "広島市中区",
    birthOrder: "experienced",
    ageGroup: "30_34",
    interests: ["older_child", "satogaeri", "cooking", "handmade", "pets"],
    bio: "3歳の子と犬がいます。2人目は里帰りしようか迷い中。\nのんびりやりとりできる方だと嬉しいです。",
    wantMeetup: false,
  },
  {
    nickname: "はな",
    email: "hana@example.com",
    dueInDays: 76,
    prefecture: "神奈川県",
    city: "川崎市中原区",
    birthOrder: "experienced",
    ageGroup: "30_34",
    interests: ["older_child", "hoikatsu", "money", "walking", "drama"],
    bio: "武蔵小杉あたりに住んでいます。上の子は保育園。\n同じ地域の方と、園や小児科の情報を交換したいです。",
    wantMeetup: true,
  },
  {
    nickname: "うみ",
    email: "umi@example.com",
    dueInDays: 45,
    prefecture: "沖縄県",
    city: "那覇市",
    birthOrder: "first",
    ageGroup: "25_29",
    interests: ["natural_birth", "on_leave", "maternity_yoga", "cooking", "cafe"],
    bio: "はじめての出産まであと少し。暑さ対策に苦戦しています。\nオンラインで全国の方と話せるのが楽しいです。",
    wantMeetup: false,
  },
  {
    nickname: "みなも",
    email: "minamo@example.com",
    dueInDays: 100,
    prefecture: "東京都",
    city: "杉並区",
    birthOrder: "first",
    ageGroup: "30_34",
    interests: ["working", "relocated", "hoikatsu", "cafe", "handmade"],
    bio: "半年前に東京に引っ越してきました。友達がまだ少ないです。\n同じ沿線の方だと嬉しい。",
    wantMeetup: true,
  },
];

function seedFor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 33 + email.charCodeAt(i)) % 100000;
  return h.toString(36).padStart(5, "0");
}

async function main() {
  console.log("既存データを削除中…");
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.like.deleteMany();
  await prisma.block.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();

  console.log(`ユーザーを ${USERS.length} 件作成中…`);
  const created = new Map<string, string>();
  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        nickname: u.nickname,
        dueDate: due(u.dueInDays),
        prefecture: u.prefecture,
        city: u.city,
        birthOrder: u.birthOrder,
        ageGroup: u.ageGroup,
        interests: u.interests.join(","),
        bio: u.bio,
        wantMeetup: u.wantMeetup,
        acceptCalls: u.acceptCalls ?? true,
        callFromHour: u.callFromHour ?? 10,
        callToHour: u.callToHour ?? 21,
        avatarSeed: seedFor(u.email),
      },
    });
    created.set(u.email, user.id);
  }

  const id = (email: string): string => {
    const v = created.get(email);
    if (!v) throw new Error(`unknown seed user: ${email}`);
    return v;
  };

  // みかん（デモの主役）に届いているいいね
  console.log("いいねを作成中…");
  for (const from of ["hinata@example.com", "an@example.com", "shizuku@example.com"]) {
    await prisma.like.create({
      data: { senderId: id(from), receiverId: id("mikan@example.com") },
    });
  }

  // みかんが送っていて返事待ちのいいね
  await prisma.like.create({
    data: { senderId: id("mikan@example.com"), receiverId: id("momoko@example.com") },
  });

  // 他のユーザー同士のいいね（賑わい用）
  const pairs: [string, string][] = [
    ["aoi@example.com", "hana@example.com"],
    ["hana@example.com", "aoi@example.com"],
    ["yuzu@example.com", "koharu@example.com"],
    ["sakura@example.com", "koharu@example.com"],
    ["minamo@example.com", "hinata@example.com"],
  ];
  for (const [from, to] of pairs) {
    await prisma.like.create({ data: { senderId: id(from), receiverId: id(to) } });
  }

  // 相互いいね → マッチ（あおい & はな）
  {
    const [a, b] = [id("aoi@example.com"), id("hana@example.com")].sort();
    await prisma.match.create({ data: { userAId: a, userBId: b } });
  }

  // みかん & こむぎ は相互いいね済みでマッチ＋会話あり
  console.log("マッチとトークを作成中…");
  await prisma.like.create({
    data: { senderId: id("mikan@example.com"), receiverId: id("komugi@example.com") },
  });
  await prisma.like.create({
    data: { senderId: id("komugi@example.com"), receiverId: id("mikan@example.com") },
  });
  const [ua, ub] = [id("mikan@example.com"), id("komugi@example.com")].sort();
  const match = await prisma.match.create({ data: { userAId: ua, userBId: ub } });

  const conversation: [string, string][] = [
    ["komugi@example.com", "はじめまして！同じ区で予定日も近くてびっくりしました🌱"],
    ["mikan@example.com", "こちらこそ！世田谷の方に会えて嬉しいです。産院はどちらですか？"],
    ["komugi@example.com", "用賀の方の病院です。母親学級がオンラインになっていて少し寂しくて…"],
    ["mikan@example.com", "分かります。同じ時期の人と話せる場所が意外とないですよね。"],
    ["komugi@example.com", "保活の説明会、行かれましたか？ 区の資料が難しくて理解が追いつかず…"],
    ["mikan@example.com", "先週行ってきました！メモが残っているので、よければ整理して共有しますね。"],
  ];
  const base = Date.now() - 2 * DAY;
  for (let i = 0; i < conversation.length; i++) {
    const [from, body] = conversation[i];
    await prisma.message.create({
      data: {
        matchId: match.id,
        senderId: id(from),
        body,
        createdAt: new Date(base + i * 22 * 60 * 1000),
      },
    });
  }

  console.log("完了。デモログインは mikan@example.com が一番賑やかです。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
