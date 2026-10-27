"use client";

import * as React from "react";
import { createConversationAction } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Select } from "@/components/ui/input";

export function NewConversation({ projects, defaultProjectId, disabled }: { projects: { id: string; title: string }[]; defaultProjectId?: string; disabled: boolean }) {
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const res = await createConversationAction(projectId || null);
        setPending(false);
        if (res && !res.ok) setError(res.error);
      }}
    >
      <FormError message={error} />
      <Field label="What should Copilot focus on?" htmlFor="cp-project" hint="Linking a project lets Copilot read its description, goals and milestones — and propose edits you can review.">
        <Select id="cp-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
          <option value="">General — no project yet</option>
        </Select>
      </Field>
      <Button type="submit" loading={pending} disabled={disabled}>
        Start conversation
      </Button>
    </form>
  );
}
