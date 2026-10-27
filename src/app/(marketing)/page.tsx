import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, CircleDashed, EyeOff, FileDiff, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/profile/skill-badge";
import { PersonCard } from "@/components/profile/person-card";
import { StageTrack } from "@/components/project/stage-track";
import { RankMovement } from "@/components/ranking/rank-indicator";
import type { PersonCard as PersonCardData } from "@/server/services/discovery";

export const metadata: Metadata = {
  title: { absolute: "Venturely — find your team, build real projects" },
};

// Illustrative, fictional example data for product previews. Real member profiles are never shown on marketing pages.
const EXAMPLE_PERSON: PersonCardData = {
  id: "example-1",
  isDemo: false,
  username: "lina.k",
  displayName: "Lina Karimova",
  headline: "Computer vision for accessibility — building an offline sign reader for budget phones",
  bio: "",
  intendedMajor: "Computer Science",
  availability: "PART_TIME",
  experienceLevel: "ADVANCED",
  avatarHue: 200,
  hasAvatar: false,
  avatarVersion: null,
  skills: [
    { id: "s1", name: "Computer vision", level: "EXPERT", matched: true },
    { id: "s2", name: "Python", level: "PROFICIENT", matched: true },
    { id: "s3", name: "Kotlin", level: "PRACTICED", matched: false },
  ],
  extraSkills: 3,
  achievements: [{ id: "a1", title: "International AI Olympiad — Honourable Mention", status: "VERIFIED" }],
  projects: [{ slug: "x", title: "SignSense", stage: "PROTOTYPE" }],
  rank: { rank: 5, score: 84.3 },
  saved: false,
};

