"use client";

import * as React from "react";
import { evaluateProjectAction } from "@/actions/ai";
import { STAGES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CharCount, Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Thinking } from "@/components/ai/thinking";

export function EvaluateForm({ projects, defaultProjectId, disabled }: { projects: { id: string; title: string }[]; defaultProjectId?: string; disabled: boolean }) {
  const [source, setSource] = React.useState<"project" | "idea">(projects.length ? "project" : "idea");
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [idea, setIdea] = React.useState({ title: "", description: "", goals: "", progress: "", stage: "IDEA", teamSize: 1 });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const set = (k: keyof typeof idea) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setIdea((s) => ({ ...s, [k]: k === "teamSize" ? Number(e.target.value) : e.target.value }));

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const res = await evaluateProjectAction(source === "project" ? { source, projectId } : { source, ...idea });
        // On success the action redirects to the result page.
        setPending(false);
        if (res && !res.ok) setError(res.error);
      }}
    >
      <FormError message={error} />
      <div role="tablist" aria-label="What to evaluate" className="inline-flex rounded-lg border border-line bg-paper-2 p-1">
        {(["project", "idea"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={source === s}
            disabled={s === "project" && projects.length === 0}
            onClick={() => setSource(s)}
            className={cn("h-8 rounded-md px-3 text-[13px] transition-colors disabled:opacity-40", source === s ? "bg-surface-raised font-medium text-ink shadow-sm" : "text-muted hover:text-ink")}
          >
            {s === "project" ? "One of my projects" : "Describe an idea"}
          </button>
        ))}
      </div>

      {source === "project" ? (
        <Field label="Project" htmlFor="ev-project" hint="We send the project's description, goals, outcomes, milestones and team roles — not team members' names.">
          <Select id="ev-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px_120px]">
            <Field label="Working title" htmlFor="ev-title">
              <Input id="ev-title" value={idea.title} onChange={set("title")} maxLength={80} />
            </Field>
            <Field label="Stage" htmlFor="ev-stage">
              <Select id="ev-stage" value={idea.stage} onChange={set("stage")}>
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Team size" htmlFor="ev-team">
              <Input id="ev-team" type="number" min={1} max={50} value={idea.teamSize} onChange={set("teamSize")} />
            </Field>
          </div>
          <Field label="What is it, who is it for, and why does it matter?" htmlFor="ev-desc" aside={<CharCount value={idea.description} max={4000} />}>
            <Textarea id="ev-desc" rows={6} value={idea.description} onChange={set("description")} maxLength={4000} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Goals" htmlFor="ev-goals" optional>
              <Textarea id="ev-goals" rows={3} value={idea.goals} onChange={set("goals")} maxLength={1500} />
            </Field>
            <Field label="Progress and evidence so far" htmlFor="ev-progress" optional>
              <Textarea id="ev-progress" rows={3} value={idea.progress} onChange={set("progress")} maxLength={1500} />
            </Field>
          </div>
        </div>
      )}

      {pending ? (
        <Thinking className="rounded-lg border border-line bg-surface p-4" steps={["Reading your project…", "Assessing ten dimensions…", "Looking for risks and missing evidence…", "Drafting milestones and next questions…"]} />
      ) : (
        <div className="flex justify-end">
          <Button type="submit" disabled={disabled || (source === "project" ? !projectId : idea.title.trim().length < 3 || idea.description.trim().length < 40)}>
            Evaluate
          </Button>
        </div>
      )}
    </form>
  );
}
