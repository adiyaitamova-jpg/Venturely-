"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RefreshCw, X } from "lucide-react";
import { recomputeRankingsAction, resolveReportAction, reviewAchievementAction, setSuspendedAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReviewControls({ achievementId }: { achievementId: string }) {
  const router = useRouter();
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState<null | "y" | "n">(null);
  const act = async (approve: boolean) => {
    setPending(approve ? "y" : "n");
    const res = await reviewAchievementAction(achievementId, approve, note);
    setPending(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(approve ? "Verified" : "Marked as not verified");
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input aria-label="Review note" placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} className="h-8 text-xs sm:w-56" />
      <Button size="sm" variant="secondary" loading={pending === "n"} disabled={pending !== null} onClick={() => act(false)}>
        {pending !== "n" && <X />} Reject
      </Button>
      <Button size="sm" loading={pending === "y"} disabled={pending !== null} onClick={() => act(true)}>
        {pending !== "y" && <Check />} Verify
      </Button>
    </div>
  );
}

export function ReportControls({ reportId, ownerId }: { reportId: string; ownerId: string | null }) {
  const router = useRouter();
  const [note, setNote] = React.useState("");
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => {
    const res = await fn();
    if (!res.ok) return toast.error((res as { error: string }).error);
    toast.success(msg);
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Input aria-label="Resolution note" placeholder="Resolution note" value={note} onChange={(e) => setNote(e.target.value)} className="h-8 text-xs sm:w-56" />
      <Button size="sm" variant="secondary" onClick={() => run(() => resolveReportAction(reportId, "dismiss", note), "Report dismissed")}>
        Dismiss
      </Button>
      <Button size="sm" variant="secondary" onClick={() => run(() => resolveReportAction(reportId, "actioned", note), "Marked as actioned")}>
        Mark actioned
      </Button>
      {ownerId && (
        <Button size="sm" variant="danger" onClick={() => run(() => setSuspendedAction(ownerId, true), "Account suspended")}>
          Suspend owner
        </Button>
      )}
    </div>
  );
}

export function RecomputeButton() {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = await recomputeRankingsAction();
        setPending(false);
        if (!res.ok) return toast.error(res.error);
        toast.success(res.data.skipped ? "A recompute is already running" : `Rankings recomputed (${res.data.entries} entries)`);
      }}
    >
      {!pending && <RefreshCw />} Recompute rankings
    </Button>
  );
}