const EXAMPLE_BOARD = [
  { rank: 1, name: "Tomás R.", hue: 30, line: "Robotics · OpenArm", score: 108.0, verified: 65, move: 2 },
  { rank: 2, name: "Arjun M.", hue: 230, line: "Software · Plannr", score: 90.9, verified: 48, move: 0 },
  { rank: 3, name: "Sofia R.", hue: 120, line: "Sustainability · Street Heat", score: 87.2, verified: 18, move: 3 },
  { rank: 4, name: "Maya O.", hue: 150, line: "Sustainability · AirWatch", score: 86.7, verified: 18, move: -1 },
];

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: React.ReactNode; body: string }) {
  return (
    <div className="max-w-xl">
      <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink text-balance sm:text-[38px]">{title}</h2>
      <p className="mt-4 text-[16px] leading-relaxed text-ink-2 text-pretty">{body}</p>
    </div>
  );
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const findTeam = user ? "/discover" : "/sign-up";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden /> For student founders, engineers, researchers &amp; designers
            </p>
            <h1 className="mt-6 font-display text-[52px] leading-[0.98] tracking-[-0.015em] text-ink sm:text-[72px]">
              Find the people who make your ideas <em className="text-accent">real.</em>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-2 text-pretty">
              Venturely is where ambitious students find teammates, ship projects that matter, and build a portfolio backed by evidence — with an AI mentor that gives honest, specific feedback.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={findTeam}>
                  Find your team <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/projects">Explore projects</Link>
              </Button>
            </div>
            <p className="mt-5 text-[13px] text-muted">Free for students 13+. Private by default — you choose what&apos;s public.</p>
          </div>

          {/* Product composition built from real app components */}
          <div className="relative mx-auto w-full max-w-[520px]" aria-label="Product preview" role="img">
            <div className="relative z-10 rotate-[-1.2deg] shadow-pop">
              <PersonCard person={EXAMPLE_PERSON} footer={<span className="text-xs font-medium text-accent">View profile →</span>} />
            </div>
            <div className="relative z-20 -mt-6 ml-10 rounded-lg border border-line bg-surface p-4 shadow-pop sm:ml-24">
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Sustainability · Launched</p>
              <p className="mt-1 font-semibold">AirWatch</p>
              <p className="text-[13px] text-ink-2">Open, low-cost air-quality sensors schools build themselves</p>
              <div className="mt-3">
                <StageTrack stage="LAUNCHED" compact />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="accent">Frontend engineer</Badge>
                <Badge tone="accent">UX researcher</Badge>
              </div>
            </div>
            <div className="absolute -right-2 top-8 z-30 hidden w-48 rounded-lg border border-line bg-surface-raised p-3 shadow-pop sm:block">
              <p className="flex items-center gap-1.5 text-xs font-medium text-accent-ink">
                <Sparkles className="size-3.5 text-accent" aria-hidden /> Mentor match
              </p>
              <p className="mt-1 text-[12px] leading-snug text-ink-2">Adds on-device ML your team doesn&apos;t have yet; strongest fit for the vision pipeline.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-faint">How it works</p>
          <ol className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              ["01", "Build a profile around evidence", "Skills with honest proficiency, projects with links and outcomes, achievements you can verify. No follower counts."],
              ["02", "Find — or form — a team", "Search by skills, availability, languages and causes. Apply to open roles, or invite people to yours."],
              ["03", "Ship, document, improve", "Track milestones, record who did what, and get candid AI feedback before you show your work to the world."],
            ].map(([n, title, body]) => (
              <li key={n} className="border-t border-ink pt-5">
                <span className="font-mono text-sm text-faint">{n}</span>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Discovery */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <SectionIntro
            eyebrow="Teammate discovery"
            title="Search for the skill you’re missing, not the loudest profile."
            body="Filter by skills and proficiency, intended major, experience, availability, language and the causes people care about. Results rank by fit to your project — complementary skills first."
          />
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3 text-sm text-muted">
              <span className="text-faint">⌕</span> computer vision
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Available: part-time", "Language: Arabic", "Cause: Accessibility", "Experience: Building"].map((f) => (
                <span key={f} className="inline-flex h-7 items-center gap-1 rounded-full border border-accent bg-accent-soft px-2.5 text-xs font-medium text-accent-ink">
                  <Check className="size-3" aria-hidden /> {f}
                </span>
              ))}
            </div>
            <ul className="mt-4 divide-y divide-line rounded-md border border-line">
              {[
                { n: "Lina K.", h: 200, m: "Computer Science", s: ["Computer vision", "Python"] },
                { n: "Daniel N.", h: 210, m: "Mathematics", s: ["Python", "Statistics"] },
                { n: "Grace W.", h: 160, m: "Computer Science", s: ["Machine learning", "SQL"] },
              ].map((p) => (
                <li key={p.n} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar user={{ id: p.n, displayName: p.n, avatarHue: p.h }} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.n}</p>
                    <p className="text-xs text-muted">{p.m}</p>
                  </div>
                  <div className="hidden gap-1 sm:flex">
                    {p.s.map((s, i) => (
                      <SkillBadge key={s} name={s} matched={i === 0} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <article className="rounded-xl border border-line bg-paper p-6">
              <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
                <div className="text-xs text-muted">
                  <p className="font-mono">Jul 2026</p>
                  <p className="mt-1">Project</p>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold">AirWatch sensor v2</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">A €35 particulate sensor a school lab can assemble in one afternoon.</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="border-l-2 border-line-strong pl-3">
                      <dt className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">My contribution</dt>
                      <dd className="mt-1 text-[13px] text-ink-2">PCB design, firmware, two assembly workshops.</dd>
                    </div>
                    <div className="border-l-2 border-accent pl-3">
                      <dt className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Outcome</dt>
                      <dd className="mt-1 text-[13px] text-ink-2">12 nodes in 3 schools; error cut from 38% to 9%.</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                <div className="rounded-md border border-accent-line bg-surface p-3">
                  <Badge tone="accent">
                    <BadgeCheck aria-hidden /> Verified
                  </Badge>
                  <p className="mt-2 text-[13px] font-medium">Regional Science Fair — First Place</p>
                </div>
                <div className="rounded-md border border-line bg-surface p-3">
                  <Badge tone="outline">
                    <CircleDashed aria-hidden /> Self-reported
                  </Badge>
                  <p className="mt-2 text-[13px] font-medium">Applied ML certificate</p>
                </div>
              </div>
            </article>
          </div>
          <div className="order-1 lg:order-2">
            <SectionIntro
              eyebrow="Portfolios"
              title="A record of what you actually did."
              body="Every entry separates your contribution from the team’s and asks for outcomes and evidence. Achievements are marked self-reported until a moderator checks the evidence — we never call something verified unless it is."
            />
          </div>
        </div>
      </section>

      {/* Rankings */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <SectionIntro
                eyebrow="Rankings"
                title="Ranked on evidence. Never on popularity."
                body="Scores are computed on our servers from verified achievements, shipped projects, completed milestones, evidenced skills and safeguarded teammate feedback. The formula is public."
              />
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold">Counts</p>
                  <ul className="mt-2 space-y-1.5 text-[14px] text-ink-2">
                    {["Verified achievements", "Launched work with documented outcomes", "Milestones you delivered", "Skills backed by real work", "Feedback from actual teammates"].map((s) => (
                      <li key={s} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold">Never counts</p>
                  <ul className="mt-2 space-y-1.5 text-[14px] text-ink-2">
                    {["Followers or profile views", "Number of projects started", "Posting activity", "Unbacked skill claims", "Ratings from strangers"].map((s) => (
                      <li key={s} className="flex gap-2">
                        <X className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Link href="/leaderboard/methodology" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                Read the full methodology <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
              <div className="flex items-center gap-1 border-b border-line bg-paper-2 p-1.5 text-[12px]">
                {["Overall", "AI", "Engineering", "Research", "Impact"].map((t, i) => (
                  <span key={t} className={i === 0 ? "rounded-md bg-surface-raised px-2.5 py-1 font-medium shadow-sm" : "px-2.5 py-1 text-muted"}>
                    {t}
                  </span>
                ))}
              </div>
              <table className="w-full text-sm">
                <caption className="sr-only">Example leaderboard</caption>
                <thead className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                  <tr className="border-b border-line">
                    <th className="w-12 px-4 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">Member</th>
                    <th className="hidden px-2 py-2 text-left sm:table-cell">Verified</th>
                    <th className="px-2 py-2">7d</th>
                    <th className="px-4 py-2 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {EXAMPLE_BOARD.map((r) => (
                    <tr key={r.rank}>
                      <td className="px-4 py-3 font-mono tabular">{r.rank}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar user={{ id: r.name, displayName: r.name, avatarHue: r.hue }} size="sm" />
                          <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted">{r.line}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 sm:table-cell">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-2">
                          <div className="h-full bg-accent" style={{ width: `${r.verified}%` }} />
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <RankMovement movement={r.move} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular">{r.score.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* AI mentor */}
      <section className="border-b border-line bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-accent-line">AI Mentor</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-balance sm:text-[38px]">Feedback that tells you what to fix next.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-paper/75">
              Three tools, built into your workflow: a matcher that explains why real members fit your project, an evaluator that reviews your work across ten dimensions, and a copilot that remembers your project and proposes edits you approve.
            </p>
            <ul className="mt-6 space-y-2.5 text-[14px] text-paper/80">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-line" aria-hidden /> Only recommends people who actually exist on Venturely and are open to it.
              </li>
              <li className="flex gap-2.5">
                <FileDiff className="mt-0.5 size-4 shrink-0 text-accent-line" aria-hidden /> Never changes your project without your review.
              </li>
              <li className="flex gap-2.5">
                <EyeOff className="mt-0.5 size-4 shrink-0 text-accent-line" aria-hidden /> Advisory only — no fake “admission chances”, no talent scores.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-paper/10 bg-[#1f2226] p-5">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-paper/50">Evaluation · AirWatch</p>
            <p className="mt-2 font-display text-[22px] leading-snug">
              A genuinely useful prototype with real deployment data. The biggest gap is showing teachers can act on the readings.
            </p>
            <ul className="mt-5 divide-y divide-paper/10 border-t border-paper/10 text-[13px]">
              {[
                ["Evidence of progress", "Strong", 4],
                ["Measurable outcomes", "Solid", 3],
                ["Execution plan", "Developing", 2],
                ["Presentation quality", "Needs work", 1],
              ].map(([k, v, n]) => (
                <li key={k as string} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-paper/80">{k}</span>
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5" aria-hidden>
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={i <= (n as number) ? "h-3 w-1.5 rounded-sm bg-accent-line" : "h-3 w-1.5 rounded-sm bg-paper/15"} />
                      ))}
                    </span>
                    <span className="w-20 text-right text-paper/70">{v}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-md border border-paper/10 bg-paper/5 p-3 text-[13px] text-paper/80">
              <span className="font-medium text-paper">Next:</span> Interview three teachers about which readings would change a decision in their classroom.
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionIntro
            eyebrow="Built with care"
            title="Designed for teenagers from day one."
            body="Most members are under 18, so privacy and safety are defaults, not settings you have to find."
          />
          <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Lock, "Private by default", "Profiles are members-only unless you choose public. Emails are never shown."],
              [EyeOff, "Minimal data", "No birthdays, schools or exact locations — just a coarse region if you want."],
              [ShieldCheck, "Block & report", "Anyone can block or report. Moderators review every report."],
              [BadgeCheck, "Honest signals", "Verified means checked. Rankings are explained, not mysterious."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof Lock;
              return (
                <div key={title as string}>
                  <dt className="flex items-center gap-2 font-semibold">
                    <I className="size-4 text-accent" aria-hidden /> {title as string}
                  </dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-ink-2">{body as string}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl font-display text-[44px] leading-[1.02] tracking-[-0.01em] sm:text-[60px]">Your next project deserves a great team.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href={findTeam}>
                Find your team <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/projects">Explore projects</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
