import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Right-aligned element in the label row, e.g. a character counter. */
  aside?: React.ReactNode;
}

/** Label + control + hint/error with correct aria wiring via ids. */
export function Field({ label, htmlFor, hint, error, optional, className, children, aside }: FieldProps) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined,
      })
    : children;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
          {optional && <span className="ml-1.5 font-normal text-faint">Optional</span>}
        </label>
        {aside}
      </div>
      {child}
      {error ? (
        <p id={errorId} className="text-[13px] text-negative" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function CharCount({ value, max }: { value: string | undefined | null; max: number }) {
  const n = value?.length ?? 0;
  return (
    <span className={cn("text-xs tabular", n > max ? "text-negative" : "text-faint")} aria-live="polite">
      {n}/{max}
    </span>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-negative/25 bg-negative-soft px-3 py-2 text-sm text-negative">
      {message}
    </div>
  );
}
