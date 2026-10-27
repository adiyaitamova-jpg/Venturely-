import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Flag, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/server/auth/current-user";
import { getModerationQueue } from "@/server/services/moderation";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ACHIEVEMENT_LEVEL_LABEL, ACHIEVEMENT_TYPE_LABEL, REPORT_REASONS } from "@/lib/taxonomy";
import { formatMonthYear, safeExternalUrl, timeAgo } from "@/lib/utils";
import { RecomputeButton, ReportControls, ReviewControls } from "./admin-controls";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const q = await getModerationQueue(admin.id);
  const reasonLabel = new Map(REPORT_REASONS.map((r) => [r.value, r.label]));
  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader
        title="Moderation"
        description={`${q.stats.users} accounts · ${q.stats.projects} projects · ${q.stats.openReports} open reports`}
        actions={<RecomputeButton />}
      />

      <section aria-labelledby="verify-heading">
        <h2 id="verify-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-5 text-accent" aria-hidden /> Verification requests
        </h2>
        <p className="mb-4 text-[13px] text-muted">Only verify when the evidence link clearly shows this person earned this achievement (name match, official source). When unsure, reject with a note asking for better evidence.</p>
        {q.pending.length === 0 ? (
          <EmptyState compact title="No pending verifications" />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {q.pending.map((a) => {
              const evidence = safeExternalUrl(a.evidenceUrl);
              return (
                <li key={a.id} className="space-y-3 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-ink">{a.title}</p>
                      <p className="text-xs text-muted">
                        {ACHIEVEMENT_LEVEL_LABEL[a.level]} {ACHIEVEMENT_TYPE_LABEL[a.type].toLowerCase()} · {a.issuer || "no issuer"} · {formatMonthYear(a.date)} · by{" "}
                        <Link href={`/u/${a.user.profile?.username}`} className="text-accent hover:underline">
                          {a.user.profile?.displayName}
                        </Link>
                      </p>
                    </div>
                    <span className="text-xs text-faint">requested {timeAgo(a.updatedAt)}</span>
                  </div>
                  {evidence ? (
                    <a href={evidence} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
                      Open evidence <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <p className="text-[13px] text-negative">No valid evidence link</p>
                  )}
                  <ReviewControls achievementId={a.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Flag className="size-5 text-negative" aria-hidden /> Open reports
        </h2>
        {q.reports.length === 0 ? (
          <EmptyState compact title="No open reports" />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {q.reports.map((r) => (
              <li key={r.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="negative">{reasonLabel.get(r.reason)}</Badge>
                  {r.href ? (
                    <Link href={r.href} className="font-medium text-ink hover:text-accent">
                      {r.label}
                    </Link>
                  ) : (
                    <span className="text-muted">{r.label}</span>
                  )}
                  <span className="ml-auto text-xs text-faint">
                    by @{r.reporter.profile?.username} · {timeAgo(r.createdAt)}
                  </span>
                </div>
                {r.details && <p className="whitespace-pre-line border-l-2 border-line-strong pl-3 text-[13px] text-ink-2">{r.details}</p>}
                <ReportControls reportId={r.id} ownerId={r.ownerId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
