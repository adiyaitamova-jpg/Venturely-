import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn, formatScore } from "@/lib/utils";

export function RankMovement({ movement, className }: { movement: number | null; className?: string }) {
  if (movement === null)
    return <span className={cn("text-2xs font-medium uppercase tracking-wide text-info", className)}>New</span>;
  if (movement === 0)
    return (
      <span className={cn("inline-flex items-center text-xs text-faint", className)} aria-label="No change">
        <Minus className="size-3.5" />
      </span>
    );
  const up = movement > 0;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", up ? "text-positive" : "text-negative", className)}
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(movement)} place${Math.abs(movement) === 1 ? "" : "s"}`}
    >
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {Math.abs(movement)}
    </span>
  );
}

/** Compact "#12 · 84.5 pts" indicator used on cards and profile headers. */
export function RankIndicator({
  rank,
  score,
  movement,
  provisional,
  size = "sm",
}: {
  rank: number | null;
  score: number | null;
  movement?: number | null;
  provisional?: boolean;
  size?: "sm" | "lg";
}) {
  if (rank === null || score === null) {
    return <span className="text-xs text-faint">Unranked</span>;
  }
  return (
    <span className={cn("inline-flex items-baseline gap-2", size === "lg" && "gap-3")}>
      <span className={cn("font-mono font-medium tabular text-ink", size === "lg" ? "text-2xl" : "text-sm")}>#{rank}</span>
      <span className={cn("tabular text-muted", size === "lg" ? "text-sm" : "text-xs")}>
        {formatScore(score)} pts{provisional ? " · provisional" : ""}
      </span>
      {movement !== undefined && <RankMovement movement={movement} />}
    </span>
  );
}
