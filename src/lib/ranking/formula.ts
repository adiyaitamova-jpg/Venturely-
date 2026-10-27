/**
 * Venturely ranking formula — v1.
 *
 * Rankings reward demonstrated, evidence-backed work. They never use followers,
 * profile views, likes or raw activity counts. Everything here is a pure function
 * of database records so it can be unit-tested and re-run "as of" any date
 * (which is how ranking movement is computed).
 *
 * A user's score is the sum of five signals. Within each signal, items are sorted
 * by value and multiplied by a decay factor (decay^i), then the signal is capped.
 * Decay + caps mean that the 10th small item is worth far less than the first
 * substantial one, so spamming entries doesn't move the needle.
 *
 * 1. Achievements
 *    Base points by level: school 8, regional 16, national 30, international 45.
 *    Verified achievements count in full (cap 150, decay 0.85).
 *    Self-reported or pending achievements count at 25% (cap 20) — they are
 *    clearly labelled "provisional". Rejected achievements count for nothing.
 *
 * 2. Project outcomes (per project the user belongs to)
 *    Stage points: in progress 3, prototype 10, launched 22, completed 26.
 *    Launched/completed only count in full when the project documents outcomes
 *    (≥ 80 characters) AND links a demo or repository; otherwise they are scored
 *    as a prototype. Owners/admins get 100%, members with documented
 *    responsibilities 80%, members without 50%. Only memberships older than
 *    7 days on projects older than 14 days count. Top 5 projects, decay 0.7.
 *
 * 3. Substantive contributions
 *    Completed milestones assigned to the user: 3 points (+2 with an evidence
 *    link). At most 4 milestones per project count. Cap 36, decay 0.92.
 *
 * 4. Evidence of skills
 *    A declared skill counts once it is evidenced: linked to a portfolio item
 *    with a project/evidence link, or required by a prototype-or-later project
 *    the user is a member of. 3 points per evidenced skill, cap 30. Declaring a
 *    skill alone earns nothing.
 *
 * 5. Peer collaboration feedback
 *    Teammates on the same project can rate contribution and reliability (1–5).
 *    Safeguards: the author's account must be ≥ 14 days old at the time; only
 *    the latest feedback per author→subject pair counts (no farming across
 *    projects); mutual 5-star pairs are halved; with fewer than 2 distinct
 *    authors the signal is halved. Each feedback is worth up to 6 points, cap 30.
 *
 * Category leaderboards apply the same rules to the subset of items tagged with
 * that category. Users who are private, suspended or not yet onboarded are never
 * ranked. Scores are computed only on the server; there is no API to set them.
 */
import type {
  AchievementLevel,
  MemberRole,
  MilestoneStatus,
  ProjectCategory,
  ProjectStage,
  RankCategory,
  SkillCategory,
  VerificationStatus,
} from "@prisma/client";

export const FORMULA_VERSION = "v1";

export const RANKING_CONFIG = {
  achievements: {
    levelPoints: { SCHOOL: 8, REGIONAL: 16, NATIONAL: 30, INTERNATIONAL: 45 } satisfies Record<AchievementLevel, number>,
    verifiedCap: 150,
    unverifiedWeight: 0.25,
    unverifiedCap: 20,
    decay: 0.85,
  },
  projects: {
    stagePoints: {
      IDEA: 0,
      PLANNING: 0,
      IN_PROGRESS: 3,
      PROTOTYPE: 10,
      LAUNCHED: 22,
      COMPLETED: 26,
    } satisfies Record<ProjectStage, number>,
    minOutcomeChars: 80,
    leadShare: 1,
    memberShare: 0.8,
    undocumentedMemberShare: 0.5,
    minProjectAgeDays: 14,
    minMembershipAgeDays: 7,
    maxProjects: 5,
    decay: 0.7,
  },
  contributions: {
    perMilestone: 3,
    evidenceBonus: 2,
    maxPerProject: 4,
    cap: 36,
    decay: 0.92,
  },
  skills: {
    perSkill: 3,
    cap: 30,
  },
  feedback: {
    maxPerFeedback: 6,
    minAuthorAccountAgeDays: 14,
    mutualPerfectFactor: 0.5,
    minDistinctAuthors: 2,
    fewAuthorsFactor: 0.5,
    cap: 30,
  },
} as const;

export type Signal = "achievementsVerified" | "achievementsUnverified" | "projects" | "contributions" | "skills" | "feedback";

export const SIGNAL_LABEL: Record<Signal, string> = {
  achievementsVerified: "Verified achievements",
  achievementsUnverified: "Self-reported achievements",
  projects: "Project outcomes",
  contributions: "Completed contributions",
  skills: "Evidenced skills",
  feedback: "Peer feedback",
};

