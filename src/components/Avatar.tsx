/** ニックネームの頭文字を使った、写真不要のアバター（画像アップロードは持たない設計） */
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  seed,
  name,
  size = 46,
}: {
  seed: string;
  name: string;
  size?: number;
}) {
  const h = hue(seed || name);
  const h2 = (h + 42) % 360;
  return (
    <div
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: `linear-gradient(140deg, hsl(${h} 46% 52%), hsl(${h2} 52% 62%))`,
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}
