"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Free-form tag entry with suggestions. Enter or comma adds a tag;
 * Backspace on an empty input removes the last one.
 */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  max = 8,
  placeholder,
  maxLength = 40,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: readonly string[];
  max?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  const [draft, setDraft] = React.useState("");
  const add = (raw: string) => {
    const tag = raw.trim().slice(0, maxLength);
    if (!tag || value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft("");
  };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 10);
  return (
    <div className="space-y-2">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-surface-raised px-2 py-1.5 shadow-xs focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15">
        {value.map((tag) => (
          <span key={tag} className="inline-flex h-6 items-center gap-1 rounded-sm bg-paper-2 pl-2 pr-1 text-xs text-ink">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="grid size-4 place-items-center rounded-sm text-muted hover:bg-line hover:text-ink"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={value.length >= max}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v.slice(0, -1));
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length >= max ? `Up to ${max}` : placeholder}
          className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-faint"
        />
      </div>
      {remaining.length > 0 && value.length < max && (
        <div className="flex flex-wrap gap-1">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn("h-6 rounded-full border border-dashed border-line-strong px-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent")}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
