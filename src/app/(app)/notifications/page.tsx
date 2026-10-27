import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { listNotifications, markAllRead } from "@/server/services/notifications";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await listNotifications(user.id);
  // Viewing the page marks everything read; we render with the pre-read state so unread items stay highlighted this visit.
  if (items.some((n) => !n.readAt)) await markAllRead(user.id);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Notifications" />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="Invitations, application updates and verifications will appear here." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3 px-4 py-3.5">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent")} aria-label={n.readAt ? undefined : "Unread"} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", n.readAt ? "text-ink-2" : "font-medium text-ink")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>}
                  <p className="mt-1 text-2xs text-faint">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.link?.startsWith("/") ? (
                  <Link href={n.link} className="block transition-colors hover:bg-paper/60">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
