import { GESTATION_WEEKS } from "@/lib/pregnancy";

export function WeekBar({ weeks }: { weeks: number }) {
  const pct = Math.max(4, Math.min(100, (weeks / GESTATION_WEEKS) * 100));
  return (
    <div className="weekbar" role="img" aria-label={`妊娠${weeks}週`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
