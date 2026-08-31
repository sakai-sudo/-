import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page page-narrow">
      <div className="empty">
        <span className="empty-icon" aria-hidden="true">
          🌾
        </span>
        <h1 style={{ fontSize: "1.2rem" }}>ページが見つかりません</h1>
        <p>
          URLが変わったか、相手が退会・ブロックしたためかもしれません。
        </p>
        <Link href="/discover" className="btn btn-soft btn-sm">
          さがすに戻る
        </Link>
      </div>
    </main>
  );
}
