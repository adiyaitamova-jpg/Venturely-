"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import type { z } from "zod";
import type { Availability, ExperienceLevel, ProfileVisibility, ProjectCategory, Region, SkillLevel } from "@prisma/client";
import { removeAvatarAction, saveOnboardingStepAction, uploadAvatarAction } from "@/actions/profile";
import {
  aboutStepSchema,
  availabilityStepSchema,
  basicsStepSchema,
  interestsStepSchema,
  skillsStepSchema,
} from "@/lib/validation/profile";
import {
  AVAILABILITY,
  EXPERIENCE,
  PROJECT_CATEGORIES,
  REGIONS,
  SUGGESTED_CAUSES,
  SUGGESTED_LANGUAGES,
  SUGGESTED_MAJORS,
  SUGGESTED_ROLES,
  VISIBILITY,
} from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { CharCount, Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { SkillPicker, type SkillOption } from "@/components/forms/skill-picker";

export type ProfileInitial = {
  userId: string;
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  intendedMajor: string;
  academicInterests: string[];
  causes: string[];
  languages: string[];
  preferredCategories: ProjectCategory[];
  preferredRoles: string[];
  projectIdeas: string;
  availability: Availability;
  experienceLevel: ExperienceLevel;
  region: Region | null;
  visibility: ProfileVisibility;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  avatarHue: number;
  hasAvatar: boolean;
  avatarVersion: number | null;
  skills: { skillId: string; level: SkillLevel }[];
};

type SectionProps = {
  initial: ProfileInitial;
  submitLabel?: string;
  onSaved?: (result: { onboardingStep: number; finished: boolean }) => void;
  footer?: React.ReactNode;
};

/** Shared form plumbing: zod resolver, server action, field errors, toast. */
function useStepForm<S extends z.ZodType<FieldValues, FieldValues>>(
  step: number,
  schema: S,
  defaults: z.input<S>,
  onSaved?: SectionProps["onSaved"],
) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as unknown as Resolver<z.input<S>, unknown, z.output<S>>,
    defaultValues: defaults as never,
  });
  const submit = form.handleSubmit(async (values) => {
    setError(null);
    const res = await saveOnboardingStepAction(step, values);
    if (!res.ok) {
      setError(res.error);
      for (const [key, messages] of Object.entries(res.fieldErrors ?? {})) {
        form.setError(key as never, { message: messages[0] });
      }
      return;
    }
    form.reset(values as never);
    if (onSaved) onSaved(res.data);
    else toast.success("Saved");
    router.refresh();
  });
  return { form, submit, error };
}

function Actions({ submitting, label = "Save changes", footer, dirty }: { submitting: boolean; label?: string; footer?: React.ReactNode; dirty?: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <div>{footer}</div>
      <Button type="submit" loading={submitting} disabled={dirty === false && !footer}>
        {label}
      </Button>
    </div>
  );
}

// ─────────────────────────── Basics ───────────────────────────

function AvatarControl({ initial, hue, onHue }: { initial: ProfileInitial; hue: number; onHue: (h: number) => void }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const HUES = [150, 200, 230, 265, 320, 15, 40, 85];
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Avatar
        size="xl"
        user={{ id: initial.userId, displayName: initial.displayName || "?", avatarHue: hue, hasAvatar: initial.hasAvatar, avatarVersion: initial.avatarVersion }}
      />
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Upload profile photo"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              const fd = new FormData();
              fd.set("avatar", file);
              const res = await uploadAvatarAction(fd);
              setBusy(false);
              e.target.value = "";
              if (res.ok) {
                toast.success("Photo updated");
                router.refresh();
              } else toast.error(res.error);
            }}
          />
          <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
            <ImageUp /> {initial.hasAvatar ? "Replace photo" : "Upload photo"}
          </Button>
          {initial.hasAvatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const res = await removeAvatarAction();
                if (res.ok) router.refresh();
              }}
            >
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted">{initial.hasAvatar ? "Monogram colour (used as fallback)" : "Or keep a monogram — pick a colour"}</p>
          <div role="radiogroup" aria-label="Monogram colour" className="flex gap-1.5">
            {HUES.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={hue === h}
                aria-label={`Hue ${h}`}
                onClick={() => onHue(h)}
                className={cn("size-6 rounded-full ring-offset-2 ring-offset-surface transition", hue === h ? "ring-2 ring-accent" : "hover:scale-110")}
                style={{ backgroundColor: `oklch(0.85 0.06 ${h})` }}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-faint">PNG, JPEG or WebP, up to 512 KB. Please don&apos;t upload photos that show your school or location.</p>
      </div>
    </div>
  );
}