export function rankCategoryForProject(category: ProjectCategory): Exclude<RankCategory, "GLOBAL"> {
  switch (category) {
    case "AI":
      return "AI";
    case "SOFTWARE":
    case "ROBOTICS":
      return "ENGINEERING";
    case "RESEARCH":
      return "RESEARCH";
    case "DESIGN":
      return "DESIGN";
    case "ENTREPRENEURSHIP":
      return "ENTREPRENEURSHIP";
    case "SUSTAINABILITY":
    case "EDUCATION":
    case "SOCIAL_IMPACT":
      return "IMPACT";
  }
}

export function rankCategoryForSkill(category: SkillCategory): Exclude<RankCategory, "GLOBAL"> | null {
  switch (category) {
    case "ENGINEERING":
    case "HARDWARE":
      return "ENGINEERING";
    case "AI_DATA":
      return "AI";
    case "RESEARCH":
      return "RESEARCH";
    case "DESIGN":
      return "DESIGN";
    case "BUSINESS":
      return "ENTREPRENEURSHIP";
    case "COMMUNICATION":
      return null;
  }
}

// ─────────────────────────── Input shapes ───────────────────────────

export interface RankingInput {
  asOf: Date;
  users: { id: string; createdAt: Date; skillIds: string[] }[];
  skillCategories: Record<string, SkillCategory>;
  achievements: {
    userId: string;
    level: AchievementLevel;
    category: ProjectCategory;
    status: VerificationStatus;
    createdAt: Date;
    verifiedAt: Date | null;
  }[];
  projects: {
    id: string;
    category: ProjectCategory;
    stage: ProjectStage;
    outcomes: string;
    repoUrl: string | null;
    demoUrl: string | null;
    createdAt: Date;
    skillIds: string[];
  }[];
  memberships: { userId: string; projectId: string; role: MemberRole; responsibilities: string; joinedAt: Date }[];
  milestones: {
    projectId: string;
    assigneeId: string | null;
    status: MilestoneStatus;
    completedAt: Date | null;
    evidenceUrl: string | null;
  }[];
  portfolio: {
    userId: string;
    category: ProjectCategory;
    projectUrl: string | null;
    evidenceUrl: string | null;
    createdAt: Date;
    skillIds: string[];
  }[];
  feedback: {
    projectId: string;
    authorId: string;
    subjectId: string;
    contribution: number;
    reliability: number;
    createdAt: Date;
  }[];
}

/** A single scored contribution before decay and caps are applied. */
export interface ScoreItem {
  userId: string;
  signal: Signal;
  categories: Exclude<RankCategory, "GLOBAL">[];
  points: number;
  /** Groups items for per-group limits (e.g. milestones per project). */
  group?: string;
}

export type Breakdown = Record<Signal, number>;

export interface UserScore {
  userId: string;
  category: RankCategory;
  score: number;
  verifiedPoints: number;
  breakdown: Breakdown;
  /** True when no verified achievement and no evidence-backed project contributes. */
  provisional: boolean;
}

const DAY = 24 * 3600 * 1000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function hasProjectEvidence(p: Pick<RankingInput["projects"][number], "outcomes" | "repoUrl" | "demoUrl">) {
  return p.outcomes.trim().length >= RANKING_CONFIG.projects.minOutcomeChars && Boolean(p.repoUrl || p.demoUrl);
}

export function effectiveStagePoints(p: RankingInput["projects"][number]): number {
  const { stagePoints } = RANKING_CONFIG.projects;
  if ((p.stage === "LAUNCHED" || p.stage === "COMPLETED") && !hasProjectEvidence(p)) return stagePoints.PROTOTYPE;
  return stagePoints[p.stage];
}

// ─────────────────────────── Item extraction ───────────────────────────

