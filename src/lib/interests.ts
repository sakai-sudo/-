import { INTEREST_LABEL, MAX_INTERESTS } from "./constants";

/** DB には タグ id のカンマ区切りで保存する */
export function parseInterests(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s in INTEREST_LABEL);
}

export function serializeInterests(ids: string[]): string {
  const unique = Array.from(new Set(ids.filter((id) => id in INTEREST_LABEL)));
  return unique.slice(0, MAX_INTERESTS).join(",");
}

export function interestLabels(raw: string | null | undefined): string[] {
  return parseInterests(raw).map((id) => INTEREST_LABEL[id]);
}
