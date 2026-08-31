import { INTEREST_LABEL } from "@/lib/constants";
import { parseInterests } from "@/lib/interests";

export function TagList({
  interests,
  highlight = [],
  limit,
}: {
  interests: string;
  highlight?: string[];
  limit?: number;
}) {
  const all = parseInterests(interests);
  const shown = limit ? all.slice(0, limit) : all;
  const rest = all.length - shown.length;
  if (all.length === 0) return null;
  const hi = new Set(highlight);
  return (
    <div className="wrap">
      {shown.map((id) => (
        <span key={id} className={hi.has(id) ? "badge badge-gold" : "badge"}>
          {hi.has(id) ? "◎ " : ""}
          {INTEREST_LABEL[id]}
        </span>
      ))}
      {rest > 0 && <span className="badge badge-outline">＋{rest}</span>}
    </div>
  );
}
