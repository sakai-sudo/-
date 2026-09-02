import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { EVIDENCE_DIR, isAdmin } from "@/lib/verification";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** 審査中の画像を運営だけに見せる。public/ には置かない */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const me = await getCurrentUser();
  if (!isAdmin(me)) return new NextResponse("forbidden", { status: 403 });

  const { name } = await ctx.params;
  // ディレクトリを抜け出すパスを渡されても外は読ませない
  const resolved = path.resolve(EVIDENCE_DIR, path.basename(name));
  if (!resolved.startsWith(EVIDENCE_DIR)) {
    return new NextResponse("bad request", { status: 400 });
  }

  const data = await readFile(resolved).catch(() => null);
  if (!data) return new NextResponse("not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": MIME[path.extname(resolved).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}
