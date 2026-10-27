import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RANKING_CONFIG, FORMULA_VERSION } from "@/lib/ranking/formula";
import { ACHIEVEMENT_LEVEL_LABEL, STAGE_LABEL } from "@/lib/taxonomy";

export const metadata: Metadata = { title: "How ranking works" };

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-line py-8 sm:grid-cols-[48px_minmax(0,1fr)]">
      <span className="font-mono text-sm text-faint">{String(n).padStart(2, "0")}</span>
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.015em]">{title}</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </section>
  );
}

export default function MethodologyPage() {
  const c = RANKING_CONFIG;
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Leaderboard
      </Link>
      <h1 className="mt-6 font-display text-[44px] leading-[1.05] tracking-[-0.01em] sm:text-[56px]">How ranking works</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
        Venturely rankings reward work you can show — not how many people follow you, how often you post, or how many projects you start. Every score is computed on our servers from the
        records below. Nobody, including you, can edit a score directly.
      </p>
      <p className="mt-3 text-sm text-muted">Formula {FORMULA_VERSION}. Rankings recompute every 15 minutes; “7 days” movement compares with the ranking a week earlier.</p>

      <div className="mt-10">
        <Section n={1} title="Achievements">
          <p>
            Base points by level:{" "}
            {Object.entries(c.achievements.levelPoints)
              .map(([k, v]) => `${ACHIEVEMENT_LEVEL_LABEL[k as keyof typeof ACHIEVEMENT_LEVEL_LABEL].toLowerCase()} ${v}`)
              .join(", ")}
            .
          </p>
          <p>
            <strong className="text-ink">Verified</strong> achievements — where a moderator has checked the evidence — count in full (up to {c.achievements.verifiedCap} points).
            <strong className="text-ink"> Self-reported</strong> achievements count at {c.achievements.unverifiedWeight * 100}% and are capped at {c.achievements.unverifiedCap} points in
            total, so a score built on claims is always marked <em>provisional</em>.
          </p>
        </Section>
        <Section n={2} title="Project outcomes">
          <p>
            Points by stage:{" "}
            {Object.entries(c.projects.stagePoints)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${STAGE_LABEL[k as keyof typeof STAGE_LABEL].toLowerCase()} ${v}`)
              .join(", ")}
            . Ideas and plans earn nothing — we reward execution.
          </p>
          <p>
            A project only counts as launched or completed when it documents its outcomes (at least {c.projects.minOutcomeChars} characters) <em>and</em> links a demo or repository.
            Otherwise it&apos;s scored as a prototype. Leads receive the full value; members with documented responsibilities {c.projects.memberShare * 100}%; members without{" "}
            {c.projects.undocumentedMemberShare * 100}%.
          </p>
          <p>
            Only your best {c.projects.maxProjects} projects count, each worth less than the last (×{c.projects.decay}). Projects must be at least {c.projects.minProjectAgeDays} days old, and you
            must have been on the team for {c.projects.minMembershipAgeDays} days.
          </p>
        </Section>
        <Section n={3} title="Completed contributions">
          <p>
            Each milestone assigned to you and marked done earns {c.contributions.perMilestone} points, plus {c.contributions.evidenceBonus} with an evidence link. At most{" "}
            {c.contributions.maxPerProject} milestones per project count, up to {c.contributions.cap} points overall — splitting work into tiny milestones doesn&apos;t help.
          </p>
        </Section>
        <Section n={4} title="Evidence of skills">
          <p>
            Listing a skill earns nothing. A skill counts ({c.skills.perSkill} points, up to {c.skills.cap}) once it&apos;s backed by evidence: a portfolio entry with a link that uses it, or
            a prototype-stage-or-later project you&apos;re on that requires it.
          </p>
        </Section>
        <Section n={5} title="Peer collaboration feedback">
          <p>Teammates on the same project can privately rate your contribution and reliability (1–5). Each piece of feedback is worth up to {c.feedback.maxPerFeedback} points, capped at {c.feedback.cap}.</p>
          <p>Safeguards against manipulation:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Only people who actually share a project with you can leave feedback.</li>
            <li>Their account must be at least {c.feedback.minAuthorAccountAgeDays} days old.</li>
            <li>Only the latest feedback per person counts, no matter how many projects you share.</li>
            <li>Mutual perfect scores between two people are halved.</li>
            <li>Until at least {c.feedback.minDistinctAuthors} different teammates have rated you, feedback counts at half value.</li>
          </ul>
        </Section>
        <Section n={6} title="Categories, privacy and fairness">
          <p>
            Category leaderboards (Engineering, AI, Research, Design, Entrepreneurship, Impact) apply the same rules to work tagged with that category. Private profiles, suspended accounts and
            members who haven&apos;t finished onboarding are never ranked.
          </p>
          <p>
            Rankings are a way to discover people doing serious work. They are not a measure of anyone&apos;s worth or potential, and they say nothing about university admission chances.
          </p>
        </Section>
      </div>
    </article>
  );
}
