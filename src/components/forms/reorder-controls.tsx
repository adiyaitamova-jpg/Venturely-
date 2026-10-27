"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Keyboard-accessible reordering (move up / down) for portfolio lists. */
export function ReorderControls({ index, count, onMove, label }: { index: number; count: number; onMove: (from: number, to: number) => void; label: string }) {
  return (
    <div className="flex flex-col">
      <Button type="button" variant="ghost" size="icon-sm" className="h-6" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="!size-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" className="h-6" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="!size-3.5" />
      </Button>
    </div>
  );
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
