import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Circle, FolderPlus, Inbox, Sparkles, Wand2, Users } from "lucide-react";
import type { ActivityType } from "@prisma/client";
import { requireUser } from "@/server/auth/current-user";
import { getDashboard } from "@/server/services/dashboard";
import { getInviteOptions } from "@/server/services/projects";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { PersonCard } from "@/components/profile/person-card";
import { RankMovement } from "@/components/ranking/rank-indicator";
import { CATEGORY_LABEL, COMMITMENT_LABEL, RANK_CATEGORY_LABEL, STAGE_LABEL } from "@/lib/taxonomy";
import { cn, formatScore, timeAgo } from "@/lib/utils";
import { StageTrack } from "@/components/project/stage-track";

export const metadata: Metadata = { title: "Dashboard" };

const ACTIVITY: Record<ActivityType, string> = {
  PROJECT_CREATED: "started",
  STAGE_CHANGED: "moved stage in",
  MEMBER_JOINED: "joined",
  MILESTONE_ADDED: "added a milestone to",
  MILESTONE_COMPLETED: "completed a milestone in",
  ROLE_OPENED: "opened a role in",
  PROJECT_UPDATED: "updated",
};

function greeting() {
  const h = new Date().getUTCHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/dashboard");
  const { welcome } = await searchParams;
  const [d, inviteOptions] = await Promise.all([getDashboard(user.id), getInviteOptions(user.id)]);
  const g = d.ranking.global;
  const pendingTotal = d.invitations.length + d.applications.length;
  const firstName = d.profile.displayName.split(" ")[0];
  const nextSteps = d.completion.steps.filter((s) => !s.done).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{welcome ? "Welcome to TEAMi" : greeting()}</p>
          <h1 className="mt-1 font-display text-[40px] leading-none tracking-[-0.01em] sm:text-[48px]">{welcome ? `Glad you're here, ${firstName}.` : `${firstName}.`}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted">
            {pendingTotal > 0
              ? `You have ${pendingTotal} request${pendingTotal === 1 ? "" : "s"} waiting for a response.`
              : d.myProjects.length === 0
                ? "Start by joining a project or creating your own — then recruit the people you need."
                : "Here's what's moving across your projects."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/projects/new">
              <FolderPlus /> New project
            </Link>
          </Button>
          <Button asChild>
            <Link href="/mentor">
              <Sparkles /> Ask the mentor
            </Link>
          </Button>
        </div>
      </header>

      {!d.profile.onboardedAt && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-2">
            <span className="font-medium text-ink">Finish setting up your profile.</span> Until you do, you won&apos;t appear in discovery, matching or rankings.
          </p>
          <Button asChild size="sm">
            <Link href="/onboarding">Continue setup</Link>
          </Button>
        </div>
      )}

      {/* Top row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Your profile" description={`${d.completion.percent}% complete`} action={<Link href={`/u/${user.username}`} className="text-xs text-accent hover:underline">View</Link>} />
          <CardBody>
            <ProgressBar value={d.completion.percent} label="Profile completion" />
            {nextSteps.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {nextSteps.map((s) => (
                  <li key={s.key}>
                    <Link href={s.href} className="group flex items-center gap-2 text-[13px] text-ink-2 hover:text-accent">
                      <Circle className="size-3.5 text-faint group-hover:text-accent" aria-hidden />
                      {s.label}
                      <ArrowRight className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-[13px] text-positive">
                <Check className="size-4" aria-hidden /> Your profile is complete.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ranking" description={g ? `Overall · of ${g.total} ranked` : "Not ranked yet"} action={<Link href="/leaderboard" className="text-xs text-accent hover:underline">Leaderboard</Link>} />
          <CardBody>
            {g ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-medium tabular tracking-tight">#{g.rank}</span>
                  <span className="text-sm tabular text-muted">{formatScore(g.score)} pts</span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted">
                    <RankMovement movement={g.movement} /> 7d
                  </span>
                </div>
                {d.ranking.categories.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                    {d.ranking.categories.slice(0, 3).map((c) => (
                      <li key={c.category}>
                        {RANK_CATEGORY_LABEL[c.category]} <span className="font-mono text-ink">#{c.rank}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-muted">
                Rankings reflect evidence: verified achievements, shipped projects and completed milestones.{" "}
                <Link href="/leaderboard/methodology" className="text-accent hover:underline">
                  How it works
                </Link>
              </p>
            )}
          </CardBody>
        </Card>

        <Card className={cn(pendingTotal > 0 && "border-accent-line")}>
          <CardHeader title="Pending requests" description={pendingTotal ? `${pendingTotal} need your response` : "Nothing waiting"} action={<Link href="/requests" className="text-xs text-accent hover:underline">All requests</Link>} />
          <CardBody>
            {pendingTotal === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <Inbox className="size-4" aria-hidden /> You&apos;re all caught up.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {d.invitations.map((i) => (
                  <li key={i.id} className="text-[13px] leading-snug">
                    <Link href="/requests?tab=received" className="hover:text-accent">
                      <span className="font-medium text-ink">{i.sender.profile?.displayName}</span> <span className="text-ink-2">invited you to</span>{" "}
                      <span className="font-medium text-ink">{i.project.title}</span>
                    </Link>
                  </li>
                ))}
                {d.applications.map((a) => (
                  <li key={a.id} className="text-[13px] leading-snug">
                    <Link href="/requests?tab=incoming" className="hover:text-accent">
                      <span className="font-medium text-ink">{a.applicant.profile?.displayName}</span> <span className="text-ink-2">applied to</span>{" "}
                      <span className="font-medium text-ink">{a.project.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {/* Your projects */}
          <section aria-labelledby="your-projects">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="your-projects" className="text-lg font-semibold tracking-[-0.015em]">
                Your projects
              </h2>
              <Link href="/projects?view=mine" className="text-[13px] text-accent hover:underline">
                All
              </Link>
            </div>
            {d.myProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong p-6 text-center">
                <p className="text-sm font-medium">No active projects yet</p>
                <p className="mt-1 text-[13px] text-muted">Join one below, or start your own.</p>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/projects/new">Start a project</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {d.myProjects.map((p) => {
                  const done = p.milestones.filter((m) => m.status === "DONE").length;
                  const mine = p.milestones.filter((m) => m.assigneeId === user.id && m.status !== "DONE");
                  return (
                    <li key={p.id}>
                      <Link href={`/projects/${p.slug}`} className="block px-4 py-4 transition-colors hover:bg-paper/60 sm:px-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{p.title}</span>
                          <Badge tone="outline">{STAGE_LABEL[p.stage]}</Badge>
                          {p.members[0]?.role === "OWNER" && <Badge tone="accent">Owner</Badge>}
                          {p._count.applications > 0 && p.members[0]?.role !== "MEMBER" && <Badge tone="warning">{p._count.applications} to review</Badge>}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                          <StageTrack stage={p.stage} compact />
                          <span className="text-xs tabular text-muted">
                            {done}/{p.milestones.length} milestones · {p._count.members} people
                          </span>
                        </div>
                        {mine.length > 0 && (
                          <p className="mt-2 text-[13px] text-ink-2">
                            <span className="text-muted">Your next milestone:</span> {mine[0]!.title}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Recommended teammates */}
          <section aria-labelledby="rec-teammates">
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <h2 id="rec-teammates" className="text-lg font-semibold tracking-[-0.015em]">
                  People you could build with
                </h2>
                <p className="text-[13px] text-muted">Complementary skills and shared interests, from members who are available.</p>
              </div>
              <Link href="/discover" className="shrink-0 text-[13px] text-accent hover:underline">
                Discover
              </Link>
            </div>
            {d.teammates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-[13px] text-muted">Add skills and interests to your profile to get recommendations.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {d.teammates.map((p) => (
                  <PersonCard key={p.id} person={p} inviteOptions={inviteOptions} compact />
                ))}
              </div>
            )}
          </section>

          {/* Matching projects */}
          <section aria-labelledby="rec-projects">
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <h2 id="rec-projects" className="text-lg font-semibold tracking-[-0.015em]">
                  Projects that need your skills
                </h2>
                <p className="text-[13px] text-muted">Open roles matching your skills and the categories you chose.</p>
              </div>
              <Link href="/projects?open=1" className="shrink-0 text-[13px] text-accent hover:underline">
                Browse
              </Link>
            </div>
            {d.projects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-[13px] text-muted">No matching open roles right now. Check back soon, or start a project.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {d.projects.map((p) => (
                  <li key={p.id} className="relative rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                    <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                      {CATEGORY_LABEL[p.category]} · {STAGE_LABEL[p.stage]} · {COMMITMENT_LABEL[p.commitment]}
                    </p>
                    <Link href={`/projects/${p.slug}`} className="mt-1.5 block font-semibold text-ink after:absolute after:inset-0 hover:text-accent">
                      {p.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{p.tagline}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.roles.slice(0, 2).map((r) => (
                        <Badge key={r.id} tone="accent">
                          {r.title}
                        </Badge>
                      ))}
                    </div>
                    {p.matchedSkillNames.length > 0 && <p className="mt-2 text-xs text-muted">Uses your skills: {p.matchedSkillNames.join(", ")}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-accent px-5 py-4 text-paper">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4" aria-hidden /> AI Mentor
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-paper/80">Honest, specific feedback on your projects — and help finding the right people.</p>
            </div>
            <CardBody className="space-y-1 pt-3">
              {[
                { href: "/mentor/match", icon: Users, label: "Find teammates for an idea" },
                { href: "/mentor/evaluate", icon: Wand2, label: "Evaluate a project" },
                { href: "/mentor/copilot", icon: Sparkles, label: "Plan next steps with Copilot" },
              ].map((t) => (
                <Link key={t.href} href={t.href} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-[13.5px] text-ink-2 hover:bg-paper-2 hover:text-ink">
                  <t.icon className="size-4 text-muted group-hover:text-accent" aria-hidden />
                  {t.label}
                  <ArrowRight className="ml-auto size-3.5 text-faint" aria-hidden />
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent activity" description="Across your projects" />
            <CardBody>
              {d.activity.length === 0 ? (
                <p className="text-[13px] text-muted">Activity from your teams will show up here.</p>
              ) : (
                <ul className="space-y-3">
                  {d.activity.map((a) => (
                    <li key={a.id} className="text-[13px] leading-snug">
                      <span className="font-medium text-ink">{a.actor.profile?.displayName}</span>{" "}
                      <span className="text-ink-2">{ACTIVITY[a.type]}</span>{" "}
                      <Link href={`/projects/${a.project.slug}`} className="font-medium text-ink hover:text-accent">
                        {a.project.title}
                      </Link>
                      {a.detail && a.type !== "PROJECT_CREATED" && <span className="text-muted"> — {a.detail}</span>}
                      <span className="block text-2xs text-faint">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Saved profiles" action={<Link href="/saved" className="text-xs text-accent hover:underline">All</Link>} />
            <CardBody>
              {d.saved.length === 0 ? (
                <p className="text-[13px] text-muted">Save people from Discover to build a shortlist.</p>
              ) : (
                <ul className="space-y-3">
                  {d.saved.map(({ savedUser: u }) => {
                    const p = u.profile!;
                    return (
                      <li key={u.id}>
                        <Link href={`/u/${p.username}`} className="group flex items-center gap-3">
                          <Avatar user={{ id: u.id, displayName: p.displayName, avatarHue: p.avatarHue, hasAvatar: Boolean(p.avatarMime), avatarVersion: p.avatarUpdatedAt?.getTime() ?? null }} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-ink group-hover:text-accent">{p.displayName}</span>
                            <span className="block truncate text-xs text-muted">{p.headline}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
