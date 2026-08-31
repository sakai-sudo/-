"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { INTEREST_TAGS } from "@/lib/constants";

const AREA_OPTIONS = [
  { value: "all", label: "全国" },
  { value: "region", label: "同じ地方" },
  { value: "prefecture", label: "同じ都道府県" },
  { value: "city", label: "同じ市区町村" },
];

const WEEK_OPTIONS = [
  { value: "0", label: "週数はこだわらない" },
  { value: "2", label: "週数 ±2週以内" },
  { value: "4", label: "週数 ±4週以内" },
  { value: "8", label: "週数 ±8週以内" },
];

const ORDER_OPTIONS = [
  { value: "all", label: "初産・経産どちらも" },
  { value: "first", label: "初産の方" },
  { value: "experienced", label: "経産の方" },
];

export function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all" || value === "0" || value === "off") next.delete(key);
    else next.set(key, value);
    for (const k of ["liked", "welcome", "blocked", "reported"]) next.delete(k);
    const qs = next.toString();
    startTransition(() => router.push(qs ? `/discover?${qs}` : "/discover"));
  }

  const current = (key: string, fallback: string) => params.get(key) ?? fallback;
  const hasFilters = ["area", "week", "order", "tag", "meetup"].some((k) =>
    params.get(k),
  );

  return (
    <div className="filters" aria-busy={pending}>
      <div className="filter-row">
        <label className="sr-only" htmlFor="f-area">
          エリア
        </label>
        <select
          id="f-area"
          value={current("area", "all")}
          onChange={(e) => update("area", e.target.value)}
        >
          {AREA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-week">
          週数の差
        </label>
        <select
          id="f-week"
          value={current("week", "0")}
          onChange={(e) => update("week", e.target.value)}
        >
          {WEEK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-order">
          初産・経産
        </label>
        <select
          id="f-order"
          value={current("order", "all")}
          onChange={(e) => update("order", e.target.value)}
        >
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-tag">
          タグ
        </label>
        <select
          id="f-tag"
          value={current("tag", "all")}
          onChange={(e) => update("tag", e.target.value)}
        >
          <option value="all">タグで絞らない</option>
          {INTEREST_TAGS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label className="check" style={{ fontSize: "0.83rem" }}>
          <input
            type="checkbox"
            checked={params.get("meetup") === "on"}
            onChange={(e) => update("meetup", e.target.checked ? "on" : "off")}
          />
          会うのもOKな方だけ
        </label>
        {hasFilters && (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => startTransition(() => router.push("/discover"))}
          >
            条件をリセット
          </button>
        )}
      </div>
    </div>
  );
}