export function extractItems(input: RankingInput): { items: ScoreItem[]; evidenced: Set<string> } {
  const { asOf } = input;
  const cfg = RANKING_CONFIG;
  const items: ScoreItem[] = [];
  /** userIds with at least one verified achievement or evidence-backed project. */
  const evidenced = new Set<string>();
  const projectById = new Map(input.projects.map((p) => [p.id, p]));
  const userById = new Map(input.users.map((u) => [u.id, u]));

  // 1. Achievements
  for (const a of input.achievements) {
    if (a.createdAt > asOf) continue;
    const base = cfg.achievements.levelPoints[a.level];
    const cat = rankCategoryForProject(a.category);
    const verifiedNow = a.status === "VERIFIED" && a.verifiedAt !== null && a.verifiedAt <= asOf;
    if (verifiedNow) {
      items.push({ userId: a.userId, signal: "achievementsVerified", categories: [cat], points: base });
      evidenced.add(a.userId);
    } else if (a.status !== "REJECTED") {
      items.push({
        userId: a.userId,
        signal: "achievementsUnverified",
        categories: [cat],
        points: base * cfg.achievements.unverifiedWeight,
      });
    }
  }

  // 2. Project outcomes
  for (const m of input.memberships) {
    const p = projectById.get(m.projectId);
    if (!p) continue;
    if (p.createdAt.getTime() > asOf.getTime() - cfg.projects.minProjectAgeDays * DAY) continue;
    if (m.joinedAt.getTime() > asOf.getTime() - cfg.projects.minMembershipAgeDays * DAY) continue;
    const stagePts = effectiveStagePoints(p);
    if (stagePts <= 0) continue;
    const share =
      m.role === "OWNER" || m.role === "ADMIN"
        ? cfg.projects.leadShare
        : m.responsibilities.trim().length > 0
          ? cfg.projects.memberShare
          : cfg.projects.undocumentedMemberShare;
    items.push({
      userId: m.userId,
      signal: "projects",
      categories: [rankCategoryForProject(p.category)],
      points: stagePts * share,
    });
    if ((p.stage === "LAUNCHED" || p.stage === "COMPLETED") && hasProjectEvidence(p)) evidenced.add(m.userId);
  }

  // 3. Contributions — only milestones on projects the assignee is still a member of.
  const memberKey = new Set(input.memberships.map((m) => `${m.projectId}:${m.userId}`));
  for (const ms of input.milestones) {
    if (ms.status !== "DONE" || !ms.assigneeId || !ms.completedAt || ms.completedAt > asOf) continue;
    if (!memberKey.has(`${ms.projectId}:${ms.assigneeId}`)) continue;
    const p = projectById.get(ms.projectId);
    if (!p) continue;
    items.push({
      userId: ms.assigneeId,
      signal: "contributions",
      categories: [rankCategoryForProject(p.category)],
      points: cfg.contributions.perMilestone + (ms.evidenceUrl ? cfg.contributions.evidenceBonus : 0),
      group: ms.projectId,
    });
  }

  // 4. Skill evidence — declared skills backed by evidence.
  const evidencedSkills = new Map<string, Set<string>>();
  const addSkill = (userId: string, skillId: string) => {
    const user = userById.get(userId);
    if (!user || !user.skillIds.includes(skillId)) return;
    let set = evidencedSkills.get(userId);
    if (!set) evidencedSkills.set(userId, (set = new Set()));
    set.add(skillId);
  };
  for (const item of input.portfolio) {
    if (item.createdAt > asOf || !(item.projectUrl || item.evidenceUrl)) continue;
    for (const s of item.skillIds) addSkill(item.userId, s);
  }
  const advanced: ProjectStage[] = ["PROTOTYPE", "LAUNCHED", "COMPLETED"];
  for (const m of input.memberships) {
    const p = projectById.get(m.projectId);
    if (!p || !advanced.includes(p.stage) || m.joinedAt > asOf) continue;
    for (const s of p.skillIds) addSkill(m.userId, s);
  }
  for (const [userId, skills] of evidencedSkills) {
    for (const skillId of skills) {
      const sc = input.skillCategories[skillId];
      const cat = sc ? rankCategoryForSkill(sc) : null;
      items.push({ userId, signal: "skills", categories: cat ? [cat] : [], points: cfg.skills.perSkill });
    }
  }

  // 5. Peer feedback with anti-manipulation safeguards.
  const latestByPair = new Map<string, RankingInput["feedback"][number]>();
  for (const f of input.feedback) {
    if (f.createdAt > asOf || f.authorId === f.subjectId) continue;
    if (!memberKey.has(`${f.projectId}:${f.authorId}`) || !memberKey.has(`${f.projectId}:${f.subjectId}`)) continue;
    const author = userById.get(f.authorId);
    if (!author) continue;
    if (f.createdAt.getTime() - author.createdAt.getTime() < cfg.feedback.minAuthorAccountAgeDays * DAY) continue;
    const key = `${f.authorId}>${f.subjectId}`;
    const prev = latestByPair.get(key);
    if (!prev || prev.createdAt < f.createdAt) latestByPair.set(key, f);
  }
  const authorsBySubject = new Map<string, Set<string>>();
  for (const f of latestByPair.values()) {
    let set = authorsBySubject.get(f.subjectId);
    if (!set) authorsBySubject.set(f.subjectId, (set = new Set()));
    set.add(f.authorId);
  }
  for (const f of latestByPair.values()) {
    const avg = (clampRating(f.contribution) + clampRating(f.reliability)) / 2;
    let points = ((avg - 1) / 4) * cfg.feedback.maxPerFeedback;
    const reverse = latestByPair.get(`${f.subjectId}>${f.authorId}`);
    const perfect = (x: typeof f) => x.contribution === 5 && x.reliability === 5;
    if (reverse && perfect(f) && perfect(reverse)) points *= cfg.feedback.mutualPerfectFactor;
    if ((authorsBySubject.get(f.subjectId)?.size ?? 0) < cfg.feedback.minDistinctAuthors) {
      points *= cfg.feedback.fewAuthorsFactor;
    }
    const p = projectById.get(f.projectId);
    items.push({
      userId: f.subjectId,
      signal: "feedback",
      categories: p ? [rankCategoryForProject(p.category)] : [],
      points,
    });
  }

  return { items, evidenced };
}

