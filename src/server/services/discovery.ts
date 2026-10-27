import "server-only";
import type { Availability, ExperienceLevel, Prisma, ProjectCategory, SkillLevel } from "@prisma/client";
import { db } from "@/server/db";
import { SKILL_LEVEL_RANK } from "@/lib/taxonomy";
import { visibleProjectWhere, visibleUserWhere } from "./privacy";
import { getGlobalRanks } from "./rankings";

export type PeopleFilters = {
  q?: string;
  major?: string;
  skillIds?: string[];
  category?: ProjectCategory;
  experience?: ExperienceLevel;
  availability?: Availability;
  language?: string;
  interest?: string;
  sort?: "relevance" | "ranking" | "newest";
  page?: number;
  pageSize?: number;
};

const MAX_CANDIDATES = 1000;
const AVAILABILITY_WEIGHT: Record<Availability, number> = { COMMITTED: 3, PART_TIME: 2, FEW_HOURS: 1, NOT_AVAILABLE: -4 };

export function buildPeopleWhere(viewerId: string, f: PeopleFilters): Prisma.UserWhereInput {
  const q = f.q?.trim();
  const profile: Prisma.ProfileWhereInput = {
    ...(f.major ? { intendedMajor: { contains: f.major.trim(), mode: "insensitive" } } : {}),
    ...(f.category ? { preferredCategories: { has: f.category } } : {}),
    ...(f.experience ? { experienceLevel: f.experience } : {}),
    ...(f.availability ? { availability: f.availability } : {}),
    ...(f.language ? { languages: { has: f.language } } : {}),
    ...(f.interest ? { OR: [{ causes: { has: f.interest } }, { academicInterests: { has: f.interest } }] } : {}),
  };
  return {
    AND: [
      visibleUserWhere(viewerId),
      { profile: { is: profile } },
      f.skillIds?.length ? { skills: { some: { skillId: { in: f.skillIds } } } } : {},
      q
        ? {
            OR: [
              { profile: { is: { displayName: { contains: q, mode: "insensitive" } } } },
              { profile: { is: { username: { contains: q.replace(/^@/, ""), mode: "insensitive" } } } },
              { profile: { is: { headline: { contains: q, mode: "insensitive" } } } },
              { profile: { is: { bio: { contains: q, mode: "insensitive" } } } },
              { profile: { is: { intendedMajor: { contains: q, mode: "insensitive" } } } },
              { skills: { some: { skill: { name: { contains: q, mode: "insensitive" } } } } },
            ],
          }
        : {},
    ],
  };
}

type Candidate = {
  id: string;
  createdAt: Date;
  profile: { displayName: string; username: string; headline: string; availability: Availability; preferredCategories: ProjectCategory[] } | null;
  skills: { skillId: string; level: SkillLevel }[];
};

/**
 * Deterministic relevance: skills the viewer asked for (weighted by proficiency),
 * skills that complement the viewer's own, shared project interests, availability,
 * and text-match strength. Pure function so it can be unit tested.
 */
export function relevanceScore(
  c: Candidate,
  ctx: { filterSkillIds: string[]; viewerSkillIds: Set<string>; viewerCategories: ProjectCategory[]; q?: string },
): number {
  let score = 0;
  const filterSet = new Set(ctx.filterSkillIds);
  for (const s of c.skills) {
    if (filterSet.has(s.skillId)) score += 4 + SKILL_LEVEL_RANK[s.level] * 1.5;
    else if (!ctx.viewerSkillIds.has(s.skillId)) score += 0.6; // complementary skill
  }
  const p = c.profile;
  if (p) {
    score += p.preferredCategories.filter((cat) => ctx.viewerCategories.includes(cat)).length * 1.5;
    score += AVAILABILITY_WEIGHT[p.availability];
    const q = ctx.q?.trim().toLowerCase();
    if (q) {
      if (p.displayName.toLowerCase().includes(q) || p.username.includes(q.replace(/^@/, ""))) score += 8;
      if (p.headline.toLowerCase().includes(q)) score += 3;
    }
  }
  return score;
}

