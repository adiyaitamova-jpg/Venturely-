import "server-only";
import type { z } from "zod";
import { db } from "@/server/db";
import { AppError, invalid, notFound } from "@/server/errors";
import type { achievementSchema, portfolioItemSchema } from "@/lib/validation/portfolio";

const MAX_PORTFOLIO_ITEMS = 30;
const MAX_ACHIEVEMENTS = 40;

type PortfolioData = z.output<typeof portfolioItemSchema>;
type AchievementData = z.output<typeof achievementSchema>;

async function assertSkills(ids: string[]) {
  if (!ids.length) return;
  const count = await db.skill.count({ where: { id: { in: ids } } });
  if (count !== new Set(ids).size) throw invalid("One or more selected skills no longer exist.");
}

/** Ownership check that doesn't reveal whether someone else's item exists. */
async function ownPortfolioItem(userId: string, id: string) {
  const item = await db.portfolioItem.findFirst({ where: { id, userId }, select: { id: true } });
  if (!item) throw notFound("That portfolio entry doesn't exist or isn't yours.");
  return item;
}

async function ownAchievement(userId: string, id: string) {
  const item = await db.achievement.findFirst({ where: { id, userId } });
  if (!item) throw notFound("That achievement doesn't exist or isn't yours.");
  return item;
}

// ─────────────────────────── Portfolio items ───────────────────────────

export async function listOwnPortfolio(userId: string) {
  return db.portfolioItem.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { date: "desc" }],
    include: { skills: { select: { id: true, name: true } } },
  });
}

export async function createPortfolioItem(userId: string, data: PortfolioData) {
  const count = await db.portfolioItem.count({ where: { userId } });
  if (count >= MAX_PORTFOLIO_ITEMS) {
    throw new AppError("VALIDATION", `You can keep up to ${MAX_PORTFOLIO_ITEMS} portfolio entries. Curate your strongest work.`);
  }
  await assertSkills(data.skillIds);
  const { skillIds, ...fields } = data;
  const last = await db.portfolioItem.aggregate({ where: { userId }, _max: { position: true } });
  return db.portfolioItem.create({
    data: {
      ...fields,
      userId,
      position: (last._max.position ?? -1) + 1,
      skills: { connect: skillIds.map((id) => ({ id })) },
    },
    select: { id: true },
  });
}

export async function updatePortfolioItem(userId: string, id: string, data: PortfolioData) {
  await ownPortfolioItem(userId, id);
  await assertSkills(data.skillIds);
  const { skillIds, ...fields } = data;
  await db.portfolioItem.update({
    where: { id },
    data: { ...fields, skills: { set: skillIds.map((sid) => ({ id: sid })) } },
  });
}

export async function deletePortfolioItem(userId: string, id: string) {
  await ownPortfolioItem(userId, id);
  await db.portfolioItem.delete({ where: { id } });
}

/** Reorders the caller's items. The submitted ids must be exactly their own set. */
export async function reorderPortfolio(userId: string, ids: string[]) {
  const own = await db.portfolioItem.findMany({ where: { userId }, select: { id: true } });
  const ownSet = new Set(own.map((i) => i.id));
  if (ids.length !== ownSet.size || ids.some((id) => !ownSet.has(id)) || new Set(ids).size !== ids.length) {
    throw invalid("The list changed while you were reordering. Refresh and try again.");
  }
  await db.$transaction(ids.map((id, position) => db.portfolioItem.update({ where: { id }, data: { position } })));
}

// ─────────────────────────── Achievements ───────────────────────────

export async function listOwnAchievements(userId: string) {
  return db.achievement.findMany({ where: { userId }, orderBy: [{ position: "asc" }, { date: "desc" }] });
}

export async function createAchievement(userId: string, data: AchievementData) {
  const count = await db.achievement.count({ where: { userId } });
  if (count >= MAX_ACHIEVEMENTS) throw new AppError("VALIDATION", `You can list up to ${MAX_ACHIEVEMENTS} achievements.`);
  const last = await db.achievement.aggregate({ where: { userId }, _max: { position: true } });
  return db.achievement.create({
    data: { ...data, userId, status: "SELF_REPORTED", position: (last._max.position ?? -1) + 1 },
    select: { id: true },
  });
}

/**
 * Editing anything substantive on a verified/pending achievement resets it to
 * self-reported, so a verification can never be carried over to different claims.
 */
export async function updateAchievement(userId: string, id: string, data: AchievementData) {
  const existing = await ownAchievement(userId, id);
  const substantiveChange =
    existing.title !== data.title ||
    existing.level !== data.level ||
    existing.type !== data.type ||
    existing.issuer !== data.issuer ||
    existing.date.getTime() !== data.date.getTime() ||
    existing.evidenceUrl !== data.evidenceUrl;
  const resetVerification = substantiveChange && existing.status !== "SELF_REPORTED";
  await db.achievement.update({
    where: { id },
    data: {
      ...data,
      ...(resetVerification ? { status: "SELF_REPORTED", verifiedAt: null, verifiedById: null, reviewNote: null } : {}),
    },
  });
  return { verificationReset: resetVerification };
}

export async function deleteAchievement(userId: string, id: string) {
  await ownAchievement(userId, id);
  await db.achievement.delete({ where: { id } });
}

export async function reorderAchievements(userId: string, ids: string[]) {
  const own = await db.achievement.findMany({ where: { userId }, select: { id: true } });
  const ownSet = new Set(own.map((i) => i.id));
  if (ids.length !== ownSet.size || ids.some((id) => !ownSet.has(id)) || new Set(ids).size !== ids.length) {
    throw invalid("The list changed while you were reordering. Refresh and try again.");
  }
  await db.$transaction(ids.map((id, position) => db.achievement.update({ where: { id }, data: { position } })));
}

/** Submits an achievement for moderator review. Requires an evidence link. */
export async function requestVerification(userId: string, id: string) {
  const a = await ownAchievement(userId, id);
  if (a.status === "VERIFIED") throw invalid("This achievement is already verified.");
  if (a.status === "PENDING") throw invalid("This achievement is already waiting for review.");
  if (!a.evidenceUrl) throw invalid("Add an evidence link (e.g. an official results page or certificate) before requesting verification.");
  await db.achievement.update({ where: { id }, data: { status: "PENDING", reviewNote: null } });
}
