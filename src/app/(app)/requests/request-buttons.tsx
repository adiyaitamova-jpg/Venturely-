"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { cancelInvitationAction, respondToInvitationAction, reviewApplicationAction, withdrawApplicationAction } from "@/actions/projects";
import { Button } from "@/components/ui/button";

type Kind = "invitation" | "application" | "cancel-invitation" | "withdraw-application";

export function RequestButtons({ id, kind, name }: { id: string; kind: Kind; name?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<null | "yes" | "no">(null);
  const run = async (which: "yes" | "no", fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setPending(which);
    const res = await fn();
    setPending(null);
    if (!res.ok) return toast.error((res as { error: string }).error);
    toast.success(success);
    router.refresh();
  };

  if (kind === "cancel-invitation")
    return (
      <Button size="sm" variant="ghost" loading={pending === "no"} onClick={() => run("no", () => cancelInvitationAction(id), "Invitation cancelled")}>
        Cancel invitation
      </Button>
    );
  if (kind === "withdraw-application")
    return (
      <Button size="sm" variant="ghost" loading={pending === "no"} onClick={() => run("no", () => withdrawApplicationAction(id), "Application withdrawn")}>
        Withdraw
      </Button>
    );

  const accept = kind === "invitation" ? () => respondToInvitationAction(id, true) : () => reviewApplicationAction(id, true);
  const decline = kind === "invitation" ? () => respondToInvitationAction(id, false) : () => reviewApplicationAction(id, false);
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" disabled={pending !== null} loading={pending === "no"} onClick={() => run("no", decline, "Declined")}>
        {pending !== "no" && <X />} Decline
      </Button>
      <Button
        size="sm"
        disabled={pending !== null}
        loading={pending === "yes"}
        onClick={() => run("yes", accept, kind === "invitation" ? "Welcome to the team!" : `${name ?? "They"} joined the team`)}
      >
        {pending !== "yes" && <Check />} Accept
      </Button>
    </div>
  );
}
