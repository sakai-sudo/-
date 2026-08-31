import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function AppBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="appbar">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          m
        </span>
        {APP_NAME}
      </Link>
      <div className="row">{right}</div>
    </header>
  );
}
