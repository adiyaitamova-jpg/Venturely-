import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdvisoryNote({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p className={cn("flex gap-2 text-xs leading-relaxed text-muted", className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        {children ??
          "AI feedback is advisory and can be wrong. It is not an official evaluation, says nothing about university admission chances, and isn't a measure of anyone's talent. Use your own judgement and talk to mentors you trust."}
      </span>
    </p>
  );
}
