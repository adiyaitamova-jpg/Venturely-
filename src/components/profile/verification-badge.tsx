import { BadgeCheck, CircleDashed, Clock, CircleX } from "lucide-react";
import type { VerificationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { VERIFICATION_LABEL } from "@/lib/taxonomy";

/** Verified status is only shown when an admin actually verified the evidence. */
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "VERIFIED":
      return (
        <Badge tone="accent">
          <BadgeCheck aria-hidden /> {VERIFICATION_LABEL.VERIFIED}
        </Badge>
      );
    case "PENDING":
      return (
        <Badge tone="warning">
          <Clock aria-hidden /> Pending review
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge tone="negative">
          <CircleX aria-hidden /> {VERIFICATION_LABEL.REJECTED}
        </Badge>
      );
    default:
      return (
        <Badge tone="outline">
          <CircleDashed aria-hidden /> {VERIFICATION_LABEL.SELF_REPORTED}
        </Badge>
      );
  }
}
