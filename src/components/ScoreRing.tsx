/** 相性スコアを円グラフ風に表示する */
export function ScoreRing({ score, size = 54 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 80 ? "var(--primary)" : pct >= 60 ? "var(--gold)" : "var(--border-strong)";
  return (
    <div
      className="score"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${pct * 3.6}deg, var(--bg-alt) 0deg)`,
      }}
      role="img"
      aria-label={`相性スコア ${pct} 点`}
    >
      <div className="score-inner">
        <span className="score-num">{pct}</span>
        <span className="score-unit">SCORE</span>
      </div>
    </div>
  );
}
