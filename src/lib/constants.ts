export const APP_NAME = "マタマッチ";
export const APP_TAGLINE = "予定日が近い妊婦さんと、話せる相手が見つかる";

/* ---------------------------------- 地域 ---------------------------------- */

export const REGIONS = {
  hokkaido_tohoku: "北海道・東北",
  kanto: "関東",
  chubu: "中部",
  kinki: "近畿",
  chugoku_shikoku: "中国・四国",
  kyushu_okinawa: "九州・沖縄",
} as const;

export type RegionId = keyof typeof REGIONS;

export const PREFECTURES: { name: string; region: RegionId }[] = [
  { name: "北海道", region: "hokkaido_tohoku" },
  { name: "青森県", region: "hokkaido_tohoku" },
  { name: "岩手県", region: "hokkaido_tohoku" },
  { name: "宮城県", region: "hokkaido_tohoku" },
  { name: "秋田県", region: "hokkaido_tohoku" },
  { name: "山形県", region: "hokkaido_tohoku" },
  { name: "福島県", region: "hokkaido_tohoku" },
  { name: "茨城県", region: "kanto" },
  { name: "栃木県", region: "kanto" },
  { name: "群馬県", region: "kanto" },
  { name: "埼玉県", region: "kanto" },
  { name: "千葉県", region: "kanto" },
  { name: "東京都", region: "kanto" },
  { name: "神奈川県", region: "kanto" },
  { name: "新潟県", region: "chubu" },
  { name: "富山県", region: "chubu" },
  { name: "石川県", region: "chubu" },
  { name: "福井県", region: "chubu" },
  { name: "山梨県", region: "chubu" },
  { name: "長野県", region: "chubu" },
  { name: "岐阜県", region: "chubu" },
  { name: "静岡県", region: "chubu" },
  { name: "愛知県", region: "chubu" },
  { name: "三重県", region: "kinki" },
  { name: "滋賀県", region: "kinki" },
  { name: "京都府", region: "kinki" },
  { name: "大阪府", region: "kinki" },
  { name: "兵庫県", region: "kinki" },
  { name: "奈良県", region: "kinki" },
  { name: "和歌山県", region: "kinki" },
  { name: "鳥取県", region: "chugoku_shikoku" },
  { name: "島根県", region: "chugoku_shikoku" },
  { name: "岡山県", region: "chugoku_shikoku" },
  { name: "広島県", region: "chugoku_shikoku" },
  { name: "山口県", region: "chugoku_shikoku" },
  { name: "徳島県", region: "chugoku_shikoku" },
  { name: "香川県", region: "chugoku_shikoku" },
  { name: "愛媛県", region: "chugoku_shikoku" },
  { name: "高知県", region: "chugoku_shikoku" },
  { name: "福岡県", region: "kyushu_okinawa" },
  { name: "佐賀県", region: "kyushu_okinawa" },
  { name: "長崎県", region: "kyushu_okinawa" },
  { name: "熊本県", region: "kyushu_okinawa" },
  { name: "大分県", region: "kyushu_okinawa" },
  { name: "宮崎県", region: "kyushu_okinawa" },
  { name: "鹿児島県", region: "kyushu_okinawa" },
  { name: "沖縄県", region: "kyushu_okinawa" },
];

const PREFECTURE_REGION = new Map(PREFECTURES.map((p) => [p.name, p.region]));

export function regionOf(prefecture: string): RegionId | null {
  return PREFECTURE_REGION.get(prefecture) ?? null;
}

/* --------------------------------- 年代 ---------------------------------- */

export const AGE_GROUPS = [
  { id: "u24", label: "24歳以下" },
  { id: "25_29", label: "25〜29歳" },
  { id: "30_34", label: "30〜34歳" },
  { id: "35_39", label: "35〜39歳" },
  { id: "o40", label: "40歳以上" },
] as const;

export type AgeGroupId = (typeof AGE_GROUPS)[number]["id"];