function clampRating(n: number) {
  return Math.min(5, Math.max(1, Math.round(n)));
}

// ─────────────────────────── Aggregation ───────────────────────────

function decayed(points: number[], decay: number, cap: number, maxItems = Infinity): number {
  const sorted = [...points].sort((a, b) => b - a).slice(0, maxItems);
  const total = sorted.reduce((sum, p, i) => sum + p * Math.pow(decay, i), 0);
  return Math.min(total, cap);
}

/** Applies decay, per-group limits and caps to one user's items within one scope. */
export function aggregate(items: ScoreItem[]): Breakdown {
  const cfg = RANKING_CONFIG;
  const by = (s: Signal) => items.filter((i) => i.signal === s);

  const contributionPoints: number[] = [];
  const perGroup = new Map<string, number[]>();
  for (const i of by("contributions")) {
    const g = i.group ?? "";
    const list = perGroup.get(g) ?? [];
    list.push(i.points);
    perGroup.set(g, list);
  }
  for (const list of perGroup.values()) {
    contributionPoints.push(...list.sort((a, b) => b - a).slice(0, cfg.contributions.maxPerProject));
  }

  return {
    achievementsVerified: round1(
      decayed(by("achievementsVerified").map((i) => i.points), cfg.achievements.decay, cfg.achievements.verifiedCap),
    ),
    achievementsUnverified: round1(
      decayed(by("achievementsUnverified").map((i) => i.points), cfg.achievements.decay, cfg.achievements.unverifiedCap),
    ),
    projects: round1(
      decayed(by("projects").map((i) => i.points), cfg.projects.decay, Infinity, cfg.projects.maxProjects),
    ),
    contributions: round1(decayed(contributionPoints, cfg.contributions.decay, cfg.contributions.cap)),
    skills: round1(Math.min(by("skills").reduce((s, i) => s + i.points, 0), cfg.skills.cap)),
    feedback: round1(Math.min(by("feedback").reduce((s, i) => s + i.points, 0), cfg.feedback.cap)),
  };
}

export const ALL_RANK_CATEGORIES: RankCategory[] = [
  "GLOBAL",
  "ENGINEERING",
  "AI",
  "RESEARCH",
  "DESIGN",
  "ENTREPRENEURSHIP",
  "IMPACT",
];

export function computeScores(input: RankingInput): UserScore[] {
  const { items, evidenced } = extractItems(input);
  const byUser = new Map<string, ScoreItem[]>();
  for (const i of items) {
    const list = byUser.get(i.userId) ?? [];
    list.push(i);
    byUser.set(i.userId, list);
  }

  const results: UserScore[] = [];
  for (const user of input.users) {
    const userItems = byUser.get(user.id) ?? [];
    for (const category of ALL_RANK_CATEGORIES) {
      const scoped = category === "GLOBAL" ? userItems : userItems.filter((i) => i.categories.includes(category));
      const breakdown = aggregate(scoped);
      const score = round1(Object.values(breakdown).reduce((a, b) => a + b, 0));
      if (score <= 0) continue;
      results.push({
        userId: user.id,
        category,
        score,
        verifiedPoints: breakdown.achievementsVerified,
        breakdown,
        provisional: !evidenced.has(user.id),
      });
    }
  }
  return results;
}

/**
 * Standard competition ranking ("1, 2, 2, 4"). Ties on score are broken by
 * verified points; users still tied share a rank.
 */
export function assignRanks(scores: UserScore[]): (UserScore & { rank: number })[] {
  const out: (UserScore & { rank: number })[] = [];
  const byCategory = new Map<RankCategory, UserScore[]>();
  for (const s of scores) {
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => b.score - a.score || b.verifiedPoints - a.verifiedPoints || a.userId.localeCompare(b.userId));
    let rank = 0;
    list.forEach((s, i) => {
      const prev = list[i - 1];
      if (!prev || prev.score !== s.score || prev.verifiedPoints !== s.verifiedPoints) rank = i + 1;
      out.push({ ...s, rank });
    });
  }
  return out;
}
