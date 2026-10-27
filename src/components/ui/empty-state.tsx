import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-full border border-line bg-surface text-muted">
          <Icon className="size-[18px]" aria-hidden />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted text-pretty">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
