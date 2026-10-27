"use client";

import * as React from "react";
import { Popover } from "radix-ui";
import { Check, Plus, Search, X } from "lucide-react";
import type { SkillCategory, SkillLevel } from "@prisma/client";
import { cn } from "@/lib/utils";
import { SKILL_CATEGORY_LABEL, SKILL_LEVELS } from "@/lib/taxonomy";

export type SkillOption = { id: string; name: string; category: SkillCategory };

type Props =
  | {
      id?: string;
      skills: SkillOption[];
      withLevels: true;
      value: { skillId: string; level: SkillLevel }[];
      onChange: (next: { skillId: string; level: SkillLevel }[]) => void;
      max?: number;
    }
  | {
      id?: string;
      skills: SkillOption[];
      withLevels?: false;
      value: string[];
      onChange: (next: string[]) => void;
      max?: number;
    };

/** Combobox over the canonical skill taxonomy, optionally with proficiency per skill. */
export function SkillPicker(props: Props) {
  const { skills, max = 12, id } = props;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  const selectedIds = props.withLevels ? props.value.map((v) => v.skillId) : props.value;
  const byId = React.useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => !q || s.name.toLowerCase().includes(q)).slice(0, 40);
  }, [skills, query]);

  const toggle = (skillId: string) => {
    if (props.withLevels) {
      const exists = props.value.some((v) => v.skillId === skillId);
      if (exists) props.onChange(props.value.filter((v) => v.skillId !== skillId));
      else if (props.value.length < max) props.onChange([...props.value, { skillId, level: "PRACTICED" }]);
    } else {
      const exists = props.value.includes(skillId);
      if (exists) props.onChange(props.value.filter((v) => v !== skillId));
      else if (props.value.length < max) props.onChange([...props.value, skillId]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-line-strong bg-surface-raised px-3 text-sm text-muted shadow-xs transition-colors hover:border-accent hover:text-accent"
          >
            <Plus className="size-4" aria-hidden />
            {selectedIds.length >= max ? `Maximum of ${max} skills` : "Add skills"}
            <span className="ml-auto text-xs tabular text-faint">
              {selectedIds.length}/{max}
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-surface-raised shadow-pop data-[state=open]:animate-slide-up"
          >
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="size-4 text-faint" aria-hidden />
              <input
                autoFocus
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].id}` : undefined}
                aria-label="Search skills"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const s = filtered[active];
                    if (s) toggle(s.id);
                  }
                }}
                placeholder="Search skills…"
                className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
              />
            </div>
            <ul id={listId} role="listbox" aria-multiselectable className="max-h-72 overflow-y-auto p-1">
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matching skills</li>}
              {filtered.map((s, i) => {
                const selected = selectedIds.includes(s.id);
                return (
                  <li
                    key={s.id}
                    id={`${listId}-${s.id}`}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm",
                      i === active ? "bg-paper-2 text-ink" : "text-ink-2",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("grid size-4 place-items-center rounded-[4px] border", selected ? "border-accent bg-accent text-white" : "border-line-strong")}>
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      {s.name}
                    </span>
                    <span className="text-xs text-faint">{SKILL_CATEGORY_LABEL[s.category]}</span>
                  </li>
                );
              })}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {props.withLevels ? (
        props.value.length > 0 && (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {props.value.map((v) => (
              <li key={v.skillId} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{byId.get(v.skillId)?.name ?? "Unknown skill"}</span>
                <div role="radiogroup" aria-label={`Proficiency in ${byId.get(v.skillId)?.name}`} className="flex rounded-md border border-line bg-paper p-0.5">
                  {SKILL_LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      role="radio"
                      aria-checked={v.level === l.value}
                      onClick={() =>
                        props.onChange(props.value.map((x) => (x.skillId === v.skillId ? { ...x, level: l.value } : x)))
                      }
                      className={cn(
                        "h-6 rounded-[5px] px-2 text-[11px] font-medium transition-colors",
                        v.level === l.value ? "bg-surface-raised text-ink shadow-sm" : "text-muted hover:text-ink",
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(v.skillId)}
                  className="grid size-6 place-items-center rounded-md text-faint hover:bg-paper-2 hover:text-ink"
                  aria-label={`Remove ${byId.get(v.skillId)?.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        props.value.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {props.value.map((sid) => (
              <span key={sid} className="inline-flex h-7 items-center gap-1 rounded-full border border-line bg-surface pl-2.5 pr-1 text-xs text-ink">
                {byId.get(sid)?.name}
                <button type="button" onClick={() => toggle(sid)} className="grid size-5 place-items-center rounded-full text-faint hover:bg-paper-2 hover:text-ink" aria-label={`Remove ${byId.get(sid)?.name}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )
      )}
    </div>
  );
}
