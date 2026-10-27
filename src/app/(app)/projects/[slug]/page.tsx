import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowUpRight, Clock, CodeXml, Globe, Inbox, Lock, Pencil, Sparkles, Users, Wand2 } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectPage } from "@/server/services/projects";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, Eyebrow } from "@/components/ui/card";
import { StageTrack } from "@/components/project/stage-track";
import { ApplyButton, CreatedBanner, MemberActions, MilestoneList, ProjectMenu } from "@/components/project/project-interactions";
import { CATEGORY_LABEL, COMMITMENT_LABEL, MEMBER_ROLE_LABEL, STAGE_LABEL } from "@/lib/taxonomy";
import { displayHost, safeExternalUrl, timeAgo } from "@/lib/utils";
import type { ActivityType } from "@prisma/client";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ created?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const data = await getProjectPage(slug, viewer?.id ?? null);
  if (!data) return { title: "Project not found", robots: { index: false } };
  return {
    title: data.project.title,
    description: data.project.tagline,
    robots: { index: data.project.visibility === "PUBLIC" && !data.project.owner.isDemo },
  };
}

const ACTIVITY_TEXT: Record<ActivityType, (d: string) => string> = {
  PROJECT_CREATED: () => "started the project",
  STAGE_CHANGED: (d) => `moved the project to ${d}`,
  MEMBER_JOINED: (d) => (d ? `joined as ${d}` : "joined the team"),
  MILESTONE_ADDED: (d) => `added milestone “${d}”`,
  MILESTONE_COMPLETED: (d) => `completed “${d}”`,
  ROLE_OPENED: (d) => `opened a role: ${d}`,
  PROJECT_UPDATED: (d) => (d ? d.charAt(0).toLowerCase() + d.slice(1) : "updated project details"),
};

function TextBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <section>
      <Eyebrow className="mb-2">{title}</Eyebrow>
      <p className="whitespace-pre-line text-[15px] leading-[1.7] text-ink-2">{body}</p>
    </section>
  );
}

