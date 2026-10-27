import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Briefcase, Clock, CodeXml, ExternalLink, Globe, Languages, Lock, MapPin, Users } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProfilePage } from "@/server/services/public-profile";
import { getInviteOptions } from "@/server/services/projects";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkillBadge } from "@/components/profile/skill-badge";
import { VerificationBadge } from "@/components/profile/verification-badge";
import { ProfileActions } from "@/components/profile/profile-actions";
import { RankMovement } from "@/components/ranking/rank-indicator";
import { ScoreBreakdown } from "@/components/ranking/score-breakdown";
import { RankHistory } from "@/components/ranking/rank-history";
import {
  ACHIEVEMENT_LEVEL_LABEL,
  ACHIEVEMENT_TYPE_LABEL,
  AVAILABILITY,
  CATEGORY_LABEL,
  EXPERIENCE_LABEL,
  MEMBER_ROLE_LABEL,
  PORTFOLIO_KIND_LABEL,
  RANK_CATEGORY_LABEL,
  REGION_LABEL,
  STAGE_LABEL,
} from "@/lib/taxonomy";
import { cn, displayHost, formatMonthYear, formatScore, safeExternalUrl } from "@/lib/utils";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const data = await getProfilePage(username, viewer?.id ?? null);
  if (!data) return { title: "Profile not found", robots: { index: false } };
  const { profile } = data;
  return {
    title: `${profile.displayName} (@${profile.username})`,
    description: profile.headline || `${profile.displayName} on Venturely`,
    // Only fully public profiles may be indexed.
    robots: { index: profile.visibility === "PUBLIC" && !profile.isDemo },
  };
}

function ExternalLinkRow({ href, icon: Icon, label }: { href: string | null; icon: typeof Globe; label: string }) {
  const safe = safeExternalUrl(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="group flex items-center gap-2.5 rounded-md py-1 text-[13px] text-ink-2 hover:text-accent"
    >
      <Icon className="size-4 text-muted group-hover:text-accent" aria-hidden />
      <span className="sr-only">{label}: </span>
      <span className="truncate">{displayHost(safe)}</span>
      <ArrowUpRight className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </a>
  );
}

