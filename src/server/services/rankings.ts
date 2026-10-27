import "server-only";
import type { Prisma, RankCategory } from "@prisma/client";
import { db } from "@/server/db";
import { FORMULA_VERSION, assignRanks, computeScores, type Breakdown, type RankingInput } from "@/lib/ranking/formula";
import { visibleUserWhere } from "./privacy";

/** Rankings refresh at most this often on demand (plus via cron / admin). */
export const RANKING_REFRESH_MINUTES = 15;
const MOVEMENT_WINDOW_DAYS = 7;
const LOCK_KEY = 728_311;

/** Users who can appear on leaderboards: onboarded, not private, not suspended. */
const eligibleUserWhere: Prisma.UserWhereInput = {
  suspendedAt: null,
  profile: { is: { onboardedAt: { not: null }, visibility: { in: ["PUBLIC", "MEMBERS"] } } },
};

export async function loadRankingInput(asOf: Date): Promise<RankingInput> {
  const [users, skills, achievements, projects, memberships, milestones, portfolio, feedback] = await Promise.all([
    db.user.findMany({
      where: { ...eligibleUserWhere, createdAt: { lte: asOf } },
      select: { id: true, createdAt: true, skills: { select: { skillId: true } } },
    }),
    db.skill.findMany({ select: { id: true, category: true } }),
    db.achievement.findMany({
      where: { createdAt: { lte: asOf } },
      select: { userId: true, level: true, category: true, status: true, createdAt: true, verifiedAt: true },
    }),
    db.project.findMany({
      where: { createdAt: { lte: asOf } },
      select: {
        id: true,
        category: true,
        stage: true,
        outcomes: true,
        repoUrl: true,
        demoUrl: true,
        createdAt: true,
        skills: { select: { id: true } },
      },
    }),
    db.projectMember.findMany({
      where: { joinedAt: { lte: asOf } },
      select: { userId: true, projectId: true, role: true, responsibilities: true, joinedAt: true },
    }),
    db.projectMilestone.findMany({
      where: { status: "DONE" },
      select: { projectId: true, assigneeId: true, status: true, completedAt: true, evidenceUrl: true },
    }),
    db.portfolioItem.findMany({
      where: { createdAt: { lte: asOf } },
      select: { userId: true, category: true, projectUrl: true, evidenceUrl: true, createdAt: true, skills: { select: { id: true } } },
    }),
    db.peerFeedback.findMany({
      where: { createdAt: { lte: asOf } },
      select: { projectId: true, authorId: true, subjectId: true, contribution: true, reliability: true, createdAt: true },
    }),
  ]);

  // Feedback authors may be ineligible for ranking themselves (e.g. private) but their
  // account age still matters for the safeguard, so load them separately.
  const authorIds = [...new Set(feedback.map((f) => f.authorId))].filter((id) => !users.some((u) => u.id === id));
  const extraAuthors = authorIds.length
    ? await db.user.findMany({ where: { id: { in: authorIds }, suspendedAt: null }, select: { id: true, createdAt: true } })
    : [];

  return {
    asOf,
    users: [
      ...users.map((u) => ({ id: u.id, createdAt: u.createdAt, skillIds: u.skills.map((s) => s.skillId) })),
      ...extraAuthors.map((u) => ({ id: u.id, createdAt: u.createdAt, skillIds: [] })),
    ],
    skillCategories: Object.fromEntries(skills.map((s) => [s.id, s.category])),
    achievements,
    projects: projects.map(({ skills: ps, ...p }) => ({ ...p, skillIds: ps.map((s) => s.id) })),
    memberships,
    milestones,
    portfolio: portfolio.map(({ skills: ps, ...p }) => ({ ...p, skillIds: ps.map((s) => s.id) })),
    feedback,
  };
}

/**
 * Recomputes every leaderboard and stores a new RankingRun.
 */
