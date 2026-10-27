"use client";

import * as React from "react";

/** Calm, honest progress indicator for long-running AI requests (no fake percentages). */
export function Thinking({ steps, className }: { steps: string[]; className?: string }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 6000);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div role="status" aria-live="polite" className={className}>
      <div className="flex items-center gap-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-40 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
        </span>
        <span className="text-sm text-ink-2">{steps[i]}</span>
      </div>
      <p className="mt-1.5 pl-5.5 text-xs text-faint">This usually takes 15–60 seconds.</p>
    </div>
  );
}
