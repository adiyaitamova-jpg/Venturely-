"use client";

import * as React from "react";
import { matchTeammatesAction } from "@/actions/ai";
import { SUGGESTED_ROLES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { CharCount, Field, FormError } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { SkillPicker, type SkillOption } from "@/components/forms/skill-picker";
import { Thinking } from "@/components/ai/thinking";

export function MatchForm({ skills, projects, aiConfigured, defaultProjectId }: { skills: SkillOption[]; projects: { id: string; title: string; tagline: string }[]; aiConfigured: boolean; defaultProjectId?: string }) {
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? "");
  const [brief, setBrief] = React.useState("");
  const [skillIds, setSkillIds] = React.useState<string[]>([]);
  const [roles, setRoles] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    const p = projects.find((x) => x.id === projectId);
    if (p && !brief) setBrief(`${p.title}: ${p.tagline}`);
  }, [projectId, projects, brief]);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const res = await matchTeammatesAction({ brief, projectId: projectId || null, skillIds, roles });
        // On success the action redirects to the result page.
        setPending(false);
        if (res && !res.ok) setError(res.error);
      }}
    >
      <FormError message={error} />
      {projects.length > 0 && (
        <Field label="For one of your projects?" htmlFor="m-project" optional hint="Current teammates are excluded from results.">
          <Select id="m-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No — a new idea</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label="Describe your idea and who you need"
        htmlFor="m-brief"
        hint="What are you building, for whom, what's done, and what help would make the biggest difference?"
        aside={<CharCount value={brief} max={2000} />}
      >
        <Textarea id="m-brief" rows={6} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={2000} placeholder="e.g. We're building a low-cost water-quality sensor for rural schools. We have hardware covered but need someone for the data dashboard and someone to run pilots with teachers…" />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Skills you need" htmlFor="m-skills" optional={aiConfigured} hint={aiConfigured ? "The mentor also infers skills from your description." : "Required while AI is unavailable."}>
          <SkillPicker id="m-skills" skills={skills} value={skillIds} onChange={setSkillIds} max={12} />
        </Field>
        <Field label="Roles you're looking for" htmlFor="m-roles" optional>
          <TagInput id="m-roles" value={roles} onChange={setRoles} suggestions={SUGGESTED_ROLES} max={6} maxLength={50} placeholder="e.g. Data scientist" />
        </Field>
      </div>
      {pending ? (
        <Thinking className="rounded-lg border border-line bg-surface p-4" steps={["Reading your brief…", "Filtering real member profiles…", "Scoring skill fit and availability…", "Writing explanations for the shortlist…"]} />
      ) : (
        <div className="flex justify-end">
          <Button type="submit" disabled={brief.trim().length < 20}>
            Find teammates
          </Button>
        </div>
      )}
    </form>
  );
}