export async function recomputeRankings(asOf: Date = new Date()): Promise<{ runId: string; entries: number } | null> {
  // Transaction-scoped advisory lock: released automatically on commit/rollback,
  // so it is safe with pooled connections. Concurrent callers simply skip.
  return db.$transaction(
    async (tx) => {
      const lock = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
      if (!lock[0]?.locked) return null;
      const input = await loadRankingInput(asOf);
      const eligible = new Set((await tx.user.findMany({ where: eligibleUserWhere, select: { id: true } })).map((u) => u.id));
      const ranked = assignRanks(computeScores(input).filter((s) => eligible.has(s.userId)));
      const run = await tx.rankingRun.create({ data: { formulaVersion: FORMULA_VERSION, computedAt: asOf } });
      for (let i = 0; i < ranked.length; i += 1000) {
        await tx.rankingSnapshot.createMany({
          data: ranked.slice(i, i + 1000).map((r) => ({
            runId: run.id,
            userId: r.userId,
            category: r.category,
            score: r.score,
            verifiedPoints: r.verifiedPoints,
            rank: r.rank,
            breakdown: { ...r.breakdown, provisional: r.provisional },
          })),
        });
      }
      // Keep history bounded: every run from the last 48 hours, then the last run of
      // each day (so 7-day movement always has a baseline), nothing older than 120 days.
      await tx.$executeRaw`
        DELETE FROM "RankingRun"
        WHERE "computedAt" < NOW() - INTERVAL '120 days'
           OR ("computedAt" < NOW() - INTERVAL '48 hours' AND id NOT IN (
                SELECT DISTINCT ON (date_trunc('day', "computedAt")) id FROM "RankingRun"
                ORDER BY date_trunc('day', "computedAt"), "computedAt" DESC))`;
      return { runId: run.id, entries: ranked.length };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}

export async function getLatestRun() {
  return db.rankingRun.findFirst({ orderBy: { computedAt: "desc" } });
}

/** Lazily refreshes rankings when the latest run is stale. */
export async function ensureFreshRankings() {
  const latest = await getLatestRun();
  if (!latest || Date.now() - latest.computedAt.getTime() > RANKING_REFRESH_MINUTES * 60_000) {
    await recomputeRankings();
    return getLatestRun();
  }
  return latest;
}

/** The run used as the baseline for "movement": the newest run at least 7 days older than `latest`. */
async function getReferenceRun(latest: { id: string; computedAt: Date }) {
  const cutoff = new Date(latest.computedAt.getTime() - MOVEMENT_WINDOW_DAYS * 24 * 3600 * 1000);
  return (
    (await db.rankingRun.findFirst({ where: { computedAt: { lte: cutoff } }, orderBy: { computedAt: "desc" } })) ??
    (await db.rankingRun.findFirst({ where: { id: { not: latest.id } }, orderBy: { computedAt: "asc" } }))
  );
}

export type BreakdownWithFlag = Breakdown & { provisional?: boolean };

export type LeaderboardRow = {
  rank: number;
  score: number;
  verifiedPoints: number;
  breakdown: BreakdownWithFlag;
  movement: number | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    headline: string;
    intendedMajor: string;
    avatarHue: number;
    hasAvatar: boolean;
    avatarVersion: number | null;
    isDemo: boolean;
  };
};

export async function getLeaderboard(opts: {
  category: RankCategory;
  viewerId: string | null;
  page: number;
  pageSize?: number;
}): Promise<{ rows: LeaderboardRow[]; total: number; computedAt: Date | null; pageSize: number }> {
  const pageSize = opts.pageSize ?? 25;
  const latest = await ensureFreshRankings();
  if (!latest) return { rows: [], total: 0, computedAt: null, pageSize };
  const visible = visibleUserWhere(opts.viewerId);
  // The viewer can always see themselves on the board.
  const userWhere: Prisma.UserWhereInput = opts.viewerId ? { OR: [visible, { id: opts.viewerId }] } : visible;
  const where: Prisma.RankingSnapshotWhereInput = { runId: latest.id, category: opts.category, user: userWhere };
  const [total, snapshots, reference] = await Promise.all([
    db.rankingSnapshot.count({ where }),
    db.rankingSnapshot.findMany({
      where,
      orderBy: [{ rank: "asc" }, { userId: "asc" }],
      skip: (opts.page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            isDemo: true,
            profile: { select: { username: true, displayName: true, headline: true, intendedMajor: true, avatarHue: true, avatarMime: true, avatarUpdatedAt: true } },
          },
        },
      },
    }),
    getReferenceRun(latest),
  ]);
  const previous = reference
    ? new Map(
        (
          await db.rankingSnapshot.findMany({
            where: { runId: reference.id, category: opts.category, userId: { in: snapshots.map((s) => s.userId) } },
            select: { userId: true, rank: true },
          })
        ).map((s) => [s.userId, s.rank]),
      )
    : new Map<string, number>();

  return {
    total,
    pageSize,
    computedAt: latest.computedAt,
    rows: snapshots.map((s) => {
      const prev = previous.get(s.userId);
      const p = s.user.profile!;
      return {
        rank: s.rank,
        score: s.score,
        verifiedPoints: s.verifiedPoints,
        breakdown: s.breakdown as BreakdownWithFlag,
        movement: reference ? (prev === undefined ? null : prev - s.rank) : 0,
        user: {
          id: s.user.id,
          isDemo: s.user.isDemo,
          username: p.username,
          displayName: p.displayName,
          headline: p.headline,
          intendedMajor: p.intendedMajor,
          avatarHue: p.avatarHue,
          hasAvatar: Boolean(p.avatarMime),
          avatarVersion: p.avatarUpdatedAt?.getTime() ?? null,
        },
      };
    }),
  };
}

