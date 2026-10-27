"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-faint">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">This page hit an unexpected error.</h1>
        <p className="mt-3 text-[15px] text-muted">It&apos;s not you. Try again — if it keeps happening, let us know{error.digest ? ` and mention code ${error.digest}` : ""}.</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
