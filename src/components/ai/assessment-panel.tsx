import { AlertTriangle, CheckCircle2, CircleHelp, Flag, ListChecks, Microscope, Wrench } from "lucide-react";
import { EVALUATION_DIMENSIONS, RATING_LABEL, type EvaluationOutput } from "@/lib/ai-schemas";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const RATING_TONE = {
  strong: "positive",
  solid: "accent",
  developing: "warning",
  needs_work: "negative",
  not_enough_info: "neutral",
} as const;
const RATING_STEPS = { strong: 4, solid: 3, developing: 2, needs_work: 1, not_enough_info: 0 } as const;

function List({ items, icon: Icon, tone }: { items: string[]; icon: typeof Flag; tone: string }) {
  if (!items.length) return <p className="text-[13px] text-faint">Nothing noted.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
          <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
          {s}
        </li>
      ))}
    </ul>
  );
}

/** Structured rendering of an AI evaluation. Ratings are qualitative on purpose — no numeric "score". */
export function AssessmentPanel({ result }: { result: EvaluationOutput }) {
  const labels = new Map<string, string>(EVALUATION_DIMENSIONS.map((d) => [d.key, d.label]));
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-6">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Overall</h2>
        <p className="mt-2 font-display text-[22px] leading-snug text-ink sm:text-[24px]">{result.overallAssessment}</p>
      </section>

      <Card>
        <CardHeader title="Ten dimensions" description="Qualitative ratings with reasons — not a score of you or your talent." />
        <CardBody className="px-0 pb-0">
          <ul className="divide-y divide-line border-t border-line">
            {result.dimensions.map((d) => (
              <li key={d.key} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[200px_120px_minmax(0,1fr)] sm:items-start sm:gap-4">
                <span className="text-[13.5px] font-medium text-ink">{labels.get(d.key) ?? d.key}</span>
                <span className="flex items-center gap-2">
                  <span className="flex gap-0.5" aria-hidden>
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className={cn("h-3 w-1.5 rounded-sm", n <= RATING_STEPS[d.rating] ? "bg-accent" : "bg-line")} />
                    ))}
                  </span>
                  <Badge tone={RATING_TONE[d.rating]}>{RATING_LABEL[d.rating]}</Badge>
                </span>
                <span className="text-[13.5px] leading-relaxed text-ink-2">{d.rationale}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Strengths" as="h3" />
          <CardBody>
            <List items={result.strengths} icon={CheckCircle2} tone="text-positive" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Weaknesses & risks" as="h3" />
          <CardBody>
            <List items={result.weaknessesAndRisks} icon={AlertTriangle} tone="text-warning" />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recommendations" as="h3" description="Ordered by priority" />
        <CardBody>
          <ol className="space-y-4">
            {[...result.recommendations]
              .sort((a, b) => ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority))
              .map((r, i) => (
                <li key={i} className="grid gap-1 sm:grid-cols-[80px_minmax(0,1fr)]">
                  <Badge tone={r.priority === "high" ? "negative" : r.priority === "medium" ? "warning" : "neutral"} className="w-fit capitalize">
                    {r.priority}
                  </Badge>
                  <div>
                    <p className="text-[14px] font-medium text-ink">{r.title}</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{r.detail}</p>
                  </div>
                </li>
              ))}
          </ol>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Missing evidence & validation" as="h3" />
          <CardBody>
            <List items={result.missingEvidence} icon={Microscope} tone="text-info" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Questions to answer next" as="h3" />
          <CardBody>
            <List items={result.nextQuestions} icon={CircleHelp} tone="text-muted" />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Suggested milestones" as="h3" />
        <CardBody>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {result.suggestedMilestones.map((m, i) => (
              <li key={i}>
                <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-surface bg-accent" aria-hidden />
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{m.timeframe}</p>
                <p className="text-[14px] font-medium text-ink">{m.title}</p>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{m.description}</p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {result.technicalApproaches.length > 0 && (
        <Card>
          <CardHeader title="Possible technical approaches" as="h3" />
          <CardBody>
            <ul className="grid gap-4 md:grid-cols-2">
              {result.technicalApproaches.map((t, i) => (
                <li key={i} className="rounded-md border border-line p-4">
                  <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                    <Wrench className="size-4 text-muted" aria-hidden /> {t.name}
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{t.description}</p>
                  <p className="mt-2 text-[13px] text-muted">
                    <span className="font-medium text-ink-2">Trade-offs:</span> {t.tradeoffs}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
      <p className="flex items-center gap-2 text-xs text-faint">
        <ListChecks className="size-3.5" aria-hidden /> Tip: turn the milestones you agree with into real milestones on your project page.
      </p>
    </div>
  );
}
