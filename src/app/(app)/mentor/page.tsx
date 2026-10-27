import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessagesSquare, Users, Wand2 } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { listMatchRuns } from "@/server/ai/matcher";
import { listAssessments } from "@/server/ai/evaluator";
import { listConversations } from "@/server/ai/copilot";
import { AIStatus } from "@/components/ai/ai-status";
import { AdvisoryNote } from "@/components/ai/advisory-note";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Mentor" };

const TOOLS = [
  {
    href: "/mentor/match",
    icon: Users,
    title: "Teammate Matcher",
    body: "Describe your idea. We find real members whose skills fit, then the mentor explains each match, the gaps, and a sensible team.",
  },
  {
    href: "/mentor/evaluate",
    icon: Wand2,
    title: "Project Evaluator",
    body: "A structured, candid review across ten dimensions — with risks, missing evidence, milestones and questions to answer next.",
  },
  {
    href: "/mentor/copilot",
    icon: MessagesSquare,
    title: "Project Copilot",
    body: "A conversation that remembers your project: scope it, plan milestones, pick tools, sharpen your pitch and apply edits you approve.",
  },
];

export default async function MentorPage() {
  const user = await requireUser("/mentor");
  const [runs, assessments, conversations] = await Promise.all([listMatchRuns(user.id), listAssessments(user.id), listConversations(user.id)]);
  return (
    <div className="space-y-8">
      <AIStatus userId={user.id} />
      <ul className="grid gap-4 md:grid-cols-3">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="group flex h-full flex-col rounded-lg border border-line bg-surface p-5 shadow-xs transition-[border-color,box-shadow] hover:border-accent-line hover:shadow-sm">
              <span className="grid size-9 place-items-center rounded-md bg-accent-soft text-accent">
                <t.icon className="size-[18px]" aria-hidden />
              </span>
              <span className="mt-4 font-semibold text-ink">{t.title}</span>
              <span className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{t.body}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-medium text-accent">
                Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Recent matches" as="h3" />
          <CardBody>
            {runs.length === 0 ? (
              <p className="text-[13px] text-muted">No matches yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {runs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/mentor/match?run=${r.id}`} className="block text-[13px] text-ink-2 hover:text-accent">
                      <span className="line-clamp-1">{r.brief}</span>
                      <span className="text-2xs text-faint">{timeAgo(r.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent evaluations" as="h3" />
          <CardBody>
            {assessments.length === 0 ? (
              <p className="text-[13px] text-muted">No evaluations yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {assessments.map((a) => (
                  <li key={a.id}>
                    <Link href={`/mentor/evaluate?assessment=${a.id}`} className="block text-[13px] text-ink-2 hover:text-accent">
                      <span className="line-clamp-1">{a.title}</span>
                      <span className="text-2xs text-faint">{timeAgo(a.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Copilot conversations" as="h3" />
          <CardBody>
            {conversations.length === 0 ? (
              <p className="text-[13px] text-muted">No conversations yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {conversations.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/mentor/copilot/${c.id}`} className="block text-[13px] text-ink-2 hover:text-accent">
                      <span className="line-clamp-1">{c.title}</span>
                      <span className="text-2xs text-faint">
                        {c._count.messages} messages · {timeAgo(c.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5 text-[13.5px] leading-relaxed text-ink-2">
        <p className="font-medium text-ink">How the mentor handles your data</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your conversations and evaluations are private to you.</li>
          <li>The matcher only shares profile fields that are already visible to members — never emails, names or private profiles — and only for the shortlist.</li>
          <li>The mentor can suggest edits to your project, but nothing changes until you review and confirm.</li>
        </ul>
        <AdvisoryNote className="mt-4" />
      </div>
    </div>
  );
}