export type UserRanking = {
  global: { rank: number; score: number; verifiedPoints: number; breakdown: BreakdownWithFlag; movement: number | null; total: number } | null;
  categories: { category: RankCategory; rank: number; score: number }[];
  history: { computedAt: Date; rank: number; score: number }[];
  computedAt: Date | null;
};

/** A single user's current standing (used on profiles, cards and the dashboard). */
export async function getUserRanking(userId: string): Promise<UserRanking> {
  const latest = await ensureFreshRankings();
  if (!latest) return { global: null, categories: [], history: [], computedAt: null };
  const [snaps, reference, total, history] = await Promise.all([
    db.rankingSnapshot.findMany({ where: { runId: latest.id, userId } }),
    getReferenceRun(latest),
    db.rankingSnapshot.count({ where: { runId: latest.id, category: "GLOBAL" } }),
    db.rankingSnapshot.findMany({
      where: { userId, category: "GLOBAL" },
      orderBy: { run: { computedAt: "asc" } },
      select: { rank: true, score: true, run: { select: { computedAt: true } } },
      take: 60,
    }),
  ]);
  const g = snaps.find((s) => s.category === "GLOBAL");
  const prev = reference && g
    ? await db.rankingSnapshot.findFirst({ where: { runId: reference.id, userId, category: "GLOBAL" }, select: { rank: true } })
    : null;
  return {
    computedAt: latest.computedAt,
    global: g
      ? {
          rank: g.rank,
          score: g.score,
          verifiedPoints: g.verifiedPoints,
          breakdown: g.breakdown as BreakdownWithFlag,
          movement: reference ? (prev ? prev.rank - g.rank : null) : 0,
          total,
        }
      : null,
    categories: snaps
      .filter((s) => s.category !== "GLOBAL")
      .map((s) => ({ category: s.category, rank: s.rank, score: s.score }))
      .sort((a, b) => a.rank - b.rank),
    history: history.map((h) => ({ computedAt: h.run.computedAt, rank: h.rank, score: h.score })),
  };
}

/** Current global rank + score for a batch of users (cards in discovery, matching). */
export async function getGlobalRanks(userIds: string[]): Promise<Map<string, { rank: number; score: number }>> {
  if (!userIds.length) return new Map();
  const latest = await getLatestRun();
  if (!latest) return new Map();
  const snaps = await db.rankingSnapshot.findMany({
    where: { runId: latest.id, category: "GLOBAL", userId: { in: userIds } },
    select: { userId: true, rank: true, score: true },
  });
  return new Map(snaps.map((s) => [s.userId, { rank: s.rank, score: s.score }]));
}
