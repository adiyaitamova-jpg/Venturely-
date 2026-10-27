"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Responsive modal: centered dialog on ≥ sm screens, bottom sheet on phones.
 * `side="right"` renders a full-height side drawer instead (filters, menus).
 */
export function DialogContent({
  className,
  children,
  title,
  description,
  side = "center",
  size = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  side?: "center" | "right" | "left";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[1px] data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface-raised shadow-pop outline-none",
          side === "center" &&
            cn(
              "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl border-t border-line data-[state=open]:animate-slide-in-bottom",
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:data-[state=open]:animate-slide-up",
              size === "sm" && "sm:max-w-md",
              size === "md" && "sm:max-w-lg",
              size === "lg" && "sm:max-w-2xl",
            ),
          side === "right" &&
            "inset-y-0 right-0 w-[min(100%,24rem)] border-l border-line data-[state=open]:animate-slide-in-right",
          side === "left" && "inset-y-0 left-0 w-[min(85%,18rem)] border-r border-line",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-base font-semibold tracking-[-0.01em] text-ink">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] text-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="-mr-1.5 -mt-0.5 grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-paper-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "-mx-5 -mb-4 mt-5 flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
