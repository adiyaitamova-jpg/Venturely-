import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Send } from "lucide-react";
import type { RequestStatus } from "@prisma/client";
import { requireUser } from "@/server/auth/current-user";
import { getRequestsInbox } from "@/server/services/collaboration";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SkillBadge } from "@/components/profile/skill-badge";
import { cn, timeAgo } from "@/lib/utils";
import { RequestButtons } from "./request-buttons";

export const metadata: Metadata = { title: "Requests" };

const STATUS_TONE: Record<RequestStatus, "neutral" | "positive" | "negative" | "warning"> = {
  PENDING: "warning",
  ACCEPTED: "positive",
  DECLINED: "negative",
  CANCELLED: "neutral",
};
const STATUS_LABEL: Record<RequestStatus, string> = { PENDING: "Pending", ACCEPTED: "Accepted", DECLINED: "Declined", CANCELLED: "Cancelled" };

type Person = { id: string; isDemo: boolean; profile: { username: string; displayName: string; headline: string; avatarHue: number; avatarMime: string | null; avatarUpdatedAt: Date | null } | null };
function PersonLine({ person }: { person: Person }) {
  const p = person.profile;
  if (!p) return <span className="text-sm text-muted">Former member</span>;
  return (
    <Link href={`/u/${p.username}`} className="group flex min-w-0 items-center gap-2.5">
      <Avatar user={{ id: person.id, displayName: p.displayName, avatarHue: p.avatarHue, hasAvatar: Boolean(p.avatarMime), avatarVersion: p.avatarUpdatedAt?.getTime() ?? null }} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink group-hover:text-accent">{p.displayName}</span>
        <span className="block truncate text-xs text-muted">{p.headline || `@${p.username}`}</span>
      </span>
    </Link>
  );
}

const TABS = [
  { key: "received", label: "Invitations" },
  { key: "incoming", label: "Applications to review" },
  { key: "applications", label: "Your applications" },
  { key: "sent", label: "Sent invitations" },
] as const;

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser("/requests");
  const { tab: tabParam } = await searchParams;
  const inbox = await getRequestsInbox(user.id);
  const counts = {
    received: inbox.received.filter((r) => r.status === "PENDING").length,
    incoming: inbox.incoming.filter((r) => r.status === "PENDING").length,
    applications: inbox.myApplications.filter((r) => r.status === "PENDING").length,
    sent: inbox.sent.filter((r) => r.status === "PENDING").length,
  };
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? (counts.received === 0 && counts.incoming > 0 ? "incoming" : "received");

  return (
    <div className="max-w-4xl">
      <PageHeader title="Requests" description="Invitations to join teams, and applications to the projects you lead." />
      <nav aria-label="Request types" className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 scrollbar-none sm:mx-0 sm:px-0">
        <ul className="flex gap-6">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={`/requests?tab=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn("-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 text-sm", tab === t.key ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink")}
              >
                {t.label}
                {counts[t.key] > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] leading-[18px] text-white tabular">{counts[t.key]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "received" &&
        (inbox.received.length === 0 ? (
          <EmptyState icon={Inbox} title="No invitations yet" description="When a team invites you to join, it shows up here. A complete profile with portfolio entries gets noticed." />
        ) : (
          <ul className="space-y-3">
            {inbox.received.map((r) => (
              <li key={r.id} className={cn("rounded-lg border bg-surface p-4 sm:p-5", r.status === "PENDING" ? "border-line-strong shadow-xs" : "border-line opacity-80")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      Invitation to join{r.role && <> as <span className="font-medium text-ink">{r.role.title}</span></>} · {timeAgo(r.createdAt)}
                    </p>
                    <Link href={`/projects/${r.project.slug}`} className="mt-1 block text-[17px] font-semibold tracking-[-0.01em] text-ink hover:text-accent">
                      {r.project.title}
                    </Link>
                    <p className="text-[13px] text-ink-2">{r.project.tagline}</p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                <blockquote className="mt-3 whitespace-pre-line border-l-2 border-line-strong pl-3 text-[13.5px] leading-relaxed text-ink-2">{r.message}</blockquote>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PersonLine person={r.sender} />
                  {r.status === "PENDING" && <RequestButtons id={r.id} kind="invitation" />}
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === "incoming" &&
        (inbox.incoming.length === 0 ? (
          <EmptyState icon={Inbox} title="No applications to review" description="Applications to projects you own or administer appear here." />
        ) : (
          <ul className="space-y-3">
            {inbox.incoming.map((a) => (
              <li key={a.id} className={cn("rounded-lg border bg-surface p-4 sm:p-5", a.status === "PENDING" ? "border-line-strong shadow-xs" : "border-line opacity-80")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <PersonLine person={a.applicant} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{timeAgo(a.createdAt)}</span>
                    <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Applied to <Link href={`/projects/${a.project.slug}`} className="font-medium text-ink hover:text-accent">{a.project.title}</Link>
                  {a.role && <> for <span className="font-medium text-ink">{a.role.title}</span></>}
                </p>
                <blockquote className="mt-2 whitespace-pre-line border-l-2 border-line-strong pl-3 text-[13.5px] leading-relaxed text-ink-2">{a.message}</blockquote>
                {a.applicant.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.applicant.skills.map((s) => (
                      <SkillBadge key={s.skill.name} name={s.skill.name} level={s.level} />
                    ))}
                  </div>
                )}
                {a.status === "PENDING" && (
                  <div className="mt-4 flex justify-end">
                    <RequestButtons id={a.id} kind="application" name={a.applicant.profile?.displayName} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}

      {tab === "applications" &&
        (inbox.myApplications.length === 0 ? (
          <EmptyState icon={Send} title="You haven't applied anywhere yet" description="Browse projects with open roles and tell the team what you'd bring." action={<Link href="/projects?open=1" className="text-sm font-medium text-accent hover:underline">Find open roles</Link>} />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {inbox.myApplications.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/projects/${a.project.slug}`} className="font-medium text-ink hover:text-accent">
                    {a.project.title}
                  </Link>
                  <p className="text-xs text-muted">
                    {a.role ? a.role.title : "General application"} · {timeAgo(a.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.status === "PENDING" && <RequestButtons id={a.id} kind="withdraw-application" />}
                  <Badge tone={STATUS_TONE[a.status]}>{a.status === "CANCELLED" ? "Withdrawn" : STATUS_LABEL[a.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === "sent" &&
        (inbox.sent.length === 0 ? (
          <EmptyState icon={Send} title="No invitations sent" description="Invite people from their profile or from AI Mentor matches." />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {inbox.sent.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <PersonLine person={s.recipient} />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>
                    {s.project.title}
                    {s.role && ` · ${s.role.title}`} · {timeAgo(s.createdAt)}
                  </span>
                  {s.status === "PENDING" && <RequestButtons id={s.id} kind="cancel-invitation" />}
                  <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
