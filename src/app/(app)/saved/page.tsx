import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Sparkles } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { listSaved } from "@/server/services/social";
import { getInviteOptions } from "@/server/services/projects";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkillBadge } from "@/components/profile/skill-badge";
import { InviteButton, SaveButton } from "@/components/profile/profile-actions";
import { AVAILABILITY_LABEL } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Saved profiles" };

export default async function SavedPage() {
  const user = await requireUser("/saved");
  const [saved, inviteOptions] = await Promise.all([listSaved(user.id), getInviteOptions(user.id)]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Saved profiles" description="People you want to keep in mind for current or future projects. Only you can see this list." />
      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nobody saved yet"
          description="Save people from Discover or from AI Mentor matches to build a shortlist."
          action={
            <Button asChild size="sm">
              <Link href="/discover">Discover people</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {saved.map(({ savedUser: u, note, source, createdAt }) => {
            const p = u.profile!;
            return (
              <li key={u.id} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Avatar user={{ id: u.id, displayName: p.displayName, avatarHue: p.avatarHue, hasAvatar: Boolean(p.avatarMime), avatarVersion: p.avatarUpdatedAt?.getTime() ?? null }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/u/${p.username}`} className="font-semibold text-ink hover:text-accent">
                        {p.displayName}
                      </Link>
                      <span className="text-[13px] text-muted">@{p.username}</span>
                      {u.isDemo && <Badge tone="outline">Demo</Badge>}
                      {source === "AI_MATCH" && (
                        <Badge tone="accent">
                          <Sparkles aria-hidden /> From AI match
                        </Badge>
                      )}
                    </div>
                    <p className="text-[13px] text-muted">
                      {p.intendedMajor || p.headline} · {AVAILABILITY_LABEL[p.availability]} · saved {timeAgo(createdAt)}
                    </p>
                    {u.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {u.skills.map((s) => (
                          <SkillBadge key={s.skill.name} name={s.skill.name} level={s.level} />
                        ))}
                      </div>
                    )}
                    {note && <p className="mt-3 border-l-2 border-accent-line pl-3 text-[13px] leading-relaxed text-ink-2">{note}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <SaveButton userId={u.id} saved size="sm" />
                    <InviteButton size="sm" recipient={{ id: u.id, displayName: p.displayName }} options={inviteOptions} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
