"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useUrlFilters } from "@/components/forms/use-url-filters";
import { COMMITMENT, PROJECT_CATEGORIES, STAGES } from "@/lib/taxonomy";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProjectFilters({ children }: { children: React.ReactNode }) {
  const { params, apply, applyDebounced, pending } = useUrlFilters();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const openRoles = params.get("open") === "1";
  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input
            type="search"
            aria-label="Search projects"
            className="h-10 pl-9"
            placeholder="Search projects by name, idea or skill"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              applyDebounced({ q: e.target.value || null });
            }}
          />
          {pending && <span className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-label="Loading" />}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Select aria-label="Category" className="sm:w-auto" value={params.get("category") ?? ""} onChange={(e) => apply({ category: e.target.value || null })}>
            <option value="">All categories</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value.toLowerCase()}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select aria-label="Stage" className="sm:w-auto" value={params.get("stage") ?? ""} onChange={(e) => apply({ stage: e.target.value || null })}>
            <option value="">Any stage</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value.toLowerCase()}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select aria-label="Commitment" className="sm:w-auto" value={params.get("commitment") ?? ""} onChange={(e) => apply({ commitment: e.target.value || null })}>
            <option value="">Any commitment</option>
            {COMMITMENT.map((c) => (
              <option key={c.value} value={c.value.toLowerCase()}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select aria-label="Sort" className="sm:w-auto" value={params.get("sort") ?? "recent"} onChange={(e) => apply({ sort: e.target.value === "recent" ? null : e.target.value })}>
            <option value="recent">Recently active</option>
            <option value="new">Newest</option>
            <option value="advanced">Most advanced</option>
          </Select>
          <button
            type="button"
            aria-pressed={openRoles}
            onClick={() => apply({ open: openRoles ? null : "1" })}
            className={cn(
              "col-span-2 h-9 rounded-md border px-3 text-[13px] transition-colors sm:col-span-1",
              openRoles ? "border-accent bg-accent-soft font-medium text-accent-ink" : "border-line-strong bg-surface-raised text-ink-2 hover:border-faint",
            )}
          >
            Has open roles
          </button>
        </div>
      </div>
      <div aria-busy={pending} className={cn("mt-6 transition-opacity duration-200", pending && "opacity-60")}>
        {children}
      </div>
    </div>
  );
}
