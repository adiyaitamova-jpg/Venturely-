"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useUrlFilters } from "@/components/forms/use-url-filters";
import { AVAILABILITY, EXPERIENCE, PROJECT_CATEGORIES, SUGGESTED_MAJORS } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { SkillPicker, type SkillOption } from "@/components/forms/skill-picker";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["major", "skill", "category", "experience", "availability", "language", "interest"];

export function PeopleFilters({
  skills,
  facets,
  children,
}: {
  skills: SkillOption[];
  facets: { languages: string[]; interests: string[] };
  children: React.ReactNode;
}) {
  const { params, apply, applyDebounced, pending } = useUrlFilters();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [major, setMajor] = React.useState(params.get("major") ?? "");
  const [open, setOpen] = React.useState(false);
  const activeCount = FILTER_KEYS.reduce((n, k) => n + params.getAll(k).length, 0);

  const panel = (
    <div className="space-y-5">
      <Field label="Skills" htmlFor="f-skills">
        <SkillPicker id="f-skills" skills={skills} value={params.getAll("skill")} onChange={(v) => apply({ skill: v })} max={6} />
      </Field>
      <Field label="Intended major" htmlFor="f-major">
        <Input
          id="f-major"
          list="f-majors"
          value={major}
          placeholder="Any"
          onChange={(e) => {
            setMajor(e.target.value);
            applyDebounced({ major: e.target.value || null });
          }}
        />
      </Field>
      <datalist id="f-majors">
        {SUGGESTED_MAJORS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <Field label="Project category" htmlFor="f-category">
        <Select id="f-category" value={params.get("category") ?? ""} onChange={(e) => apply({ category: e.target.value || null })}>
          <option value="">Any category</option>
          {PROJECT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value.toLowerCase()}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Experience" htmlFor="f-experience">
        <Select id="f-experience" value={params.get("experience") ?? ""} onChange={(e) => apply({ experience: e.target.value || null })}>
          <option value="">Any level</option>
          {EXPERIENCE.map((x) => (
            <option key={x.value} value={x.value.toLowerCase()}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Availability" htmlFor="f-availability">
        <Select id="f-availability" value={params.get("availability") ?? ""} onChange={(e) => apply({ availability: e.target.value || null })}>
          <option value="">Anyone</option>
          {AVAILABILITY.map((x) => (
            <option key={x.value} value={x.value.toLowerCase()}>
              {x.label} ({x.hint})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Language" htmlFor="f-language">
        <Select id="f-language" value={params.get("language") ?? ""} onChange={(e) => apply({ language: e.target.value || null })}>
          <option value="">Any language</option>
          {facets.languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Interest or cause" htmlFor="f-interest">
        <Select id="f-interest" value={params.get("interest") ?? ""} onChange={(e) => apply({ interest: e.target.value || null })}>
          <option value="">Any interest</option>
          {facets.interests.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            setMajor("");
            apply(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
          }}
        >
          <X /> Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input
            type="search"
            aria-label="Search people"
            className="h-10 pl-9"
            placeholder="Search by name, skill, major or keyword"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              applyDebounced({ q: e.target.value || null });
            }}
          />
          {pending && <span className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-label="Loading" />}
        </div>
        <div className="flex gap-2">
          <Select aria-label="Sort by" className="h-10 w-auto" value={params.get("sort") ?? "relevance"} onChange={(e) => apply({ sort: e.target.value === "relevance" ? null : e.target.value })}>
            <option value="relevance">Most relevant</option>
            <option value="ranking">Highest ranked</option>
            <option value="newest">Newest members</option>
          </Select>
          <Button variant="secondary" className="h-10 lg:hidden" onClick={() => setOpen(true)}>
            <SlidersHorizontal /> Filters
            {activeCount > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] leading-4 text-white">{activeCount}</span>}
          </Button>
        </div>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-20 rounded-lg border border-line bg-surface p-4">{panel}</div>
        </aside>
        <div aria-busy={pending} className={cn("min-w-0 transition-opacity duration-200", pending && "opacity-60")}>
          {children}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="right" title="Filter people">
          {panel}
        </DialogContent>
      </Dialog>
    </>
  );
}
