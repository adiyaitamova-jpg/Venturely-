import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { isAIConfigured } from "@/server/ai/config";
import { getAssessment, listAssessments } from "@/server/ai/evaluator";
import { db } from "@/server/db";
import { AIStatus } from "@/components/ai/ai-status";
import { AdvisoryNote } from "@/components/ai/advisory-note";
import { AssessmentPanel } from "@/components/ai/assessment-panel";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { EvaluateForm } from "./evaluate-form";

export const metadata: Metadata = { title: "Project Evaluator" };

export default async function EvaluatePage({ searchParams }: { searchParams: Promise<{ assessment?: string; project?: string }> }) {
  const user = await requireUser("/mentor/evaluate");
  const { assessment: assessmentId, project } = await searchParams;

  if (assessmentId) {
    const a = await getAssessment(user.id, assessmentId.slice(0, 64));
    if (!a) notFound();
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/mentor/evaluate" className="text-[13px] text-accent hover:underline">
              ← New evaluation
            </Link>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">{a.title}</h2>
            <p className="text-[13px] text-muted">Evaluated {timeAgo(a.createdAt)}</p>
          </div>
          {a.project && (
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/projects/${a.project.slug}`}>Open project</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`/mentor/copilot?project=${a.projectId}`}>Work on it with Copilot</Link>
              </Button>
            </div>
          )}
        </div>
        <AdvisoryNote className="rounded-md border border-line bg-surface px-3 py-2.5" />
        <AssessmentPanel result={a.result} />
      </div>
    );
  }

  const [projects, history] = await Promise.all([
    db.project.findMany({ where: { status: "ACTIVE", members: { some: { userId: user.id } } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
    listAssessments(user.id),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <AIStatus userId={user.id} />
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-6">
          <EvaluateForm projects={projects} defaultProjectId={projects.find((p) => p.id === project)?.id} disabled={!isAIConfigured()} />
        </div>
        <AdvisoryNote />
      </div>
      <aside>
        <Card>
          <CardHeader title="Past evaluations" as="h3" />
          <CardBody>
            {history.length === 0 ? (
              <p className="text-[13px] text-muted">Evaluations you run are saved here, privately.</p>
            ) : (
              <ul className="space-y-2.5">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/mentor/evaluate?assessment=${h.id}`} className="block text-[13px] text-ink-2 hover:text-accent">
                      <span className="line-clamp-1">{h.title}</span>
                      <span className="text-2xs text-faint">{timeAgo(h.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
