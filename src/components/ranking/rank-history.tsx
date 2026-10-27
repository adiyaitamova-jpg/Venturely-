/** Tiny rank-over-time line (lower rank number = higher on the chart). Only rendered with ≥ 2 points. */
export function RankHistory({ points, className }: { points: { computedAt: Date; rank: number }[]; className?: string }) {
  if (points.length < 2) return null;
  const w = 220;
  const h = 44;
  const ranks = points.map((p) => p.rank);
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  const span = Math.max(1, max - min);
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (w - 8) + 4, ((p.rank - min) / span) * (h - 12) + 6] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1]!;
  const first = points[0]!;
  const latest = points[points.length - 1]!;
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" role="img" aria-label={`Rank moved from #${first.rank} to #${latest.rank} over ${points.length} updates`}>
        <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="3" fill="var(--color-accent)" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-2xs text-faint">
        <span>{first.computedAt.toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
        <span>Now</span>
      </figcaption>
    </figure>
  );
}
