import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, Sparkles, UsersRound } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { isAIConfigured } from "@/server/ai/config";
import { getMatchRun, listMatchRuns } from "@/server/ai/matcher";
import { listSkills } from "@/server/services/profile";
import { getInviteOptions } from "@/server/services/projects";
import { db } from "@/server/db";
import { AIStatus } from "@/components/ai/ai-status";
import { AdvisoryNote } from "@/components/ai/advisory-note";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkillBadge } from "@/components/profile/skill-badge";
import { InviteButton } from "@/components/profile/profile-actions";
import { AVAILABILITY_LABEL } from "@/lib/taxonomy";
import { formatScore, timeAgo } from "@/lib/utils";
import { MatchForm } from "./match-form";
import { SaveMatchButton } from "./save-match";

export const metadata: Metadata = { title: "Teammate Matcher" };

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ run?: string; project?: string }> }) {
  const user = await requireUser("/mentor/match");
  const { run: runId, project } = await searchParams;
  const [skills, myProjects, runs, inviteOptions] = await Promise.all([
    listSkills(),
    db.project.findMany({ where: { status: "ACTIVE", members: { some: { userId: user.id } } }, select: { id: true, title: true, tagline: true }, orderBy: { updatedAt: "desc" } }),
    listMatchRuns(user.id),
    getInviteOptions(user.id),
  ]);
  const run = runId ? await getMatchRun(user.id, runId.slice(0, 64)) : null;

  if (run) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/mentor/match" className="text-[13px] text-accent hover:underline">
              ← New match
            </Link>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2">
              <span className="text-muted">Your brief ({timeAgo(run.createdAt)}):</span> {run.brief}
            </p>
          </div>
        </div>

        {run.aiError && (
          <div role="status" className="flex gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[13.5px] text-ink-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p>{run.aiError} {run.candidates.length > 0 && "The matches below were selected by skill fit, availability and interests."}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader title="What the project needs" />
            <CardBody className="space-y-4">
              <p className="text-[14.5px] leading-relaxed text-ink-2">{run.requirements.summary}</p>
              {run.requirements.skills.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Key skills</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {run.requirements.skills.map((s) => (
                      <SkillBadge key={s.id} name={s.name} matched={run.coverage.covered.includes(s.name)} />
                    ))}
                  </div>
                </div>
              )}
              {run.requirements.roles.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Roles</Eyebrow>
                  <p className="text-[13.5px] text-ink-2">{run.requirements.roles.map((r) => r.title).join(" · ")}</p>
                </div>
              )}
              {run.requirements.missingFromBrief.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Your brief doesn&apos;t say</Eyebrow>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">
                    {run.requirements.missingFromBrief.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Suggested team" description={run.team ? undefined : "Available when AI explanations are on"} />
            <CardBody className="space-y-3">
              {run.team ? (
                <>
                  <p className="text-[13.5px] leading-relaxed text-ink-2">{run.team.summary}</p>
                  <ul className="divide-y divide-line rounded-md border border-line">
                    {run.team.picks.map((p, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                        <span className="text-muted">{p.role}</span>
                        <span className={p.name ? "font-medium text-ink" : "text-warning"}>{p.name ?? "Nobody yet"}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <div>
                <Eyebrow className="mb-1.5">Skill coverage</Eyebrow>
                <p className="text-[13px] text-ink-2">
                  {run.coverage.covered.length} of {run.coverage.covered.length + run.coverage.missing.length} key skills covered by this shortlist.
                </p>
                {run.coverage.missing.length > 0 && <p className="mt-1 text-[13px] text-warning">Not covered: {run.coverage.missing.join(", ")}</p>}
                {run.uncoveredNeeds.length > 0 && <p className="mt-1 text-[13px] text-muted">Also consider: {run.uncoveredNeeds.join("; ")}</p>}
              </div>
            </CardBody>
          </Card>
        </div>

        <section aria-labelledby="matches-heading">
          <h2 id="matches-heading" className="mb-3 text-lg font-semibold tracking-[-0.015em]">
            {run.candidates.length} {run.candidates.length === 1 ? "match" : "matches"} from real member profiles
          </h2>
          {run.candidates.length === 0 ? (
            <EmptyState icon={UsersRound} title="No available members match yet" description="Try broader skills or fewer requirements — or open a role on your project so people can find you." />
          ) : (
            <ul className="space-y-4">
              {run.candidates.map((c) => {
                const p = c.person;
                const ex = c.explanation;
                return (
                  <li key={p.id} className="rounded-lg border border-line bg-surface p-4 shadow-xs sm:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <Avatar user={p} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/u/${p.username}`} className="font-semibold text-ink hover:text-accent">
                              {p.displayName}
                            </Link>
                            {p.isDemo && <Badge tone="outline">Demo</Badge>}
                            {ex?.suggestedRole && <Badge tone="accent">{ex.suggestedRole}</Badge>}
                          </div>
                          <p className="text-[13px] text-muted">
                            @{p.username} · {p.intendedMajor || p.headline} · {AVAILABILITY_LABEL[p.availability]}
                            {p.rank && <> · #{p.rank.rank} ({formatScore(p.rank.score)} pts)</>}
                          </p>
                          {ex ? (
                            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                              <Sparkles className="mr-1.5 inline size-3.5 -translate-y-px text-accent" aria-label="AI explanation" />
                              {ex.fitSummary}
                            </p>
                          ) : (
                            <p className="mt-3 text-[13.5px] text-ink-2">{p.headline}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 md:flex-col md:items-stretch">
                        <InviteButton size="sm" recipient={{ id: p.id, displayName: p.displayName }} options={inviteOptions} defaultMessage={ex ? `Hi ${p.displayName.split(" ")[0]}! ${run.requirements.summary.slice(0, 200)} I think your experience would be a great fit${ex.suggestedRole ? ` as ${ex.suggestedRole.toLowerCase()}` : ""}.` : undefined} />
                        <SaveMatchButton userId={p.id} saved={p.saved} note={ex ? `${ex.fitSummary}${ex.gaps.length ? ` Gaps: ${ex.gaps.join("; ")}` : ""}` : `Matched on ${c.matchedSkills.join(", ")}`} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-3">
                      <div>
                        <Eyebrow className="mb-2">Matching skills</Eyebrow>
                        <div className="flex flex-wrap gap-1.5">
                          {p.skills.filter((s) => s.matched).map((s) => (
                            <SkillBadge key={s.id} name={s.name} level={s.level} matched />
                          ))}
                          {c.roleMatches.map((r) => (
                            <Badge key={r} tone="neutral">
                              Wants: {r}
                            </Badge>
                          ))}
                        </div>
                        {c.complementarySkills.length > 0 && <p className="mt-2 text-xs text-muted">Adds skills you don&apos;t have: {c.complementarySkills.join(", ")}</p>}
                      </div>
                      <div>
                        <Eyebrow className="mb-2">Strengths</Eyebrow>
                        {ex?.strengths.length ? (
                          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink-2">
                            {ex.strengths.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[13px] text-faint">—</p>
                        )}
                      </div>
                      <div>
                        <Eyebrow className="mb-2">Gaps to discuss</Eyebrow>
                        {ex?.gaps.length ? (
                          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink-2">
                            {ex.gaps.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[13px] text-faint">{ex ? "None noted" : "—"}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <AdvisoryNote>Matches are chosen by Venturely&apos;s algorithm from members who are discoverable and available; the AI only explains them and can make mistakes. Everyone here is a real (or clearly labelled demo) profile.</AdvisoryNote>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <AIStatus userId={user.id} />
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-6">
          <MatchForm skills={skills} projects={myProjects} aiConfigured={isAIConfigured()} defaultProjectId={myProjects.find((p) => p.id === project)?.id} />
        </div>
        <AdvisoryNote>Only members who chose to be discoverable and are available appear. The mentor sees member-visible profile fields for the shortlist — never names, emails or private profiles.</AdvisoryNote>
      </div>
      <aside>
        <Card>
          <CardHeader title="Previous matches" as="h3" />
          <CardBody>
            {runs.length === 0 ? (
              <p className="text-[13px] text-muted">Your match history will appear here.</p>
            ) : (
              <ul className="space-y-2.5">
                {runs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/mentor/match?run=${r.id}`} className="block text-[13px] text-ink-2 hover:text-accent">
                      <span className="line-clamp-2">{r.brief}</span>
                      <span className="text-2xs text-faint">
                        {timeAgo(r.createdAt)}
                        {r.model ? "" : " · skill-based only"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
              <Link href="/discover">Browse everyone instead</Link>
            </Button>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