export default async function ProfilePage({ params }: Params) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const data = await getProfilePage(username, viewer?.id ?? null);
  if (!data) notFound();
  const { profile, skills, portfolio, achievements, memberships, ranking, isOwner, deliveredCount } = data;
  const inviteOptions = viewer && !isOwner ? await getInviteOptions(viewer.id) : [];
  const availability = AVAILABILITY.find((a) => a.value === profile.availability)!;
  const verifiedCount = achievements.filter((a) => a.status === "VERIFIED").length;
  const g = ranking.global;

  return (
    <div className="space-y-8">
      {isOwner && profile.visibility !== "PUBLIC" && (
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-muted">
          <Lock className="size-4" aria-hidden />
          {profile.visibility === "PRIVATE"
            ? "Your profile is private — only you can see this page."
            : "Visible to signed-in members only."}{" "}
          <Link href="/settings/profile#links" className="text-accent hover:underline">
            Change visibility
          </Link>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <Avatar user={profile} size="xl" />
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {profile.isDemo && <Badge tone="info">Demo account</Badge>}
              <Badge tone={profile.availability === "NOT_AVAILABLE" ? "neutral" : "positive"}>
                <Clock aria-hidden /> {availability.label} · {availability.hint}
              </Badge>
            </div>
            <h1 className="font-display text-[44px] leading-[1] tracking-[-0.01em] text-ink sm:text-[52px]">{profile.displayName}</h1>
            <p className="mt-2 text-sm text-muted">
              @{profile.username}
              {profile.intendedMajor && <> · {profile.intendedMajor}</>}
              {profile.region && (
                <>
                  {" "}
                  · <MapPin className="inline size-3.5 -translate-y-px" aria-hidden /> {REGION_LABEL[profile.region]}
                </>
              )}
            </p>
            {profile.headline && <p className="mt-3 max-w-xl text-[17px] leading-snug text-ink-2 text-pretty">{profile.headline}</p>}
          </div>
        </div>
        <ProfileActions
          isOwner={isOwner}
          signedIn={Boolean(viewer)}
          user={{ id: profile.id, displayName: profile.displayName, username: profile.username }}
          saved={data.isSaved}
          inviteOptions={inviteOptions}
        />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-10">
          {/* At a glance */}
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
            {[
              { label: "Global rank", value: g ? `#${g.rank}` : "—", sub: g ? `of ${g.total}` : "Not yet ranked" },
              { label: "Verified achievements", value: String(verifiedCount), sub: `${achievements.length} listed` },
              { label: "Projects", value: String(memberships.length), sub: `${memberships.filter((m) => ["LAUNCHED", "COMPLETED"].includes(m.project.stage)).length} launched or completed` },
              { label: "Milestones delivered", value: String(deliveredCount), sub: "Assigned & completed" },
            ].map((s) => (
              <div key={s.label} className="bg-surface px-4 py-3.5">
                <dt className="text-xs text-muted">{s.label}</dt>
                <dd className="mt-1 font-mono text-xl font-medium tabular text-ink">{s.value}</dd>
                <dd className="text-2xs text-faint">{s.sub}</dd>
              </div>
            ))}
          </dl>

          {profile.bio && (
            <section aria-labelledby="about">
              <Eyebrow id="about" className="mb-3">
                About
              </Eyebrow>
              <p className="max-w-2xl whitespace-pre-line text-[15.5px] leading-[1.7] text-ink-2 text-pretty">{profile.bio}</p>
            </section>
          )}

          {/* Portfolio */}
          <section aria-labelledby="portfolio-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="portfolio-heading" className="text-lg font-semibold tracking-[-0.015em]">
                Portfolio
              </h2>
              {isOwner && (
                <Link href="/settings/portfolio" className="text-[13px] text-accent hover:underline">
                  Edit portfolio
                </Link>
              )}
            </div>
            {portfolio.length === 0 ? (
              <EmptyState
                compact
                title={isOwner ? "Your portfolio is empty" : "No portfolio entries yet"}
                description={isOwner ? "Add the work you're proudest of — with links and the outcomes it achieved." : undefined}
              />
            ) : (
              <ol className="divide-y divide-line border-y border-line">
                {portfolio.map((item) => {
                  const projectUrl = safeExternalUrl(item.projectUrl);
                  const evidenceUrl = safeExternalUrl(item.evidenceUrl);
                  return (
                    <li key={item.id} className="grid gap-3 py-6 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6">
                      <div className="text-xs text-muted">
                        <p className="font-mono tabular">{formatMonthYear(item.date)}</p>
                        <p className="mt-1">{PORTFOLIO_KIND_LABEL[item.kind]}</p>
                        <p>{CATEGORY_LABEL[item.category]}</p>
                      </div>
                      <article>
                        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{item.title}</h3>
                        <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">{item.description}</p>
                        {(item.contribution || item.outcome) && (
                          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                            {item.contribution && (
                              <div className="border-l-2 border-line-strong pl-3">
                                <dt className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">My contribution</dt>
                                <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{item.contribution}</dd>
                              </div>
                            )}
                            {item.outcome && (
                              <div className="border-l-2 border-accent pl-3">
                                <dt className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Outcome</dt>
                                <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{item.outcome}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                          {item.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {item.skills.map((s) => (
                                <SkillBadge key={s.id} name={s.name} />
                              ))}
                            </div>
                          )}
                          {projectUrl && (
                            <a href={projectUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
                              View project <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          )}
                          {evidenceUrl && (
                            <a href={evidenceUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-accent hover:underline">
                              Evidence <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          )}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Achievements */}
          <section aria-labelledby="achievements-heading">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="achievements-heading" className="text-lg font-semibold tracking-[-0.015em]">
                Achievements
              </h2>
              <p className="text-xs text-muted">
                <BadgeCheck className="mr-1 inline size-3.5 -translate-y-px text-accent" aria-hidden />
                Verified = evidence reviewed by a Venturely moderator
              </p>
            </div>
            {achievements.length === 0 ? (
              <EmptyState compact title="No achievements listed yet" />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {achievements.map((a) => {
                  const evidence = safeExternalUrl(a.evidenceUrl);
                  return (
                    <li
                      key={a.id}
                      className={cn(
                        "flex flex-col rounded-lg border bg-surface p-4",
                        a.status === "VERIFIED" ? "border-accent-line" : "border-line",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                          {ACHIEVEMENT_LEVEL_LABEL[a.level]} · {ACHIEVEMENT_TYPE_LABEL[a.type]}
                        </p>
                        <VerificationBadge status={a.status} />
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{a.title}</h3>
                      <p className="mt-0.5 text-xs text-muted">
                        {a.issuer && <>{a.issuer} · </>}
                        {formatMonthYear(a.date)}
                      </p>
                      {a.description && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{a.description}</p>}
                      {evidence && (
                        <a href={evidence} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-3 inline-flex items-center gap-1 self-start text-xs text-accent hover:underline">
                          Evidence <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Projects */}
          <section aria-labelledby="projects-heading">
            <h2 id="projects-heading" className="mb-4 text-lg font-semibold tracking-[-0.015em]">
              Projects &amp; contributions
            </h2>
            {memberships.length === 0 ? (
              <EmptyState compact title="Not on any visible projects yet" />
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {memberships.map((m) => (
                  <li key={m.project.id}>
                    <Link href={`/projects/${m.project.slug}`} className="group block px-4 py-4 transition-colors hover:bg-paper/60 sm:px-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink group-hover:text-accent">{m.project.title}</span>
                        <Badge tone="outline">{STAGE_LABEL[m.project.stage]}</Badge>
                        {m.project.status === "ARCHIVED" && <Badge>Archived</Badge>}
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
                          <Users className="size-3.5" aria-hidden /> {m.project._count.members}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted">
                        {m.title || MEMBER_ROLE_LABEL[m.role]} · {CATEGORY_LABEL[m.project.category]} · joined {formatMonthYear(m.joinedAt)}
                      </p>
                      {m.responsibilities && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{m.responsibilities}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader
              title="Ranking"
              description={g ? `Updated ${ranking.computedAt?.toLocaleDateString("en", { month: "short", day: "numeric" })}` : undefined}
              action={
                <Link href="/leaderboard/methodology" className="text-xs text-accent hover:underline">
                  How it works
                </Link>
              }
            />
            <CardBody>
              {g ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-3xl font-medium tabular">#{g.rank}</span>
                    <span className="text-sm tabular text-muted">{formatScore(g.score)} pts</span>
                    <RankMovement movement={g.movement} className="ml-auto" />
                  </div>
                  {g.breakdown.provisional && (
                    <p className="mt-2 text-xs leading-relaxed text-warning">
                      Provisional — no verified achievements or evidence-backed launches yet.
                    </p>
                  )}
                  <ScoreBreakdown breakdown={g.breakdown} className="mt-4" />
                  <RankHistory points={ranking.history} className="mt-5" />
                  {ranking.categories.length > 0 && (
                    <div className="mt-5 border-t border-line pt-4">
                      <Eyebrow className="mb-2">Category ranks</Eyebrow>
                      <ul className="space-y-1">
                        {ranking.categories.map((c) => (
                          <li key={c.category} className="flex justify-between text-[13px]">
                            <Link href={`/leaderboard?category=${c.category.toLowerCase()}`} className="text-ink-2 hover:text-accent">
                              {RANK_CATEGORY_LABEL[c.category]}
                            </Link>
                            <span className="font-mono tabular text-ink">#{c.rank}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted">
                  Not ranked yet. Rankings reflect evidence — verified achievements, shipped projects and completed milestones.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Skills" description={EXPERIENCE_LABEL[profile.experienceLevel]} />
            <CardBody>
              {skills.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <SkillBadge key={s.skill.id} name={s.skill.name} level={s.level} />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted">No skills listed.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-5 pt-5">
              {profile.preferredRoles.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Wants to work as</Eyebrow>
                  <p className="text-[13.5px] text-ink-2">{profile.preferredRoles.join(" · ")}</p>
                </div>
              )}
              {profile.preferredCategories.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Interested in</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.preferredCategories.map((c) => (
                      <Badge key={c} tone="neutral">
                        {CATEGORY_LABEL[c]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.causes.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Causes</Eyebrow>
                  <p className="text-[13.5px] text-ink-2">{profile.causes.join(" · ")}</p>
                </div>
              )}
              {profile.academicInterests.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Academic interests</Eyebrow>
                  <p className="text-[13.5px] text-ink-2">{profile.academicInterests.join(" · ")}</p>
                </div>
              )}
              {profile.languages.length > 0 && (
                <div>
                  <Eyebrow className="mb-2">Languages</Eyebrow>
                  <p className="flex items-center gap-2 text-[13.5px] text-ink-2">
                    <Languages className="size-4 text-muted" aria-hidden /> {profile.languages.join(", ")}
                  </p>
                </div>
              )}
              {(profile.githubUrl || profile.websiteUrl || profile.linkedinUrl) && (
                <div>
                  <Eyebrow className="mb-1">Links</Eyebrow>
                  <ExternalLinkRow href={profile.githubUrl} icon={CodeXml} label="GitHub" />
                  <ExternalLinkRow href={profile.websiteUrl} icon={Globe} label="Website" />
                  <ExternalLinkRow href={profile.linkedinUrl} icon={Briefcase} label="LinkedIn" />
                </div>
              )}
              <p className="text-2xs text-faint">Member since {formatMonthYear(profile.createdAt)}</p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
