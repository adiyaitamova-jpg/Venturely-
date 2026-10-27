import { SIGNAL_LABEL, type Signal } from "@/lib/ranking/formula";
import type { BreakdownWithFlag } from "@/server/services/rankings";
import { cn, formatScore } from "@/lib/utils";

const ORDER: Signal[] = ["achievementsVerified", "projects", "contributions", "skills", "feedback", "achievementsUnverified"];

/** Horizontal stacked bar + legend explaining exactly where a score comes from. */
export function ScoreBreakdown({ breakdown, className }: { breakdown: BreakdownWithFlag; className?: string }) {
  const total = ORDER.reduce((s, k) => s + (breakdown[k] ?? 0), 0);
  const tones: Record<Signal, string> = {
    achievementsVerified: "bg-accent",
    projects: "bg-[#4f7f6a]",
    contributions: "bg-[#86a898]",
    skills: "bg-[#b7cbbf]",
    feedback: "bg-[#c9b98f]",
    achievementsUnverified: "bg-line-strong",
  };
  return (
    <div className={className}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-paper-2" aria-hidden>
        {total > 0 &&
          ORDER.map((k) => (breakdown[k] ?? 0) > 0 && <div key={k} className={cn("h-full", tones[k])} style={{ width: `${((breakdown[k] ?? 0) / total) * 100}%` }} />)}
      </div>
      <dl className="mt-3 space-y-1.5">
        {ORDER.map((k) => (
          <div key={k} className="flex items-center justify-between gap-3 text-[13px]">
            <dt className="flex items-center gap-2 text-ink-2">
              <span className={cn("size-2 rounded-full", tones[k])} aria-hidden />
              {SIGNAL_LABEL[k]}
            </dt>
            <dd className={cn("font-mono tabular", (breakdown[k] ?? 0) > 0 ? "text-ink" : "text-faint")}>{formatScore(breakdown[k] ?? 0)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
