import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import type { RankCategory } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { getLeaderboard, getUserRanking, RANKING_REFRESH_MINUTES } from "@/server/services/rankings";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { RankMovement } from "@/components/ranking/rank-indicator";
import { RANK_CATEGORIES, RANK_CATEGORY_LABEL } from "@/lib/taxonomy";
import { cn, formatScore, timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Rankings based on verified achievements, shipped projects and real contributions — never popularity.",
};

type Search = Promise<{ category?: string; page?: string }>;

export default async function LeaderboardPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const category = (RANK_CATEGORIES.find((c) => c.value.toLowerCase() === sp.category?.toLowerCase())?.value ?? "GLOBAL") as RankCategory;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const viewer = await getCurrentUser();
  const [board, mine] = await Promise.all([
    getLeaderboard({ category, viewerId: viewer?.id ?? null, page }),
    viewer ? getUserRanking(viewer.id) : null,
  ]);
  const myCategoryRank = mine ? (category === "GLOBAL" ? mine.global : mine.categories.find((c) => c.category === category)) : null;
  const top = board.rows.reduce((m, r) => Math.max(m, r.score), 0) || 1;

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Ranked on evidence: verified achievements, shipped projects, completed contributions and teammate feedback. Followers and profile views never count."
        actions={
          <Link href="/leaderboard/methodology" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
            <Info className="size-4" aria-hidden /> How ranking works
          </Link>
        }
      />

      <nav aria-label="Leaderboard categories" className="-mx-4 mb-6 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-lg border border-line bg-paper-2 p-1">
          {RANK_CATEGORIES.map((c) => {
            const active = c.value === category;
            return (
              <li key={c.value}>
                <Link
                  href={c.value === "GLOBAL" ? "/leaderboard" : `/leaderboard?category=${c.value.toLowerCase()}`}
                  aria-current={active ? "page" : undefined}
                  title={c.description}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md px-3 text-[13px] transition-colors",
                    active ? "bg-surface-raised font-medium text-ink shadow-sm" : "text-muted hover:text-ink",
                  )}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {viewer && (
        <div className="mb-6 flex flex-col gap-2 rounded-lg border border-accent-line bg-accent-softer px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          {myCategoryRank ? (
            <p className="text-ink-2">
              You&apos;re <span className="font-mono font-medium text-ink">#{myCategoryRank.rank}</span> in {RANK_CATEGORY_LABEL[category]} with{" "}
              <span className="font-mono text-ink">{formatScore(myCategoryRank.score)}</span> points.
            </p>
          ) : (
            <p className="text-ink-2">You&apos;re not ranked in {RANK_CATEGORY_LABEL[category]} yet. Ship a project or get an achievement verified to appear here.</p>
          )}
          <Link href={`/u/${viewer.username}`} className="text-[13px] font-medium text-accent hover:underline">
            See your breakdown
          </Link>
        </div>
      )}

      {board.rows.length === 0 ? (
        <EmptyState title="No one is ranked here yet" description="Rankings appear once members have verified achievements or evidence-backed projects in this category." />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{RANK_CATEGORY_LABEL[category]} leaderboard</caption>
              <thead className="border-b border-line bg-paper/60 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                <tr>
                  <th scope="col" className="w-16 px-4 py-2.5">Rank</th>
                  <th scope="col" className="px-2 py-2.5">Member</th>
                  <th scope="col" className="hidden w-44 px-4 py-2.5 md:table-cell">Verified share</th>
                  <th scope="col" className="w-16 px-2 py-2.5 text-center">7 days</th>
                  <th scope="col" className="w-24 px-4 py-2.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {board.rows.map((r) => {
                  const isMe = r.user.id === viewer?.id;
                  const verifiedShare = r.score > 0 ? Math.min(100, (r.verifiedPoints / r.score) * 100) : 0;
                  return (
                    <tr key={r.user.id} className={cn("transition-colors hover:bg-paper/50", isMe && "bg-accent-softer/60")}>
                      <td className="px-4 py-3 align-middle">
                        <span className={cn("font-mono tabular", r.rank <= 3 ? "text-base font-semibold text-ink" : "text-ink-2")}>{r.rank}</span>
                      </td>
                      <td className="px-2 py-3">
                        <Link href={`/u/${r.user.username}`} className="group flex items-center gap-3">
                          <Avatar user={r.user} size="sm" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-ink group-hover:text-accent">{r.user.displayName}</span>
                              {isMe && <Badge tone="accent">You</Badge>}
                              {r.user.isDemo && <Badge tone="outline">Demo</Badge>}
                              {r.breakdown.provisional && <Badge tone="warning">Provisional</Badge>}
                            </span>
                            <span className="block max-w-[52ch] truncate text-xs text-muted">{r.user.headline || r.user.intendedMajor || `@${r.user.username}`}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="flex items-center gap-2" title={`${formatScore(r.verifiedPoints)} of ${formatScore(r.score)} points come from verified achievements`}>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-2">
                            <div className="h-full bg-accent" style={{ width: `${verifiedShare}%` }} />
                          </div>
                          <span className="text-xs tabular text-muted">{Math.round(verifiedShare)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <RankMovement movement={r.movement} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-medium tabular text-ink">{formatScore(r.score)}</span>
                        <div className="ml-auto mt-1 h-0.5 w-16 overflow-hidden rounded-full bg-paper-2" aria-hidden>
                          <div className="ml-auto h-full bg-ink/25" style={{ width: `${(r.score / top) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={board.pageSize} total={board.total} basePath="/leaderboard" params={{ category: category === "GLOBAL" ? undefined : category.toLowerCase() }} />
        </>
      )}
      <p className="mt-6 text-xs text-faint">
        {board.computedAt ? `Updated ${timeAgo(board.computedAt)}. ` : ""}Rankings refresh every {RANKING_REFRESH_MINUTES} minutes.
        {!viewer && " Only members with public profiles are shown to signed-out visitors."}
      </p>
    </div>
  );
}
