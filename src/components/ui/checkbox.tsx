"use client";

import * as React from "react";
import { Checkbox as Primitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentProps<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      "peer grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-line-strong bg-surface-raised shadow-xs transition-colors hover:border-faint data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-white disabled:opacity-50 aria-[invalid=true]:border-negative",
      className,
    )}
    {...props}
  >
    <Primitive.Indicator>
      <Check className="size-3.5" strokeWidth={3} />
    </Primitive.Indicator>
  </Primitive.Root>
));
Checkbox.displayName = "Checkbox";
