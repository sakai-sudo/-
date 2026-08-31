import {
  AGE_GROUPS,
  BIRTH_ORDERS,
  INTEREST_LABEL,
  MAX_INTERESTS,
  PREFECTURES,
} from "./constants";
import { daysUntil } from "./pregnancy";

export type ProfileInput = {
  nickname: string;
  email: string;
  dueDate: string; // YYYY-MM-DD
  prefecture: string;
  city: string;
  birthOrder: string;
  ageGroup: string;
  interests: string[];
  bio: string;
  wantMeetup: boolean;
};

export type FieldErrors = Partial<Record<keyof ProfileInput, string>>;

const PREFECTURE_NAMES = new Set(PREFECTURES.map((p) => p.name));
const AGE_IDS = new Set<string>(AGE_GROUPS.map((a) => a.id));
const BIRTH_IDS = new Set<string>(BIRTH_ORDERS.map((b) => b.id));

export function readProfileForm(form: FormData): ProfileInput {
  return {
    nickname: String(form.get("nickname") ?? "").trim(),
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    dueDate: String(form.get("dueDate") ?? "").trim(),
    prefecture: String(form.get("prefecture") ?? "").trim(),
    city: String(form.get("city") ?? "").trim(),
    birthOrder: String(form.get("birthOrder") ?? "").trim(),
    ageGroup: String(form.get("ageGroup") ?? "").trim(),
    interests: form.getAll("interests").map((v) => String(v)),
    bio: String(form.get("bio") ?? "").trim(),
    wantMeetup: form.get("wantMeetup") === "on" || form.get("wantMeetup") === "true",
  };
}

export function validateProfile(
  input: ProfileInput,
  opts: { requireEmail?: boolean } = {},
): FieldErrors {
  const errors: FieldErrors = {};

  if (input.nickname.length < 1) errors.nickname = "ニックネームを入力してください";
  else if (input.nickname.length > 20) errors.nickname = "20文字以内で入力してください";

  if (opts.requireEmail !== false) {
    if (!input.email) errors.email = "メールアドレスを入力してください";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
      errors.email = "メールアドレスの形式が正しくありません";
  }

  if (!input.dueDate) {
    errors.dueDate = "出産予定日を入力してください";
  } else {
    const d = new Date(`${input.dueDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      errors.dueDate = "日付の形式が正しくありません";
    } else {
      const left = daysUntil(d);
      if (left > 300) errors.dueDate = "出産予定日が遠すぎます（10か月以内で入力してください）";
      if (left < -60) errors.dueDate = "出産予定日が過去すぎます";
    }
  }

  if (!PREFECTURE_NAMES.has(input.prefecture)) errors.prefecture = "都道府県を選択してください";
  if (input.city.length < 1) errors.city = "市区町村を入力してください";
  else if (input.city.length > 30) errors.city = "30文字以内で入力してください";

  if (!BIRTH_IDS.has(input.birthOrder)) errors.birthOrder = "選択してください";
  if (!AGE_IDS.has(input.ageGroup)) errors.ageGroup = "年代を選択してください";

  const valid = input.interests.filter((i) => i in INTEREST_LABEL);
  if (valid.length > MAX_INTERESTS)
    errors.interests = `タグは${MAX_INTERESTS}個までです`;

  if (input.bio.length > 400) errors.bio = "400文字以内で入力してください";

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
