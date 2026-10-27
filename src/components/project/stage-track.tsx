import type { ProjectStage } from "@prisma/client";
import { STAGES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/** Six-step stage indicator. Compact variant is a thin segmented bar. */
export function StageTrack({ stage, compact }: { stage: ProjectStage; compact?: boolean }) {
  const idx = STAGES.findIndex((s) => s.value === stage);
  if (compact) {
    return (
      <div className="flex gap-0.5" role="img" aria-label={`Stage ${idx + 1} of ${STAGES.length}: ${STAGES[idx]?.label}`}>
        {STAGES.map((s, i) => (
          <span key={s.value} className={cn("h-1 flex-1 rounded-full", i <= idx ? "bg-accent" : "bg-line")} />
        ))}
      </div>
    );
  }
  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Project stage">
      {STAGES.map((s, i) => (
        <li key={s.value} aria-current={i === idx ? "step" : undefined} title={s.description}>
          <span className={cn("block h-1.5 rounded-full", i < idx ? "bg-accent/60" : i === idx ? "bg-accent" : "bg-line")} />
          <span className={cn("mt-1.5 hidden text-2xs sm:block", i === idx ? "font-semibold text-ink" : i < idx ? "text-muted" : "text-faint")}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
