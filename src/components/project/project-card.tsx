import Link from "next/link";
import { Clock, Users } from "lucide-react";
import type { ProjectCard as ProjectCardData } from "@/server/services/projects";
import { CATEGORY_LABEL, COMMITMENT_LABEL, STAGE_LABEL } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StageTrack } from "./stage-track";

export function ProjectCard({ project, matchedSkillIds = [] }: { project: ProjectCardData; matchedSkillIds?: string[] }) {
  const matched = new Set(matchedSkillIds);
  return (
    <article className="group relative flex flex-col rounded-lg border border-line bg-surface p-4 shadow-xs transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
        <span>{CATEGORY_LABEL[project.category]}</span>
        <span aria-hidden>·</span>
        <span>{STAGE_LABEL[project.stage]}</span>
        {project.status === "ARCHIVED" && <Badge className="ml-auto">Archived</Badge>}
      </div>
      <h3 className="mt-2 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink">
        <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 after:rounded-lg group-hover:text-accent">
          {project.title}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{project.tagline}</p>
      <div className="mt-3">
        <StageTrack stage={project.stage} compact />
      </div>
      {project.roles.length > 0 && (
        <div className="mt-3.5">
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Looking for</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {project.roles.slice(0, 3).map((r) => (
              <Badge key={r.id} tone="accent">
                {r.title}
              </Badge>
            ))}
            {project.roles.length > 3 && <span className="text-xs text-faint">+{project.roles.length - 3}</span>}
          </div>
        </div>
      )}
      {project.skills.length > 0 && (
        <p className="mt-3 line-clamp-1 text-xs text-muted">
          {project.skills.map((s, i) => (
            <span key={s.id} className={matched.has(s.id) ? "font-medium text-accent" : undefined}>
              {i > 0 && " · "}
              {s.name}
            </span>
          ))}
        </p>
      )}
      <div className="mt-auto flex items-center gap-3 border-t border-line pt-3 text-xs text-muted [&]:mt-4">
        <div className="flex -space-x-1.5">
          {project.members.map((m) =>
            m.user.profile ? (
              <Avatar
                key={m.user.id}
                size="xs"
                className="ring-2 ring-surface"
                user={{ id: m.user.id, displayName: m.user.profile.displayName, avatarHue: m.user.profile.avatarHue, hasAvatar: Boolean(m.user.profile.avatarMime), avatarVersion: m.user.profile.avatarUpdatedAt?.getTime() ?? null }}
              />
            ) : null,
          )}
        </div>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> {project._count.members}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {COMMITMENT_LABEL[project.commitment]}
        </span>
        <span className="ml-auto">Updated {timeAgo(project.updatedAt)}</span>
      </div>
    </article>
  );
}
