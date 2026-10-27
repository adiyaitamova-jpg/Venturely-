import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 h-5 text-2xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-line bg-paper-2 text-ink-2",
        outline: "border-line-strong bg-transparent text-ink-2",
        accent: "border-accent-line bg-accent-soft text-accent-ink",
        positive: "border-positive/20 bg-positive-soft text-positive",
        negative: "border-negative/20 bg-negative-soft text-negative",
        warning: "border-warning/20 bg-warning-soft text-warning",
        info: "border-info/20 bg-info-soft text-info",
        ink: "border-ink bg-ink text-paper",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
