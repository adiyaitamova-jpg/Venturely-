import "server-only";
import { db } from "@/server/db";
import { canViewUser, visibleProjectWhere } from "./privacy";
import { getUserRanking } from "./rankings";

/**
 * Everything shown on /u/[username]. Returns null when the viewer may not see
 * the profile (private, blocked, suspended, or signed-out viewing a members-only
 * profile) so the page can 404 without revealing that the account exists.
 * Never selects email or other private fields.
 */
export async function getProfilePage(username: string, viewerId: string | null) {
  const profile = await db.profile.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      userId: true,
      username: true,
      displayName: true,
      headline: true,
      bio: true,
      intendedMajor: true,
      academicInterests: true,
      causes: true,
      languages: true,
      preferredCategories: true,
      preferredRoles: true,
      availability: true,
      experienceLevel: true,
      region: true,
      visibility: true,
      websiteUrl: true,
      githubUrl: true,
      linkedinUrl: true,
      avatarHue: true,
      avatarMime: true,
      avatarUpdatedAt: true,
      onboardedAt: true,
      createdAt: true,
      user: { select: { id: true, isDemo: true, suspendedAt: true } },
    },
  });
  if (!profile || profile.user.suspendedAt) return null;
  const isOwner = viewerId === profile.userId;
  if (!isOwner && !(await canViewUser(viewerId, profile.userId))) return null;

  const userId = profile.userId;
  const [skills, portfolio, achievements, memberships, ranking, saved, blocked] = await Promise.all([
    db.userSkill.findMany({
      where: { userId },
      orderBy: [{ level: "desc" }, { createdAt: "asc" }],
      select: { level: true, skill: { select: { id: true, name: true, category: true } } },
    }),
    db.portfolioItem.findMany({
      where: { userId },
      orderBy: [{ position: "asc" }, { date: "desc" }],
      include: { skills: { select: { id: true, name: true } } },
    }),
    db.achievement.findMany({
      where: { userId, ...(isOwner ? {} : { status: { not: "REJECTED" } }) },
      orderBy: [{ position: "asc" }, { date: "desc" }],
    }),
    db.projectMember.findMany({
      where: { userId, project: isOwner ? {} : { AND: [visibleProjectWhere(viewerId), { status: "ACTIVE" }] } },
      orderBy: { joinedAt: "desc" },
      select: {
        role: true,
        title: true,
        responsibilities: true,
        joinedAt: true,
        project: {
          select: {
            id: true,
            slug: true,
            title: true,
            tagline: true,
            category: true,
            stage: true,
            status: true,
            _count: { select: { members: true } },
          },
        },
      },
    }),
    getUserRanking(userId),
    viewerId && !isOwner
      ? db.savedProfile.findUnique({ where: { userId_savedUserId: { userId: viewerId, savedUserId: userId } }, select: { userId: true } })
      : null,
    viewerId && !isOwner
      ? db.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewerId, blockedId: userId } }, select: { blockerId: true } })
      : null,
  ]);

  // Completed milestones the person delivered, as evidence of contribution.
  const deliveredCount = await db.projectMilestone.count({
    where: { assigneeId: userId, status: "DONE", project: { members: { some: { userId } } } },
  });

  return {
    isOwner,
    isSaved: Boolean(saved),
    isBlocked: Boolean(blocked),
    profile: {
      ...profile,
      id: userId,
      isDemo: profile.user.isDemo,
      hasAvatar: Boolean(profile.avatarMime),
      avatarVersion: profile.avatarUpdatedAt?.getTime() ?? null,
    },
    skills,
    portfolio,
    achievements,
    memberships,
    ranking,
    deliveredCount,
  };
}

export type ProfilePageData = NonNullable<Awaited<ReturnType<typeof getProfilePage>>>;