export function BasicsSection({ initial, submitLabel, onSaved, footer }: SectionProps) {
  const { form, submit, error } = useStepForm(0, basicsStepSchema, {
    displayName: initial.displayName,
    username: initial.username,
    headline: initial.headline,
    avatarHue: initial.avatarHue,
  }, onSaved);
  const { errors, isSubmitting, isDirty } = form.formState;
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <Controller control={form.control} name="avatarHue" render={({ field }) => <AvatarControl initial={initial} hue={field.value} onHue={field.onChange} />} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input id="displayName" {...form.register("displayName")} />
        </Field>
        <Field label="Username" htmlFor="username" hint="Your profile link: /u/username" error={errors.username?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">@</span>
            <Input id="username" className="pl-7" autoCapitalize="off" spellCheck={false} {...form.register("username")} />
          </div>
        </Field>
      </div>
      <Field
        label="Headline"
        htmlFor="headline"
        optional
        hint="One line about what you build. e.g. “Building low-cost air-quality sensors for schools”"
        error={errors.headline?.message}
        aside={<CharCount value={form.watch("headline")} max={90} />}
      >
        <Input id="headline" {...form.register("headline")} />
      </Field>
      <Actions submitting={isSubmitting} label={submitLabel} footer={footer} dirty={submitLabel ? undefined : isDirty} />
    </form>
  );
}

// ─────────────────────────── About ───────────────────────────

export function AboutSection({ initial, submitLabel, onSaved, footer }: SectionProps) {
  const { form, submit, error } = useStepForm(1, aboutStepSchema, {
    bio: initial.bio,
    intendedMajor: initial.intendedMajor,
    academicInterests: initial.academicInterests,
    languages: initial.languages,
    region: initial.region,
  }, onSaved);
  const { errors, isSubmitting, isDirty } = form.formState;
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <Field
        label="Bio"
        htmlFor="bio"
        hint="What are you curious about, and what have you built so far? Avoid personal details like your school name or address."
        error={errors.bio?.message}
        aside={<CharCount value={form.watch("bio")} max={600} />}
      >
        <Textarea id="bio" rows={5} {...form.register("bio")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Intended major or field" htmlFor="intendedMajor" optional error={errors.intendedMajor?.message}>
          <Input id="intendedMajor" list="majors" {...form.register("intendedMajor")} />
        </Field>
        <datalist id="majors">
          {SUGGESTED_MAJORS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <Field label="Region" htmlFor="region" optional hint="Helps with time zones. We never ask for your city." error={errors.region?.message}>
          <Controller
            control={form.control}
            name="region"
            render={({ field }) => (
              <Select id="region" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)}>
                <option value="">Prefer not to say</option>
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>
      </div>
      <Field label="Academic interests" htmlFor="academicInterests" optional hint="Press Enter after each one." error={errors.academicInterests?.message}>
        <Controller
          control={form.control}
          name="academicInterests"
          render={({ field }) => (
            <TagInput id="academicInterests" value={field.value} onChange={field.onChange} suggestions={["Robotics", "Climate science", "Neuroscience", "Linguistics", "Behavioral economics", "Astrophysics"]} placeholder="e.g. Computational biology" />
          )}
        />
      </Field>
      <Field label="Languages you can collaborate in" htmlFor="languages" error={errors.languages?.message}>
        <Controller
          control={form.control}
          name="languages"
          render={({ field }) => <TagInput id="languages" value={field.value} onChange={field.onChange} suggestions={SUGGESTED_LANGUAGES} placeholder="e.g. English" />}
        />
      </Field>
      <Actions submitting={isSubmitting} label={submitLabel} footer={footer} dirty={submitLabel ? undefined : isDirty} />
    </form>
  );
}

// ─────────────────────────── Skills ───────────────────────────

export function SkillsSection({ initial, submitLabel, onSaved, footer, skills }: SectionProps & { skills: SkillOption[] }) {
  const { form, submit, error } = useStepForm(2, skillsStepSchema, {
    skills: initial.skills,
    experienceLevel: initial.experienceLevel,
  }, onSaved);
  const { errors, isSubmitting, isDirty } = form.formState;
  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <Field
        label="Skills"
        htmlFor="skills"
        hint="Be honest about proficiency — teammates rely on it. Skills only count toward ranking once they're backed by evidence."
        error={errors.skills?.message ?? errors.skills?.root?.message}
      >
        <Controller
          control={form.control}
          name="skills"
          render={({ field }) => <SkillPicker id="skills" withLevels skills={skills} value={field.value} onChange={field.onChange} max={20} />}
        />
      </Field>
      <Field label="Overall experience" htmlFor="experienceLevel" error={errors.experienceLevel?.message}>
        <Controller
          control={form.control}
          name="experienceLevel"
          render={({ field }) => (
            <div id="experienceLevel" role="radiogroup" aria-label="Overall experience" className="grid gap-2 sm:grid-cols-3">
              {EXPERIENCE.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === e.value}
                  onClick={() => field.onChange(e.value)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    field.value === e.value ? "border-accent bg-accent-softer ring-1 ring-accent" : "border-line-strong bg-surface-raised hover:border-faint",
                  )}
                >
                  <span className="block text-sm font-medium text-ink">{e.label}</span>
                  <span className="block text-xs text-muted">{e.hint}</span>
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      <Actions submitting={isSubmitting} label={submitLabel} footer={footer} dirty={submitLabel ? undefined : isDirty} />
    </form>
  );
}

// ─────────────────────────── Interests ───────────────────────────

export function InterestsSection({ initial, submitLabel, onSaved, footer }: SectionProps) {
  const { form, submit, error } = useStepForm(3, interestsStepSchema, {
    preferredCategories: initial.preferredCategories,
    causes: initial.causes,
    preferredRoles: initial.preferredRoles,
  }, onSaved);
  const { errors, isSubmitting, isDirty } = form.formState;
  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <FormError message={error} />
      <Field label="Project categories you'd like to work on" htmlFor="preferredCategories" error={errors.preferredCategories?.message}>
        <Controller
          control={form.control}
          name="preferredCategories"
          render={({ field }) => (
            <ChipGroup label="Project categories" options={PROJECT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} value={field.value} onChange={field.onChange} />
          )}
        />
      </Field>
      <Field label="Roles you want to play on a team" htmlFor="preferredRoles" hint="Up to 6." error={errors.preferredRoles?.message}>
        <Controller
          control={form.control}
          name="preferredRoles"
          render={({ field }) => <TagInput id="preferredRoles" value={field.value} onChange={field.onChange} suggestions={SUGGESTED_ROLES} max={6} maxLength={50} placeholder="e.g. ML engineer" />}
        />
      </Field>
      <Field label="Causes you care about" htmlFor="causes" optional error={errors.causes?.message}>
        <Controller
          control={form.control}
          name="causes"
          render={({ field }) => <TagInput id="causes" value={field.value} onChange={field.onChange} suggestions={SUGGESTED_CAUSES} max={10} placeholder="e.g. Climate" />}
        />
      </Field>
      <Actions submitting={isSubmitting} label={submitLabel} footer={footer} dirty={submitLabel ? undefined : isDirty} />
    </form>
  );
}

