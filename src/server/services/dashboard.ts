import "server-only";
import { db } from "@/server/db";
import { profileCompletion } from "@/lib/profile-completion";
import { visibleProjectWhere } from "./privacy";
import { getUserRanking } from "./rankings";
import { recommendTeammates } from "./discovery";

/** Active projects the user isn't on, with open roles, ranked by interest and skill fit. */
export async function recommendProjects(userId: string, take = 4) {
  const me = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { skills: { select: { skillId: true } }, profile: { select: { preferredCategories: true } } },
  });
  const mySkills = new Set(me.skills.map((s) => s.skillId));
  const categories = me.profile?.preferredCategories ?? [];
  const candidates = await db.project.findMany({
    where: {
      AND: [visibleProjectWhere(userId), { status: "ACTIVE", members: { none: { userId } }, roles: { some: { isOpen: true } } }],
    },
    take: 150,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      category: true,
      stage: true,
      commitment: true,
      skills: { select: { id: true, name: true } },
      roles: { where: { isOpen: true }, select: { id: true, title: true, skills: { select: { id: true, name: true } } } },
      _count: { select: { members: true } },
    },
  });
  return candidates
    .map((p) => {
      const all = new Map([...p.skills, ...p.roles.flatMap((r) => r.skills)].map((s) => [s.id, s.name]));
      const matchedSkillNames = [...all].filter(([id]) => mySkills.has(id)).map(([, name]) => name);
      const score = matchedSkillNames.length * 2 + (categories.includes(p.category) ? 3 : 0);
      return { ...p, matchedSkillNames, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
}

export async function getDashboard(userId: string) {
  const [profile, counts, ranking, teammates, projects, myProjects, activity, saved, invitations, applications] = await Promise.all([
    db.profile.findUniqueOrThrow({
      where: { userId },
      select: {
        displayName: true,
        headline: true,
        bio: true,
        intendedMajor: true,
        preferredCategories: true,
        preferredRoles: true,
        languages: true,
        githubUrl: true,
        websiteUrl: true,
        linkedinUrl: true,
        onboardedAt: true,
        onboardingStep: true,
      },
    }),
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { _count: { select: { skills: true, portfolioItems: true, achievements: true } } },
    }),
    getUserRanking(userId),
    recommendTeammates(userId, 4),
    recommendProjects(userId, 4),
    db.project.findMany({
      where: { status: "ACTIVE", members: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        stage: true,
        category: true,
        members: { where: { userId }, select: { role: true } },
        milestones: { select: { status: true, assigneeId: true, title: true, dueDate: true } },
        _count: { select: { members: true, applications: { where: { status: "PENDING" } } } },
      },
    }),
    db.activityEvent.findMany({
      where: { project: { status: "ACTIVE", members: { some: { userId } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actor: { select: { profile: { select: { displayName: true } } } },
        project: { select: { slug: true, title: true } },
      },
    }),
    db.savedProfile.findMany({
      where: { userId, savedUser: { suspendedAt: null, profile: { is: { visibility: { not: "PRIVATE" } } } } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        savedUser: {
          select: { id: true, profile: { select: { username: true, displayName: true, headline: true, avatarHue: true, avatarMime: true, avatarUpdatedAt: true } } },
        },
      },
    }),
    db.collaborationInvitation.findMany({
      where: { recipientId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { project: { select: { title: true, slug: true } }, sender: { select: { profile: { select: { displayName: true } } } } },
    }),
    db.projectApplication.findMany({
      where: { status: "PENDING", project: { status: "ACTIVE", members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { project: { select: { title: true, slug: true } }, applicant: { select: { profile: { select: { displayName: true } } } } },
    }),
  ]);

  const completion = profileCompletion({
    headline: profile.headline,
    bio: profile.bio,
    intendedMajor: profile.intendedMajor,
    skillsCount: counts._count.skills,
    preferredCategories: profile.preferredCategories,
    preferredRoles: profile.preferredRoles,
    languages: profile.languages,
    hasLinks: Boolean(profile.githubUrl || profile.websiteUrl || profile.linkedinUrl),
    portfolioCount: counts._count.portfolioItems,
    achievementsCount: counts._count.achievements,
    hasAvatarOrHue: true,
  });

  return { profile, completion, ranking, teammates, projects, myProjects, activity, saved, invitations, applications };
}
