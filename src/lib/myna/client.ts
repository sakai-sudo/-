/**
 * マイナポータル 自己情報取得API のクライアント。
 *
 * 実接続にはデジタル庁への利用申請（仕様書取得 → 事前打合せ → 審査 → 接続試験）が
 * 必要で、承認が下りるまで本番の認可サーバーは叩けない。そのため
 *
 *   - 画面遷移・state 管理・トークン交換・判定ロジックは本番と同じ経路で作り
 *   - 外部通信の部分だけ差し替えられるように、この interface で分けている
 *
 * 承認後は MYNA_MODE=live に切り替え、live.ts のエンドポイントとレスポンス
 * 項目名を仕様書のものに合わせるだけで動く。詳細は docs/myna-integration.md。
 */
import type { MaternitySelfInfo, MynaTokens } from "./types";
import { appOrigin } from "../origin";
import { createLiveClient } from "./live";
import { createMockClient } from "./mock";

export interface MynaPortalClient {
  readonly mode: "mock" | "live";
  /** 利用者を同意・本人確認の画面へ送り出す URL */
  buildAuthorizeUrl(params: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): string;
  /** 認可コードをアクセストークンに交換する */
  exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<MynaTokens>;
  /** 妊婦健診情報を「最新情報指定」で照会する */
  fetchMaternitySelfInfo(tokens: MynaTokens): Promise<MaternitySelfInfo>;
}

export function getMynaClient(): MynaPortalClient {
  return process.env.MYNA_MODE === "live" ? createLiveClient() : createMockClient();
}

/**
 * 戻り先の URL。
 *
 * live では認可サーバーに登録した値と完全に一致していなければならないので
 * APP_ORIGIN を最優先する。設定がない開発時は、実際のリクエストのホストから
 * 組み立てる（ポートやホスト名の食い違いで連携が壊れるのを避けるため）。
 */
export async function mynaRedirectUri(): Promise<string> {
  return `${await appOrigin()}/verify/myna/callback`;
}
