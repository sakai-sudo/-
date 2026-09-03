/**
 * 本番のマイナポータル 自己情報取得API を叩く実装。
 *
 * 【差し替えが必要な箇所】
 * エンドポイントとレスポンスの項目名は、仕様書取得フォームから入手する
 * 「自己情報取得API 仕様書」に載っている値に合わせる必要がある。
 * ここでは環境変数と下の FIELD 定数に切り出してあるので、承認後は
 * その2箇所を書き換えれば足りる。フロー（PKCE つき認可コードフロー）と
 * 判定ロジックはそのまま使える。
 */
import type { MynaPortalClient } from "./client";
import type { MaternityCheckup, MaternitySelfInfo, MynaTokens } from "./types";

/** 仕様書に合わせて差し替える。中間標準レイアウトの項目名が入る想定 */
const FIELD = {
  /** 妊婦健診情報の配列が入っているキー */
  checkupList: "ninpuKenshinList",
  /** 受診日 */
  examinedOn: "jushinYmd",
  /** 妊娠週数 */
  gestationalWeeks: "ninshinShusu",
  /** 分娩予定日 */
  expectedBirthDate: "bunbenYoteiYmd",
  /** 自治体が連携に対応していないことを表すコード */
  unsupportedCode: "NOT_SUPPORTED_MUNICIPALITY",
} as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} が設定されていません。MYNA_MODE=live で動かすには、利用申請の承認後に発行される接続情報が必要です（docs/myna-integration.md 参照）。`,
    );
  }
  return value;
}

/** "20260901" / "2026-09-01" のどちらでも Date にする */
export function parseJpDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/[-/]/g, "");
  if (!/^\d{8}$/.test(compact)) return null;
  const y = Number(compact.slice(0, 4));
  const m = Number(compact.slice(4, 6));
  const d = Number(compact.slice(6, 8));
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** API のレスポンスを、このアプリが使う最小の形に正規化する */
export function parseMaternityResponse(body: unknown): MaternitySelfInfo {
  const root = (body ?? {}) as Record<string, unknown>;

  if (root.errorCode === FIELD.unsupportedCode) {
    return { expectedBirthDate: null, checkups: [], municipalitySupported: false };
  }

  const rawList = Array.isArray(root[FIELD.checkupList])
    ? (root[FIELD.checkupList] as unknown[])
    : [];

  const checkups: MaternityCheckup[] = [];
  for (const item of rawList) {
    const row = (item ?? {}) as Record<string, unknown>;
    const examinedOn = parseJpDate(row[FIELD.examinedOn]);
    if (!examinedOn) continue;
    const weeks = Number(row[FIELD.gestationalWeeks]);
    checkups.push({
      examinedOn,
      gestationalWeeks: Number.isFinite(weeks) ? weeks : undefined,
    });
  }

  // 分娩予定日はルートにも健診レコードにも入りうるので、両方見る
  const expectedBirthDate =
    parseJpDate(root[FIELD.expectedBirthDate]) ??
    rawList
      .map((item) =>
        parseJpDate((item as Record<string, unknown>)?.[FIELD.expectedBirthDate]),
      )
      .find((d): d is Date => d !== null) ??
    null;

  return { expectedBirthDate, checkups, municipalitySupported: true };
}

export function createLiveClient(): MynaPortalClient {
  return {
    mode: "live",

    buildAuthorizeUrl({ state, codeChallenge, redirectUri }) {
      const url = new URL(required("MYNA_AUTHORIZE_URL"));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", required("MYNA_CLIENT_ID"));
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", process.env.MYNA_SCOPE ?? "selfinfo.maternity");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      return url.toString();
    },

    async exchangeCode({ code, codeVerifier, redirectUri }) {
      const res = await fetch(required("MYNA_TOKEN_URL"), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: required("MYNA_CLIENT_ID"),
          client_secret: required("MYNA_CLIENT_SECRET"),
          code_verifier: codeVerifier,
        }),
      });
      if (!res.ok) {
        throw new Error(`token endpoint returned ${res.status}`);
      }
      const json = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!json.access_token) throw new Error("access_token が返りませんでした");
      return {
        accessToken: json.access_token,
        expiresAt: new Date(Date.now() + (json.expires_in ?? 300) * 1000),
      };
    },

    async fetchMaternitySelfInfo(tokens) {
      const res = await fetch(required("MYNA_SELFINFO_URL"), {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
          "content-type": "application/json",
        },
        // 照会方法は「最新情報指定」。時点指定・範囲指定は使わない
        body: JSON.stringify({ inquiryType: "latest", category: "maternityCheckup" }),
      });
      if (!res.ok) {
        throw new Error(`selfinfo endpoint returned ${res.status}`);
      }
      return parseMaternityResponse(await res.json());
    },
  };
}
