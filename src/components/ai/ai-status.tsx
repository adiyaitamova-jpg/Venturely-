import { CircleAlert, Gauge } from "lucide-react";
import { isAIConfigured } from "@/server/ai/config";
import { getAIUsageToday } from "@/server/ai/budget";

/** Shows configuration problems honestly, and the user's remaining daily allowance. */
export async function AIStatus({ userId }: { userId: string }) {
  if (!isAIConfigured()) {
    return (
      <div role="status" className="flex gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[13.5px] text-ink-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-medium text-ink">The AI Mentor isn&apos;t configured on this server.</p>
          <p className="mt-0.5">
            An administrator needs to set <code className="rounded bg-paper px-1 font-mono text-xs">ANTHROPIC_API_KEY</code>. Until then, the Teammate Matcher still returns skill-based
            matches from real profiles (without AI explanations); the Evaluator and Copilot are unavailable.
          </p>
        </div>
      </div>
    );
  }
  const usage = await getAIUsageToday(userId);
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      <Gauge className="size-3.5" aria-hidden /> {usage.remaining} of {usage.requestLimit} mentor requests left in the last 24 hours
    </p>
  );
}
