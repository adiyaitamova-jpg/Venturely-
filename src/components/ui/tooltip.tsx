"use client";

import * as React from "react";
import { Tooltip as Primitive } from "radix-ui";

export const TooltipProvider = Primitive.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Primitive.Root delayDuration={250}>
      <Primitive.Trigger asChild>{children}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-ink px-2.5 py-1.5 text-xs leading-snug text-paper shadow-md data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
