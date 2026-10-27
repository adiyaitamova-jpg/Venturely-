"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createProjectAction, updateProjectAction } from "@/actions/projects";
import { projectSchema, type ProjectInput } from "@/lib/validation/project";
import { COMMITMENT, PROJECT_CATEGORIES, STAGES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CharCount, Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SkillPicker, type SkillOption } from "@/components/forms/skill-picker";

export function ProjectForm({ skills, projectId, initial }: { skills: SkillOption[]; projectId?: string; initial?: ProjectInput }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema) as never,
    defaultValues: initial ?? {
      title: "",
      tagline: "",
      description: "",
      goals: "",
      outcomes: "",
      category: "SOFTWARE",
      stage: "IDEA",
      commitment: "MODERATE",
      visibility: "PUBLIC",
      repoUrl: "",
      demoUrl: "",
      skillIds: [],
    },
  });
  const { errors, isSubmitting } = form.formState;
  const stage = form.watch("stage");
  const needsOutcomes = stage === "LAUNCHED" || stage === "COMPLETED";

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = projectId ? await updateProjectAction(projectId, values) : await createProjectAction(values);
        if (res && !res.ok) {
          setError(res.error);
          for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as never, { message: m[0] });
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (projectId) {
          toast.success("Project updated");
          router.refresh();
        }
      })}
    >
      <FormError message={error} />

      <fieldset className="space-y-5">
        <legend className="mb-1 text-base font-semibold">The idea</legend>
        <Field label="Project name" htmlFor="title" error={errors.title?.message}>
          <Input id="title" {...form.register("title")} />
        </Field>
        <Field label="One-line pitch" htmlFor="tagline" hint="What does it do, and for whom?" error={errors.tagline?.message} aside={<CharCount value={form.watch("tagline")} max={140} />}>
          <Input id="tagline" {...form.register("tagline")} />
        </Field>
        <Field
          label="Description"
          htmlFor="description"
          hint="The problem, who has it, your approach, and why now. Plain text; line breaks are kept."
          error={errors.description?.message}
          aside={<CharCount value={form.watch("description")} max={4000} />}
        >
          <Textarea id="description" rows={8} {...form.register("description")} />
        </Field>
        <Field label="Goals" htmlFor="goals" optional hint="What does success look like in the next 3 months? Make it measurable." error={errors.goals?.message}>
          <Textarea id="goals" rows={4} {...form.register("goals")} />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-base font-semibold">Shape &amp; status</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Category" htmlFor="category">
            <Select id="category" {...form.register("category")}>
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expected commitment" htmlFor="commitment">
            <Select id="commitment" {...form.register("commitment")}>
              {COMMITMENT.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visibility" htmlFor="visibility">
            <Select id="visibility" {...form.register("visibility")}>
              <option value="PUBLIC">Public — anyone with the link</option>
              <option value="MEMBERS">Members only</option>
            </Select>
          </Field>
        </div>
        <Field label="Stage" htmlFor="stage">
          <Controller
            control={form.control}
            name="stage"
            render={({ field }) => (
              <div id="stage" role="radiogroup" aria-label="Stage" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STAGES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === s.value}
                    onClick={() => field.onChange(s.value)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left transition-colors",
                      field.value === s.value ? "border-accent bg-accent-softer ring-1 ring-accent" : "border-line-strong bg-surface-raised hover:border-faint",
                    )}
                  >
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted">{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </Field>
        <Field
          label="Outcomes so far"
          htmlFor="outcomes"
          optional={!needsOutcomes}
          hint={
            needsOutcomes
              ? "Launched and completed projects need documented outcomes (80+ characters) and a demo or repo link to count as such in rankings."
              : "Users, results, measurements, recognition — anything you can point to."
          }
          error={errors.outcomes?.message}
        >
          <Textarea id="outcomes" rows={3} {...form.register("outcomes")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Repository" htmlFor="repoUrl" optional error={errors.repoUrl?.message}>
            <Input id="repoUrl" type="url" placeholder="https://github.com/…" {...form.register("repoUrl")} />
          </Field>
          <Field label="Demo or website" htmlFor="demoUrl" optional error={errors.demoUrl?.message}>
            <Input id="demoUrl" type="url" placeholder="https://" {...form.register("demoUrl")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-base font-semibold">Skills needed</legend>
        <Field label="Skills this project uses" htmlFor="skills" hint="Used for discovery and teammate matching. You can define specific open roles after creating the project." error={errors.skillIds?.message}>
          <Controller control={form.control} name="skillIds" render={({ field }) => <SkillPicker id="skills" skills={skills} value={field.value} onChange={field.onChange} max={12} />} />
        </Field>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {projectId ? "Save changes" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
