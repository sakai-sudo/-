/**
 * 利用申請が通るまでのあいだ、本番と同じ経路で開発・テストするためのモック。
 *
 * 認可画面の代わりにアプリ内の /verify/myna/consent を表示し、そこで選んだ
 * シナリオを認可コードに埋めて返す。これで「自治体が未対応」「健診の記録がない」
 * といった分岐も、実装を触らずに画面から確認できる。
 */
import type { MynaPortalClient } from "./client";
import type { MaternitySelfInfo } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const MOCK_SCENARIOS = {
  ok: "健診の記録あり・予定日も一致",
  due_shifted: "記録の分娩予定日が登録とずれている",
  unsupported: "自治体が母子保健情報の連携に未対応",
  no_data: "健診の記録が見つからない",
  stale: "直近の健診が半年以上前",
} as const;

export type MockScenario = keyof typeof MOCK_SCENARIOS;

export function isMockScenario(v: string): v is MockScenario {
  return v in MOCK_SCENARIOS;
}

/** モックの認可コードは `mock.<シナリオ>.<予定日 YYYYMMDD>` の形にする */
export function buildMockCode(scenario: MockScenario, declaredDueDate: Date): string {
  const y = declaredDueDate.getFullYear();
  const m = String(declaredDueDate.getMonth() + 1).padStart(2, "0");
  const d = String(declaredDueDate.getDate()).padStart(2, "0");
  return `mock.${scenario}.${y}${m}${d}`;
}

function parseMockCode(code: string): { scenario: MockScenario; dueDate: Date } {
  const [, scenario, ymd] = code.split(".");
  const dueDate = new Date(
    Number(ymd?.slice(0, 4)),
    Number(ymd?.slice(4, 6)) - 1,
    Number(ymd?.slice(6, 8)),
  );
  return {
    scenario: scenario && isMockScenario(scenario) ? scenario : "ok",
    dueDate: Number.isNaN(dueDate.getTime()) ? new Date() : dueDate,
  };
}

export function mockSelfInfoFor(code: string, now = new Date()): MaternitySelfInfo {
  const { scenario, dueDate } = parseMockCode(code);

  switch (scenario) {
    case "unsupported":
      return { expectedBirthDate: null, checkups: [], municipalitySupported: false };
    case "no_data":
      return { expectedBirthDate: null, checkups: [], municipalitySupported: true };
    case "stale":
      return {
        expectedBirthDate: dueDate,
        checkups: [{ examinedOn: new Date(now.getTime() - 210 * DAY) }],
        municipalitySupported: true,
      };
    case "due_shifted":
      return {
        expectedBirthDate: new Date(dueDate.getTime() - 21 * DAY),
        checkups: [
          { examinedOn: new Date(now.getTime() - 10 * DAY) },
          { examinedOn: new Date(now.getTime() - 38 * DAY) },
        ],
        municipalitySupported: true,
      };
    default:
      return {
        expectedBirthDate: dueDate,
        checkups: [
          { examinedOn: new Date(now.getTime() - 12 * DAY) },
          { examinedOn: new Date(now.getTime() - 40 * DAY) },
          { examinedOn: new Date(now.getTime() - 68 * DAY) },
        ],
        municipalitySupported: true,
      };
  }
}

export function createMockClient(): MynaPortalClient {
  let lastCode = "";

  return {
    mode: "mock",

    buildAuthorizeUrl({ state, redirectUri }) {
      // 本物の認可画面の代わりに、アプリ内の擬似同意画面へ送る
      const url = new URL("/verify/myna/consent", redirectUri);
      url.searchParams.set("state", state);
      return url.toString();
    },

    async exchangeCode({ code }) {
      lastCode = code;
      return {
        accessToken: `mock-token.${code}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
    },

    async fetchMaternitySelfInfo(tokens) {
      // モックではトークンにコードを埋めてあるので、そこからシナリオを復元する
      const code = tokens.accessToken.replace(/^mock-token\./, "") || lastCode;
      return mockSelfInfoFor(code);
    },
  };
}
