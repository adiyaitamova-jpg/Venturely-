import type { SkillLevel } from "@prisma/client";
import { cn } from "@/lib/utils";
import { SKILL_LEVEL_LABEL, SKILL_LEVEL_RANK } from "@/lib/taxonomy";

/** Skill name with an optional 4-dot proficiency meter. `matched` highlights skills relevant to the viewer's search. */
export function SkillBadge({ name, level, matched, className }: { name: string; level?: SkillLevel; matched?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-xs",
        matched ? "border-accent-line bg-accent-soft text-accent-ink" : "border-line bg-surface text-ink-2",
        className,
      )}
      title={level ? `${name} — ${SKILL_LEVEL_LABEL[level]}` : name}
    >
      {name}
      {level && (
        <span className="flex gap-[2px]" aria-label={SKILL_LEVEL_LABEL[level]}>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={cn("size-[4px] rounded-full", n <= SKILL_LEVEL_RANK[level] ? "bg-current opacity-80" : "bg-current opacity-20")} />
          ))}
        </span>
      )}
    </span>
  );
}
