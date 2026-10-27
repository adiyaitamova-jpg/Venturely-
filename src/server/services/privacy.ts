import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

/**
 * Users a viewer may see in discovery, matching, leaderboards and profile pages.
 * - Signed-out visitors only see PUBLIC profiles.
 * - Members see PUBLIC + MEMBERS profiles.
 * - PRIVATE profiles, suspended accounts and unfinished onboarding are never listed.
 * - Blocks hide people from each other in both directions.
 */
export function visibleUserWhere(viewerId: string | null): Prisma.UserWhereInput {
  return {
    suspendedAt: null,
    profile: {
      is: {
        onboardedAt: { not: null },
        visibility: viewerId ? { in: ["PUBLIC", "MEMBERS"] } : "PUBLIC",
      },
    },
    ...(viewerId
      ? {
          id: { not: viewerId },
          blocks: { none: { blockedId: viewerId } },
          blockedBy: { none: { blockerId: viewerId } },
        }
      : {}),
  };
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const count = await db.block.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return count > 0;
}

export async function canViewUser(viewerId: string | null, targetId: string): Promise<boolean> {
  if (viewerId === targetId) return true;
  const count = await db.user.count({ where: { AND: [{ id: targetId }, visibleUserWhere(viewerId)] } });
  return count > 0;
}

/** Projects visible to a viewer: public projects, members-only projects for members, plus anything they belong to. */
export function visibleProjectWhere(viewerId: string | null): Prisma.ProjectWhereInput {
  const base: Prisma.ProjectWhereInput = {
    owner: { suspendedAt: null },
    visibility: viewerId ? { in: ["PUBLIC", "MEMBERS"] } : "PUBLIC",
  };
  if (!viewerId) return base;
  return {
    OR: [
      { AND: [base, { owner: { blocks: { none: { blockedId: viewerId } }, blockedBy: { none: { blockerId: viewerId } } } }] },
      { members: { some: { userId: viewerId } } },
    ],
  };
}
