import { headers } from "next/headers";

/**
 * アプリの公開オリジン。
 *
 * Route Handler の `request.url` はサーバー内部のアドレス（localhost:PORT）に
 * なることがあり、そこへリダイレクトすると Cookie が送られずセッションが切れる。
 * リバースプロキシの下でも同じ事故が起きるので、オリジンの決め方はここに一本化する。
 *
 *   1. APP_ORIGIN があればそれ（マイナポータルに登録する戻り先と一致させるため必須）
 *   2. なければ実際のリクエストのホストから組み立てる
 */
export async function appOrigin(): Promise<string> {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = /^(localhost|127\.|\[::1\])/.test(host);
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
