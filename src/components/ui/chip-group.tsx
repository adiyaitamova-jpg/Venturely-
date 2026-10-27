"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string; hint?: string };

/** Toggleable chips for multi-select (or single-select) of small option sets. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = true,
  max,
  label,
  size = "md",
}: {
  options: readonly Option<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  max?: number;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const selected = value.includes(o.value);
        const atMax = multiple && max !== undefined && value.length >= max && !selected;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            disabled={atMax}
            title={o.hint}
            onClick={() => {
              if (!multiple) return onChange(selected ? [] : [o.value]);
              onChange(selected ? value.filter((v) => v !== o.value) : [...value, o.value]);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              selected
                ? "border-accent bg-accent-soft font-medium text-accent-ink"
                : "border-line-strong bg-surface-raised text-ink-2 hover:border-faint hover:text-ink",
            )}
          >
            {selected && <Check className="size-3.5" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