export const AGE_GROUP_LABEL: Record<string, string> = Object.fromEntries(
  AGE_GROUPS.map((a) => [a.id, a.label]),
);

export function ageGroupIndex(id: string): number {
  return AGE_GROUPS.findIndex((a) => a.id === id);
}

/* -------------------------------- 初産/経産 ------------------------------- */

export const BIRTH_ORDERS = [
  { id: "first", label: "初産" },
  { id: "experienced", label: "経産" },
] as const;

export const BIRTH_ORDER_LABEL: Record<string, string> = Object.fromEntries(
  BIRTH_ORDERS.map((b) => [b.id, b.label]),
);

/* ------------------------------- 興味・関心タグ ----------------------------- */

export type InterestTag = { id: string; label: string; group: string };

export const INTEREST_TAGS: InterestTag[] = [
  // 妊娠・出産のスタイル
  { id: "natural_birth", label: "自然分娩を希望", group: "出産スタイル" },
  { id: "epidural", label: "無痛分娩を希望", group: "出産スタイル" },
  { id: "c_section", label: "帝王切開の予定", group: "出産スタイル" },
  { id: "satogaeri", label: "里帰り出産", group: "出産スタイル" },
  { id: "multiples", label: "双子・多胎", group: "出産スタイル" },
  { id: "after_fertility", label: "不妊治療を経て", group: "出産スタイル" },
  // 今のコンディション
  { id: "morning_sickness", label: "つわりがつらい", group: "いまの状態" },
  { id: "bed_rest", label: "安静指示中", group: "いまの状態" },
  { id: "working", label: "働きながら妊娠中", group: "いまの状態" },
  { id: "on_leave", label: "産休・育休中", group: "いまの状態" },
  { id: "older_child", label: "上の子がいる", group: "いまの状態" },
  { id: "solo_parenting", label: "ワンオペ気味", group: "いまの状態" },
  { id: "relocated", label: "転勤・引っ越し直後", group: "いまの状態" },
  // 知りたいこと
  { id: "hoikatsu", label: "保活の情報交換", group: "知りたいこと" },
  { id: "naming", label: "名づけを考え中", group: "知りたいこと" },
  { id: "baby_goods", label: "出産準備品えらび", group: "知りたいこと" },
  { id: "money", label: "家計・節約", group: "知りたいこと" },
  { id: "career", label: "復職・キャリア", group: "知りたいこと" },
  // 過ごし方・好きなもの
  { id: "maternity_yoga", label: "マタニティヨガ", group: "好きなこと" },
  { id: "walking", label: "散歩・ウォーキング", group: "好きなこと" },
  { id: "cooking", label: "料理・作りおき", group: "好きなこと" },
  { id: "cafe", label: "カフェめぐり", group: "好きなこと" },
  { id: "drama", label: "ドラマ・映画", group: "好きなこと" },
  { id: "manga_game", label: "漫画・ゲーム", group: "好きなこと" },
  { id: "oshikatsu", label: "推し活", group: "好きなこと" },
  { id: "handmade", label: "ハンドメイド", group: "好きなこと" },
  { id: "pets", label: "ペットと暮らす", group: "好きなこと" },
];

export const INTEREST_LABEL: Record<string, string> = Object.fromEntries(
  INTEREST_TAGS.map((t) => [t.id, t.label]),
);

export const INTEREST_GROUPS = Array.from(
  new Set(INTEREST_TAGS.map((t) => t.group)),
);

export const MAX_INTERESTS = 8;

/* -------------------------------- 通報理由 -------------------------------- */

export const REPORT_REASONS = [
  { id: "spam", label: "宣伝・勧誘・スパム" },
  { id: "medical", label: "根拠のない医療アドバイス" },
  { id: "harassment", label: "攻撃的・不快な言動" },
  { id: "call_trouble", label: "通話でのトラブル" },
  { id: "impersonation", label: "妊婦ではない / なりすまし" },
  { id: "commercial", label: "商品・サービスの売り込み" },
  { id: "other", label: "その他" },
] as const;
