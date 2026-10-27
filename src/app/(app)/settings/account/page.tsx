import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { listBlocked } from "@/server/services/social";
import { db } from "@/server/db";
import { VISIBILITY } from "@/lib/taxonomy";
import { AccountForms, BlockedList } from "./account-forms";

export const metadata: Metadata = { title: "Account & privacy" };

export default async function AccountPage() {
  const user = await requireUser("/settings/account");
  const [blocked, profile] = await Promise.all([
    listBlocked(user.id),
    db.profile.findUniqueOrThrow({ where: { userId: user.id }, select: { visibility: true } }),
  ]);
  const vis = VISIBILITY.find((v) => v.value === profile.visibility)!;
  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-6">
        <h2 className="text-base font-semibold">Privacy</h2>
        <dl className="mt-4 space-y-3 text-[13.5px]">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-muted">Profile visibility</dt>
            <dd className="text-ink">
              {vis.label} ·{" "}
              <Link href="/settings/profile#links" className="text-accent hover:underline">
                Change
              </Link>
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-muted">Email address</dt>
            <dd className="text-ink">{user.email} · never shown to other members</dd>
          </div>
        </dl>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          AI Mentor conversations and project evaluations are private to you. When the matcher looks for teammates, it only sees
          profile fields that are already visible to members. Read the{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </section>
      <BlockedList
        blocked={blocked.map((b) => ({
          id: b.blocked.id,
          displayName: b.blocked.profile?.displayName ?? "Member",
          username: b.blocked.profile?.username ?? "",
          avatarHue: b.blocked.profile?.avatarHue ?? 150,
          since: b.createdAt.toISOString(),
        }))}
      />
      <AccountForms isDemo={user.isDemo} />
    </div>
  );
}
