import "server-only";
import type { ReportReason, ReportTargetType, SavedSource } from "@prisma/client";
import { db } from "@/server/db";
import { invalid, notFound } from "@/server/errors";
import { canViewUser, visibleUserWhere } from "./privacy";

export async function saveProfile(userId: string, targetId: string, source: SavedSource = "MANUAL", note = "") {
  if (userId === targetId) throw invalid("You can't save your own profile.");
  if (!(await canViewUser(userId, targetId))) throw notFound("That profile isn't available.");
  await db.savedProfile.upsert({
    where: { userId_savedUserId: { userId, savedUserId: targetId } },
    create: { userId, savedUserId: targetId, source, note: note.slice(0, 500) },
    update: note ? { note: note.slice(0, 500), source } : {},
  });
}

export async function unsaveProfile(userId: string, targetId: string) {
  await db.savedProfile.deleteMany({ where: { userId, savedUserId: targetId } });
}

export async function blockUser(userId: string, targetId: string) {
  if (userId === targetId) throw invalid("You can't block yourself.");
  const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw notFound("That person doesn't exist.");
  await db.$transaction([
    db.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId },
      update: {},
    }),
    // Blocking also removes saves and cancels pending requests between the two people.
    db.savedProfile.deleteMany({ where: { OR: [{ userId, savedUserId: targetId }, { userId: targetId, savedUserId: userId }] } }),
    db.collaborationInvitation.updateMany({
      where: {
        status: "PENDING",
        OR: [
          { senderId: userId, recipientId: targetId },
          { senderId: targetId, recipientId: userId },
        ],
      },
      data: { status: "CANCELLED", respondedAt: new Date() },
    }),
  ]);
}

export async function unblockUser(userId: string, targetId: string) {
  await db.block.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
}

export async function listBlocked(userId: string) {
  return db.block.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, blocked: { select: { id: true, profile: { select: { username: true, displayName: true, avatarHue: true } } } } },
  });
}

export async function fileReport(
  reporterId: string,
  input: { targetType: ReportTargetType; targetId: string; reason: ReportReason; details: string },
) {
  const exists = await (async () => {
    switch (input.targetType) {
      case "USER":
        return db.user.count({ where: { id: input.targetId } });
      case "PROJECT":
        return db.project.count({ where: { id: input.targetId } });
      case "PORTFOLIO_ITEM":
        return db.portfolioItem.count({ where: { id: input.targetId } });
      case "ACHIEVEMENT":
        return db.achievement.count({ where: { id: input.targetId } });
    }
  })();
  if (!exists) throw notFound("That content no longer exists.");
  const duplicate = await db.report.findFirst({
    where: { reporterId, targetType: input.targetType, targetId: input.targetId, status: "OPEN" },
    select: { id: true },
  });
  if (duplicate) return { duplicate: true };
  await db.report.create({ data: { reporterId, ...input } });
  return { duplicate: false };
}

export async function listSaved(userId: string) {
  return db.savedProfile.findMany({
    where: { userId, savedUser: visibleUserWhere(userId) },
    orderBy: { createdAt: "desc" },
    select: {
      source: true,
      note: true,
      createdAt: true,
      savedUser: {
        select: {
          id: true,
          isDemo: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              headline: true,
              intendedMajor: true,
              availability: true,
              avatarHue: true,
              avatarMime: true,
              avatarUpdatedAt: true,
              visibility: true,
            },
          },
          skills: { take: 5, orderBy: { level: "desc" }, select: { level: true, skill: { select: { name: true } } } },
        },
      },
    },
  });
}
