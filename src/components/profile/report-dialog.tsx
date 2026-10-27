"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ReportTargetType } from "@prisma/client";
import { reportAction } from "@/actions/social";
import { REPORT_REASONS } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  subject,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  subject: string;
}) {
  const [reason, setReason] = React.useState("SPAM");
  const [details, setDetails] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Report ${subject}`} description="Reports are confidential. A moderator reviews every report, usually within 24 hours." size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            const res = await reportAction({ targetType, targetId, reason, details });
            setPending(false);
            if (!res.ok) return setError(res.error);
            toast.success(res.data.duplicate ? "You've already reported this — it's in the queue." : "Thanks. Our moderators will take a look.");
            onOpenChange(false);
            setDetails("");
          }}
          className="space-y-4"
        >
          <FormError message={error} />
          <Field label="What's wrong?" htmlFor="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Details" htmlFor="details" optional hint="Anything that helps us understand the problem.">
            <Textarea id="details" rows={4} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <p className="text-xs leading-relaxed text-muted">If someone is in immediate danger, contact local emergency services first.</p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Send report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
