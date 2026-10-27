import Link from "next/link";
import { Award, BadgeCheck, FolderGit2 } from "lucide-react";
import type { PersonCard as PersonCardData } from "@/server/services/discovery";
import { AVAILABILITY_LABEL, STAGE_LABEL } from "@/lib/taxonomy";
import { cn, formatScore } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "./skill-badge";
import { InviteButton, SaveButton } from "./profile-actions";
import type { InviteOption } from "@/components/project/invite-dialog";

export function PersonCard({
  person,
  inviteOptions,
  footer,
  compact,
}: {
  person: PersonCardData;
  inviteOptions?: InviteOption[];
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  const available = person.availability !== "NOT_AVAILABLE";
  return (
    <article className="group flex flex-col rounded-lg border border-line bg-surface p-4 shadow-xs transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        <Avatar user={person} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/u/${person.username}`} className="truncate font-semibold text-ink hover:text-accent">
              {person.displayName}
            </Link>
            {person.isDemo && <Badge tone="outline">Demo</Badge>}
          </div>
          <p className="truncate text-[13px] text-muted">
            @{person.username}
            {person.intendedMajor && <> · {person.intendedMajor}</>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {person.rank ? (
            <>
              <p className="font-mono text-sm font-medium tabular text-ink">#{person.rank.rank}</p>
              <p className="text-2xs tabular text-faint">{formatScore(person.rank.score)} pts</p>
            </>
          ) : (
            <p className="text-2xs text-faint">Unranked</p>
          )}
        </div>
      </header>

      <p className={cn("mt-3 text-[13.5px] leading-relaxed text-ink-2", compact ? "line-clamp-2" : "line-clamp-3")}>{person.headline || person.bio || "No bio yet."}</p>

      {person.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {person.skills.map((s) => (
            <SkillBadge key={s.id} name={s.name} level={s.level} matched={s.matched} />
          ))}
          {person.extraSkills > 0 && <span className="self-center text-xs text-faint">+{person.extraSkills}</span>}
        </div>
      )}

      {!compact && (person.projects.length > 0 || person.achievements.length > 0) && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-[13px]">
          {person.achievements.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-ink-2">
              {a.status === "VERIFIED" ? (
                <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-accent" aria-label="Verified" />
              ) : (
                <Award className="mt-0.5 size-3.5 shrink-0 text-faint" aria-label="Self-reported" />
              )}
              <span className="line-clamp-1">{a.title}</span>
            </li>
          ))}
          {person.projects.map((p) => (
            <li key={p.slug} className="flex items-start gap-2 text-ink-2">
              <FolderGit2 className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
              <span className="line-clamp-1">
                {p.title} <span className="text-faint">· {STAGE_LABEL[p.stage]}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1.5 text-xs", available ? "text-positive" : "text-faint")}>
            <span className={cn("size-1.5 rounded-full", available ? "bg-positive" : "bg-faint")} aria-hidden />
            {AVAILABILITY_LABEL[person.availability]}
          </span>
          {footer ?? (
            <div className="flex gap-1.5">
              <Button asChild size="sm" variant="ghost">
                <Link href={`/u/${person.username}`}>View profile</Link>
              </Button>
              {inviteOptions && <InviteButton size="sm" variant="secondary" recipient={{ id: person.id, displayName: person.displayName }} options={inviteOptions} />}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export { SaveButton };