export async function searchPeople(viewerId: string, f: PeopleFilters) {
  const pageSize = f.pageSize ?? 12;
  const page = Math.max(1, f.page ?? 1);
  const where = buildPeopleWhere(viewerId, f);

  const [candidates, viewer] = await Promise.all([
    db.user.findMany({
      where,
      take: MAX_CANDIDATES,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        profile: { select: { displayName: true, username: true, headline: true, availability: true, preferredCategories: true } },
        skills: { select: { skillId: true, level: true } },
      },
    }),
    db.user.findUnique({
      where: { id: viewerId },
      select: { skills: { select: { skillId: true } }, profile: { select: { preferredCategories: true } } },
    }),
  ]);

  const sort = f.sort ?? "relevance";
  let ordered = candidates;
  const ranks = await getGlobalRanks(candidates.map((c) => c.id));
  if (sort === "ranking") {
    ordered = [...candidates].sort((a, b) => (ranks.get(a.id)?.rank ?? Infinity) - (ranks.get(b.id)?.rank ?? Infinity));
  } else if (sort === "relevance") {
    const ctx = {
      filterSkillIds: f.skillIds ?? [],
      viewerSkillIds: new Set(viewer?.skills.map((s) => s.skillId) ?? []),
      viewerCategories: viewer?.profile?.preferredCategories ?? [],
      q: f.q,
    };
    const scored = candidates.map((c) => ({ c, s: relevanceScore(c, ctx) + (ranks.has(c.id) ? 1 : 0) }));
    scored.sort((a, b) => b.s - a.s || (ranks.get(a.c.id)?.rank ?? Infinity) - (ranks.get(b.c.id)?.rank ?? Infinity));
    ordered = scored.map((x) => x.c);
  }

  const pageIds = ordered.slice((page - 1) * pageSize, page * pageSize).map((c) => c.id);
  const cards = await getPeopleCards(pageIds, viewerId, f.skillIds ?? []);
  return { total: candidates.length, capped: candidates.length >= MAX_CANDIDATES, page, pageSize, items: cards };
}

/** Rich card data for a list of users, in the given order. Only member-visible fields. */
export async function getPeopleCards(ids: string[], viewerId: string | null, highlightSkillIds: string[] = []) {
  if (!ids.length) return [];
  const [users, ranks, saved] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        isDemo: true,
        createdAt: true,
        profile: {
          select: {
            username: true,
            displayName: true,
            headline: true,
            bio: true,
            intendedMajor: true,
            availability: true,
            experienceLevel: true,
            languages: true,
            avatarHue: true,
            avatarMime: true,
            avatarUpdatedAt: true,
          },
        },
        skills: { orderBy: [{ level: "desc" }, { createdAt: "asc" }], select: { level: true, skill: { select: { id: true, name: true } } } },
        achievements: {
          where: { status: { in: ["VERIFIED", "SELF_REPORTED", "PENDING"] } },
          orderBy: [{ status: "asc" }, { position: "asc" }],
          take: 2,
          select: { id: true, title: true, status: true },
        },
        memberships: {
          where: { project: { AND: [visibleProjectWhere(viewerId), { status: "ACTIVE" }] } },
          orderBy: { joinedAt: "desc" },
          take: 2,
          select: { project: { select: { slug: true, title: true, stage: true } } },
        },
      },
    }),
    getGlobalRanks(ids),
    viewerId
      ? db.savedProfile.findMany({ where: { userId: viewerId, savedUserId: { in: ids } }, select: { savedUserId: true } })
      : [],
  ]);
  const savedSet = new Set(saved.map((s) => s.savedUserId));
  const highlight = new Set(highlightSkillIds);
  const byId = new Map(users.map((u) => [u.id, u]));
  return ids
    .map((id) => byId.get(id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u?.profile))
    .map((u) => {
      const p = u.profile!;
      // Highlighted (searched-for) skills first, then by proficiency.
      const skills = [...u.skills].sort((a, b) => Number(highlight.has(b.skill.id)) - Number(highlight.has(a.skill.id)));
      return {
        id: u.id,
        isDemo: u.isDemo,
        username: p.username,
        displayName: p.displayName,
        headline: p.headline,
        bio: p.bio,
        intendedMajor: p.intendedMajor,
        availability: p.availability,
        experienceLevel: p.experienceLevel,
        avatarHue: p.avatarHue,
        hasAvatar: Boolean(p.avatarMime),
        avatarVersion: p.avatarUpdatedAt?.getTime() ?? null,
        skills: skills.slice(0, 6).map((s) => ({ id: s.skill.id, name: s.skill.name, level: s.level, matched: highlight.has(s.skill.id) })),
        extraSkills: Math.max(0, skills.length - 6),
        achievements: u.achievements,
        projects: u.memberships.map((m) => m.project),
        rank: ranks.get(u.id) ?? null,
        saved: savedSet.has(u.id),
      };
    });
}

export type PersonCard = Awaited<ReturnType<typeof getPeopleCards>>[number];

/** Distinct languages and interests among visible members, for filter dropdowns. */
export async function getFilterFacets(viewerId: string) {
  const profiles = await db.profile.findMany({
    where: { user: visibleUserWhere(viewerId) },
    select: { languages: true, causes: true, academicInterests: true },
    take: 2000,
  });
  const count = (lists: string[][]) => {
    const m = new Map<string, number>();
    for (const l of lists) for (const v of l) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  };
  return {
    languages: count(profiles.map((p) => p.languages)).slice(0, 30),
    interests: count(profiles.map((p) => [...p.causes, ...p.academicInterests])).slice(0, 40),
  };
}

/** Recommended teammates for the dashboard: complementary skills + shared interests. */
export async function recommendTeammates(viewerId: string, take = 4) {
  const result = await searchPeople(viewerId, { sort: "relevance", pageSize: take, availability: undefined });
  return result.items.filter((p) => p.availability !== "NOT_AVAILABLE");
}