// ─────────────────────────── Availability, links, privacy ───────────────────────────

export function AvailabilitySection({ initial, submitLabel, onSaved, footer }: SectionProps) {
  const { form, submit, error } = useStepForm(4, availabilityStepSchema, {
    availability: initial.availability,
    projectIdeas: initial.projectIdeas,
    websiteUrl: initial.websiteUrl ?? "",
    githubUrl: initial.githubUrl ?? "",
    linkedinUrl: initial.linkedinUrl ?? "",
    visibility: initial.visibility,
  }, onSaved);
  const { errors, isSubmitting, isDirty } = form.formState;
  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <FormError message={error} />
      <Field label="Availability for new projects" htmlFor="availability" error={errors.availability?.message}>
        <Controller
          control={form.control}
          name="availability"
          render={({ field }) => (
            <div id="availability" role="radiogroup" aria-label="Availability" className="grid gap-2 sm:grid-cols-2">
              {AVAILABILITY.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === a.value}
                  onClick={() => field.onChange(a.value)}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-left transition-colors",
                    field.value === a.value ? "border-accent bg-accent-softer ring-1 ring-accent" : "border-line-strong bg-surface-raised hover:border-faint",
                  )}
                >
                  <span className="block text-sm font-medium text-ink">{a.label}</span>
                  <span className="block text-xs text-muted">{a.hint}</span>
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      <Field
        label="Current projects or ideas"
        htmlFor="projectIdeas"
        optional
        hint="What are you working on, or what would you love to build? This helps matching."
        error={errors.projectIdeas?.message}
        aside={<CharCount value={form.watch("projectIdeas")} max={1000} />}
      >
        <Textarea id="projectIdeas" rows={4} {...form.register("projectIdeas")} />
      </Field>
      <fieldset className="space-y-4">
        <legend className="text-[13px] font-medium text-ink">
          Links <span className="font-normal text-faint">Optional</span>
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="GitHub" htmlFor="githubUrl" error={errors.githubUrl?.message}>
            <Input id="githubUrl" type="url" placeholder="https://github.com/…" {...form.register("githubUrl")} />
          </Field>
          <Field label="Website" htmlFor="websiteUrl" error={errors.websiteUrl?.message}>
            <Input id="websiteUrl" type="url" placeholder="https://…" {...form.register("websiteUrl")} />
          </Field>
          <Field label="LinkedIn" htmlFor="linkedinUrl" error={errors.linkedinUrl?.message}>
            <Input id="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…" {...form.register("linkedinUrl")} />
          </Field>
        </div>
      </fieldset>
      <Field label="Who can see your profile?" htmlFor="visibility" error={errors.visibility?.message}>
        <Controller
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <div id="visibility" role="radiogroup" aria-label="Profile visibility" className="space-y-2">
              {VISIBILITY.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === v.value}
                  onClick={() => field.onChange(v.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                    field.value === v.value ? "border-accent bg-accent-softer ring-1 ring-accent" : "border-line-strong bg-surface-raised hover:border-faint",
                  )}
                >
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", field.value === v.value ? "border-accent" : "border-line-strong")}>
                    {field.value === v.value && <span className="size-2 rounded-full bg-accent" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{v.label}</span>
                    <span className="block text-xs leading-relaxed text-muted">{v.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      <Actions submitting={isSubmitting} label={submitLabel} footer={footer} dirty={submitLabel ? undefined : isDirty} />
    </form>
  );
}