export default async function ProjectPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { created } = await searchParams;
  const viewer = await getCurrentUser();
  const data = await getProjectPage(slug, viewer?.id ?? null);
  if (!data) notFound();
  const { project, membership, isManager, isOwner, pendingApplication, pendingInvitation, pendingCounts, myFeedback } = data;
  const openRoles = project.roles.filter((r) => r.isOpen);
  const repo = safeExternalUrl(project.repoUrl);
  const demo = safeExternalUrl(project.demoUrl);
  const archived = project.status === "ARCHIVED";
  const members = project.members.filter((m) => m.user.profile);
  const feedbackBySubject = new Map(myFeedback.map((f) => [f.subjectId, f]));

  return (
    <div>
      {created && isOwner && <CreatedBanner />}
      {archived && (
        <div className="mb-6 rounded-lg border border-line bg-paper-2 px-4 py-3 text-sm text-ink-2">
          This project is archived. It&apos;s hidden from discovery and only visible to the team.
        </div>
      )}

      {/* Header */}
      <header className="border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
          <Link href={`/projects?category=${project.category.toLowerCase()}`} className="hover:text-accent">
            {CATEGORY_LABEL[project.category]}
          </Link>
          <span aria-hidden>·</span>
          <span>{STAGE_LABEL[project.stage]}</span>
          {project.visibility === "MEMBERS" && (
            <Badge tone="outline" className="normal-case tracking-normal">
              <Lock aria-hidden /> Members only
            </Badge>
          )}
          {project.owner.isDemo && (
            <Badge tone="info" className="normal-case tracking-normal">
              Demo project
            </Badge>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[40px]">{project.title}</h1>
            <p className="mt-3 text-[17px] leading-snug text-ink-2 text-pretty">{project.tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isManager && !archived && (
              <>
                <Button asChild variant="secondary">
                  <Link href={`/projects/${project.slug}/edit`}>
                    <Pencil /> Edit
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/mentor/evaluate?project=${project.id}`}>
                    <Wand2 /> Evaluate
                  </Link>
                </Button>
              </>
            )}
            {membership && !archived && (
              <Button asChild variant={isManager ? "primary" : "secondary"}>
                <Link href={`/mentor/copilot?project=${project.id}`}>
                  <Sparkles /> Copilot
                </Link>
              </Button>
            )}
            {!membership && viewer && !archived && (
              pendingInvitation ? (
                <Button asChild>
                  <Link href="/requests">
                    <Inbox /> You&apos;re invited — respond
                  </Link>
                </Button>
              ) : (
                <ApplyButton
                  projectId={project.id}
                  projectTitle={project.title}
                  roles={openRoles.map((r) => ({ id: r.id, title: r.title }))}
                  pendingApplicationId={pendingApplication?.id}
                />
              )
            )}
            {!viewer && (
              <Button asChild>
                <Link href={`/sign-up?next=/projects/${project.slug}`}>Join to apply</Link>
              </Button>
            )}
            <ProjectMenu
              projectId={project.id}
              slug={project.slug}
              title={project.title}
              isOwner={isOwner}
              isMember={Boolean(membership)}
              archived={archived}
              signedIn={Boolean(viewer)}
            />
          </div>
        </div>
        <div className="mt-8 max-w-3xl">
          <StageTrack stage={project.stage} />
        </div>
      </header>

      {isManager && (pendingCounts.applications > 0 || pendingCounts.invitations > 0) && (
        <Link
          href="/requests?tab=incoming"
          className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-accent-line bg-accent-softer px-4 py-3 text-sm transition-colors hover:bg-accent-soft"
        >
          <span className="text-ink-2">
            {pendingCounts.applications > 0 && (
              <>
                <span className="font-medium text-ink">{pendingCounts.applications}</span> pending application{pendingCounts.applications === 1 ? "" : "s"}
              </>
            )}
            {pendingCounts.applications > 0 && pendingCounts.invitations > 0 && " · "}
            {pendingCounts.invitations > 0 && <>{pendingCounts.invitations} invitation{pendingCounts.invitations === 1 ? "" : "s"} awaiting a reply</>}
          </span>
          <span className="font-medium text-accent">Review</span>
        </Link>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <div className="space-y-8">
            <TextBlock title="About" body={project.description} />
            <TextBlock title="Goals" body={project.goals} />
            <TextBlock title="Outcomes so far" body={project.outcomes} />
          </div>

          {/* Open roles */}
          <section aria-labelledby="roles-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="roles-heading" className="text-lg font-semibold tracking-[-0.015em]">
                Open roles
              </h2>
              {isManager && !archived && (
                <Link href={`/projects/${project.slug}/edit#roles`} className="text-[13px] text-accent hover:underline">
                  Manage roles
                </Link>
              )}
            </div>
            {openRoles.length === 0 ? (
              <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">
                {isManager ? "No open roles. Add roles so the right people can apply." : "This team isn't recruiting for specific roles right now."}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {openRoles.map((r) => (
                  <li key={r.id} className="flex flex-col rounded-lg border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-ink">{r.title}</h3>
                      <span className="shrink-0 text-xs text-muted">{COMMITMENT_LABEL[r.commitment]}</span>
                    </div>
                    {r.description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{r.description}</p>}
                    {r.skills.length > 0 && <p className="mt-2 text-xs text-muted">{r.skills.map((s) => s.name).join(" · ")}</p>}
                    {viewer && !membership && !pendingApplication && !pendingInvitation && !archived && (
                      <div className="mt-auto pt-3">
                        <ApplyButton
                          size="sm"
                          variant="secondary"
                          label="Apply for this role"
                          projectId={project.id}
                          projectTitle={project.title}
                          roles={openRoles.map((x) => ({ id: x.id, title: x.title }))}
                          defaultRoleId={r.id}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Milestones */}
          <section aria-labelledby="milestones-heading">
            <h2 id="milestones-heading" className="mb-1 text-lg font-semibold tracking-[-0.015em]">
              Milestones
            </h2>
            <MilestoneList
              projectId={project.id}
              canEdit={Boolean(membership) && !archived}
              canDelete={isManager && !archived}
              members={members.map((m) => ({ userId: m.userId, displayName: m.user.profile!.displayName }))}
              milestones={project.milestones.map((m) => ({
                id: m.id,
                title: m.title,
                description: m.description,
                status: m.status,
                dueDate: m.dueDate?.toISOString() ?? null,
                completedAt: m.completedAt?.toISOString() ?? null,
                evidenceUrl: m.evidenceUrl,
                assigneeId: m.assigneeId,
                assigneeName: m.assignee?.profile?.displayName ?? null,
              }))}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Team" description={`${members.length} ${members.length === 1 ? "member" : "members"}`} action={<Users className="size-4 text-faint" aria-hidden />} />
            <CardBody className="px-2 pb-2">
              <ul>
                {members.map((m) => {
                  const p = m.user.profile!;
                  return (
                    <li key={m.id} className="flex items-start gap-3 rounded-md px-3 py-2.5">
                      <Avatar user={{ id: m.userId, displayName: p.displayName, avatarHue: p.avatarHue, hasAvatar: Boolean(p.avatarMime), avatarVersion: p.avatarUpdatedAt?.getTime() ?? null }} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/u/${p.username}`} className="truncate text-sm font-medium text-ink hover:text-accent">
                            {p.displayName}
                          </Link>
                          {m.role !== "MEMBER" && <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>{MEMBER_ROLE_LABEL[m.role]}</Badge>}
                        </div>
                        <p className="truncate text-xs text-muted">{m.title || "Team member"}</p>
                        {m.responsibilities && <p className="mt-1 text-xs leading-relaxed text-ink-2">{m.responsibilities}</p>}
                      </div>
                      <MemberActions
                        projectId={project.id}
                        viewerId={viewer?.id ?? null}
                        viewerRole={membership?.role ?? null}
                        existingFeedback={feedbackBySubject.get(m.userId)}
                        member={{ id: m.id, userId: m.userId, displayName: p.displayName, role: m.role, title: m.title, responsibilities: m.responsibilities }}
                      />
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4 pt-5 text-[13px]">
              <div className="flex items-center gap-2 text-ink-2">
                <Clock className="size-4 text-muted" aria-hidden /> Expected commitment: {COMMITMENT_LABEL[project.commitment]}
              </div>
              {project.skills.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Skills</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {project.skills.map((s) => (
                      <Badge key={s.id} tone="neutral">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(repo || demo) && (
                <div className="space-y-1">
                  <Eyebrow className="mb-1">Links</Eyebrow>
                  {demo && (
                    <a href={demo} target="_blank" rel="noopener noreferrer nofollow ugc" className="flex items-center gap-2 text-ink-2 hover:text-accent">
                      <Globe className="size-4 text-muted" aria-hidden /> <span className="truncate">{displayHost(demo)}</span>
                      <ArrowUpRight className="ml-auto size-3.5" aria-hidden />
                    </a>
                  )}
                  {repo && (
                    <a href={repo} target="_blank" rel="noopener noreferrer nofollow ugc" className="flex items-center gap-2 text-ink-2 hover:text-accent">
                      <CodeXml className="size-4 text-muted" aria-hidden /> <span className="truncate">{displayHost(repo)}</span>
                      <ArrowUpRight className="ml-auto size-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              )}
              <p className="text-2xs text-faint">
                Started {timeAgo(project.createdAt)} · updated {timeAgo(project.updatedAt)}
              </p>
            </CardBody>
          </Card>

          {project.activity.length > 0 && (
            <Card>
              <CardHeader title="Recent activity" action={<Activity className="size-4 text-faint" aria-hidden />} />
              <CardBody>
                <ol className="relative space-y-3 border-l border-line pl-4">
                  {project.activity.map((a) => (
                    <li key={a.id} className="text-[13px] leading-snug">
                      <span className="absolute -left-[3.5px] mt-1.5 size-1.5 rounded-full bg-line-strong" aria-hidden />
                      <span className="font-medium text-ink">{a.actor.profile?.displayName ?? "Someone"}</span>{" "}
                      <span className="text-ink-2">{ACTIVITY_TEXT[a.type](a.detail)}</span>
                      <span className="block text-2xs text-faint">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
