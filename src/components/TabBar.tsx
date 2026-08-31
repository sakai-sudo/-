"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/discover", label: "さがす", icon: "🔍" },
  { href: "/likes", label: "いいね", icon: "💛", badgeKey: "pendingLikes" as const },
  { href: "/matches", label: "トーク", icon: "💬" },
  { href: "/mypage", label: "マイページ", icon: "🌱" },
];

export function TabBar({ counts }: { counts: { pendingLikes: number } }) {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="メインナビゲーション">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const badge = tab.badgeKey ? counts[tab.badgeKey] : 0;
        return (
          <Link key={tab.href} href={tab.href} data-active={active}>
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
            {badge > 0 && (
              <span className="tab-badge" aria-label={`未対応 ${badge} 件`}>
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
