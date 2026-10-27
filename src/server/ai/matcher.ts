import "server-only";
import type { z } from "zod";
import type { ProjectCategory } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden } from "@/server/errors";
import {
  matchExplanationOutputSchema,
  requirementsOutputSchema,
  type MatchExplanationOutput,
  type matchRequestSchema,
} from "@/lib/ai-schemas";
import { coverage, rankCandidates, type MatchCandidate } from "@/lib/matching";
import { AVAILABILITY_LABEL, SKILL_LEVEL_LABEL } from "@/lib/taxonomy";
import { visibleUserWhere } from "@/server/services/privacy";
import { getGlobalRanks } from "@/server/services/rankings";
import { getPeopleCards, type PersonCard } from "@/server/services/discovery";
import { getMembership } from "@/server/services/projects";
import { getAIProvider } from "./provider";
import { untrusted } from "./guard";
import { MATCH_SYSTEM, REQUIREMENTS_SYSTEM } from "./prompts";
import { runStructured } from "./run";

const SHORTLIST = 6;

export type MatchResult = {
  runId: string;
  aiUsed: boolean;
  aiError: string | null;
  requirements: {
    summary: string;
    skills: { id: string; name: string }[];
    roles: { title: string; skills: string[] }[];
    missingFromBrief: string[];
  };
  candidates: {
    person: PersonCard;
    score: number;
    matchedSkills: string[];
    complementarySkills: string[];
    roleMatches: string[];
    explanation: MatchExplanationOutput["candidates"][number] | null;
  }[];
  team: { summary: string; picks: { role: string; personId: string | null; name: string | null }[] } | null;
  coverage: { covered: string[]; missing: string[] };
  uncoveredNeeds: string[];
};

/**
 * Hybrid teammate matching:
 *   1. (AI, optional) extract requirements from the brief, constrained to our skill taxonomy.
 *   2. Deterministic filtering + scoring over real, eligible member profiles.
 *   3. (AI, optional) explanations and team composition for the shortlist only.
 * The model only ever sees opaque handles (C1…C6) and member-visible profile fields,
 * and its output is mapped back to the shortlist — it cannot add people.
 */
export async function matchTeammates(userId: string, input: z.output<typeof matchRequestSchema>): Promise<MatchResult> {
  const skills = await db.skill.findMany({ select: { id: true, name: true } });
  const skillByName = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
  const skillById = new Map(skills.map((s) => [s.id, s]));

  let project: { id: string; title: string; tagline: string; description: string; category: ProjectCategory } | null = null;
  if (input.projectId) {
    if (!(await getMembership(input.projectId, userId))) throw forbidden("You can only match teammates for projects you're on.");
    project = await db.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, title: true, tagline: true, description: true, category: true },
    });
  }

  const requester = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { skills: { select: { skillId: true } }, profile: { select: { preferredCategories: true } } },
  });

  const aiAvailable = getAIProvider() !== null;
  let aiError: string | null = null;
  let aiUsed = false;

  // ── 1. Requirements ──
  let reqSkillIds = [...new Set(input.skillIds.filter((id) => skillById.has(id)))];
  let roles: { title: string; skills: string[] }[] = input.roles.map((r) => ({ title: r, skills: [] }));
  let categories: ProjectCategory[] = project ? [project.category] : (requester.profile?.preferredCategories ?? []).slice(0, 3);
  let summary = input.brief.slice(0, 280);
  let missingFromBrief: string[] = [];

  if (aiAvailable) {
    try {
      const brief = [
        project ? untrusted("project", `${project.title}\n${project.tagline}\n\n${project.description}`, 4000) : "",
        untrusted("brief", input.brief, 2000),
        input.roles.length ? `Roles the requester already identified: ${input.roles.map((r) => JSON.stringify(r)).join(", ")}` : "",
        `Skill taxonomy (choose only from this list): ${skills.map((s) => s.name).join("; ")}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const { data } = await runStructured({
        userId,
        tool: "MATCHER",
        system: REQUIREMENTS_SYSTEM,
        messages: [{ role: "user", content: brief }],
        schema: requirementsOutputSchema,
        maxTokens: 8000,
      });
      const extracted = data.requiredSkills.map((n) => skillByName.get(n.toLowerCase().trim())?.id).filter((x): x is string => Boolean(x));
      reqSkillIds = [...new Set([...reqSkillIds, ...extracted])].slice(0, 12);
      const known = new Set(roles.map((r) => r.title.toLowerCase()));
      roles = [
        ...roles,
        ...data.roles
          .filter((r) => !known.has(r.title.toLowerCase()))
          .slice(0, 5)
          .map((r) => ({ title: r.title.slice(0, 60), skills: r.skills.filter((n) => skillByName.has(n.toLowerCase())).slice(0, 5) })),
      ].slice(0, 6);
      categories = [...new Set([...(project ? [project.category] : []), ...data.categories])].slice(0, 3);
      summary = data.summary.slice(0, 600);
      missingFromBrief = data.missingFromBrief.slice(0, 4).map((s) => s.slice(0, 200));
      aiUsed = true;
    } catch (err) {
      if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "AI_BUDGET_EXCEEDED")) throw err;
      aiError = err instanceof AppError ? err.message : "The AI step failed.";
    }
  } else {
    aiError = "AI explanations are unavailable because the AI provider isn't configured. Showing skill-based matches only.";
  }

  if (reqSkillIds.length === 0 && roles.length === 0) {
    throw new AppError("VALIDATION", aiUsed ? "We couldn't identify specific skills from your brief. Add a few skills or roles and try again." : "Choose at least one skill or role to match on.");
  }

  // ── 2. Deterministic shortlist over eligible, visible members ──
  const excludeIds = input.projectId
    ? (await db.projectMember.findMany({ where: { projectId: input.projectId }, select: { userId: true } })).map((m) => m.userId)
    : [];
  const pool = await db.user.findMany({
    where: {
      AND: [
        visibleUserWhere(userId),
        { id: { notIn: excludeIds } },
        { profile: { is: { availability: { not: "NOT_AVAILABLE" } } } },
        reqSkillIds.length ? { OR: [{ skills: { some: { skillId: { in: reqSkillIds } } } }, { profile: { is: { preferredRoles: { isEmpty: false } } } }] } : {},
      ],
    },
    take: 1500,
    select: {
      id: true,
      skills: { select: { skillId: true, level: true } },
      profile: { select: { availability: true, experienceLevel: true, preferredCategories: true, preferredRoles: true } },
    },
  });
  const ranks = await getGlobalRanks(pool.map((p) => p.id));
  const candidates: MatchCandidate[] = pool
    .filter((p) => p.profile)
    .map((p) => ({
      id: p.id,
      skills: p.skills,
      availability: p.profile!.availability,
      experienceLevel: p.profile!.experienceLevel,
      preferredCategories: p.profile!.preferredCategories,
      preferredRoles: p.profile!.preferredRoles,
      globalRank: ranks.get(p.id)?.rank ?? null,
    }));
  const shortlist = rankCandidates(
    candidates,
    { skillIds: reqSkillIds, roleTitles: roles.map((r) => r.title), categories, requesterSkillIds: requester.skills.map((s) => s.skillId) },
    SHORTLIST,
  );
  const cards = await getPeopleCards(shortlist.map((s) => s.id), userId, reqSkillIds);
  const cardById = new Map(cards.map((c) => [c.id, c]));

  // ── 3. Explanations (only for real shortlisted people) ──
  let explanation: MatchExplanationOutput | null = null;
  const handles = new Map(shortlist.map((s, i) => [`C${i + 1}`, s.id]));
  if (aiUsed && shortlist.length > 0) {
    try {
      const profiles = await db.user.findMany({
        where: { id: { in: shortlist.map((s) => s.id) } },
        select: {
          id: true,
          profile: { select: { headline: true, bio: true, intendedMajor: true, availability: true, experienceLevel: true, preferredRoles: true, languages: true } },
          skills: { select: { level: true, skill: { select: { name: true } } } },
          achievements: { where: { status: { not: "REJECTED" } }, take: 4, orderBy: { position: "asc" }, select: { title: true, status: true } },
          memberships: { take: 4, where: { project: { status: "ACTIVE", visibility: "PUBLIC" } }, select: { title: true, project: { select: { title: true, stage: true } } } },
        },
      });
      const byId = new Map(profiles.map((p) => [p.id, p]));
      const candidateBlocks = [...handles].map(([handle, id]) => {
        const p = byId.get(id)!;
        const pr = p.profile!;
        const data = [
          `Handle: ${handle}`,
          `Intended major: ${pr.intendedMajor || "not stated"}`,
          `Headline: ${pr.headline}`,
          `Bio: ${pr.bio.slice(0, 500)}`,
          `Skills: ${p.skills.map((s) => `${s.skill.name} (${SKILL_LEVEL_LABEL[s.level]})`).join(", ")}`,
          `Wants to work as: ${pr.preferredRoles.join(", ") || "not stated"}`,
          `Experience: ${pr.experienceLevel.toLowerCase()}; availability: ${AVAILABILITY_LABEL[pr.availability]}; languages: ${pr.languages.join(", ")}`,
          `Achievements: ${p.achievements.map((a) => `${a.title} [${a.status === "VERIFIED" ? "verified" : "self-reported"}]`).join("; ") || "none listed"}`,
          `Projects: ${p.memberships.map((m) => `${m.project.title} (${m.project.stage.toLowerCase()}${m.title ? `, ${m.title}` : ""})`).join("; ") || "none listed"}`,
          `Global rank: ${ranks.get(id) ? `#${ranks.get(id)!.rank}` : "unranked"}`,
        ].join("\n");
        return untrusted("candidate", data, 2000);
      });
      const content = [
        `Project needs (from the requester):\n${untrusted("requirements", `${summary}\nRoles: ${roles.map((r) => r.title).join(", ")}\nKey skills: ${reqSkillIds.map((id) => skillById.get(id)?.name).join(", ")}`, 2000)}`,
        `Candidates (${handles.size}):`,
        ...candidateBlocks,
      ].join("\n\n");
      const { data } = await runStructured({
        userId,
        tool: "MATCHER",
        system: MATCH_SYSTEM,
        messages: [{ role: "user", content }],
        schema: matchExplanationOutputSchema,
        maxTokens: 12000,
      });
      explanation = data;
    } catch (err) {
      if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "AI_BUDGET_EXCEEDED")) {
        aiError = err.message;
      } else {
        aiError = err instanceof AppError ? err.message : "The explanation step failed.";
      }
    }
  }

  const explanationById = new Map<string, MatchExplanationOutput["candidates"][number]>();
  for (const c of explanation?.candidates ?? []) {
    const id = handles.get(c.handle.trim().toUpperCase());
    if (id && !explanationById.has(id)) explanationById.set(id, sanitizeExplanation(c)); // unknown handles are discarded
  }

  const nameOf = (id: string) => cardById.get(id)?.displayName ?? null;
  const team = explanation
    ? {
        summary: explanation.team.summary.slice(0, 800),
        picks: explanation.team.picks.slice(0, 6).map((p) => {
          const id = p.handle ? (handles.get(p.handle.trim().toUpperCase()) ?? null) : null;
          return { role: p.role.slice(0, 60), personId: id, name: id ? nameOf(id) : null };
        }),
      }
    : null;

  const result: Omit<MatchResult, "runId"> = {
    aiUsed: Boolean(explanation),
    aiError,
    requirements: {
      summary,
      skills: reqSkillIds.map((id) => ({ id, name: skillById.get(id)!.name })),
      roles,
      missingFromBrief,
    },
    candidates: shortlist
      .filter((s) => cardById.has(s.id))
      .map((s) => ({
        person: cardById.get(s.id)!,
        score: s.score,
        matchedSkills: s.matchedSkillIds.map((id) => skillById.get(id)!.name),
        complementarySkills: s.complementarySkillIds.map((id) => skillById.get(id)!.name),
        roleMatches: s.roleMatches,
        explanation: explanationById.get(s.id) ?? null,
      })),
    team,
    coverage: (() => {
      const c = coverage(reqSkillIds, shortlist);
      return { covered: c.covered.map((id) => skillById.get(id)!.name), missing: c.missing.map((id) => skillById.get(id)!.name) };
    })(),
    uncoveredNeeds: (explanation?.uncoveredNeeds ?? []).slice(0, 6).map((s) => s.slice(0, 200)),
  };

  const run = await db.aIMatchRun.create({
    data: {
      userId,
      brief: input.brief,
      requirements: result.requirements,
      results: JSON.parse(JSON.stringify({ ...result, requirements: undefined })),
      model: explanation ? "ai" : null,
    },
    select: { id: true },
  });
  return { runId: run.id, ...result };
}

function sanitizeExplanation(c: MatchExplanationOutput["candidates"][number]) {
  const clip = (s: string, n: number) => s.slice(0, n);
  return {
    handle: c.handle,
    fitSummary: clip(c.fitSummary, 600),
    strengths: c.strengths.slice(0, 4).map((s) => clip(s, 200)),
    complementarySkills: c.complementarySkills.slice(0, 6).map((s) => clip(s, 60)),
    gaps: c.gaps.slice(0, 4).map((s) => clip(s, 200)),
    suggestedRole: clip(c.suggestedRole, 60),
  };
}

export async function getMatchRun(userId: string, runId: string) {
  const run = await db.aIMatchRun.findFirst({ where: { id: runId, userId } });
  if (!run) return null;
  const stored = run.results as unknown as Omit<MatchResult, "runId" | "requirements">;
  const requirements = run.requirements as unknown as MatchResult["requirements"];
  // Refresh card data (availability, saved state) but keep only people who are still visible.
  const visible = await getPeopleCards(
    (await db.user.findMany({ where: { AND: [{ id: { in: stored.candidates.map((c) => c.person.id) } }, visibleUserWhere(userId)] }, select: { id: true } })).map((u) => u.id),
    userId,
    requirements.skills.map((sk) => sk.id),
  );
  const fresh = new Map(visible.map((v) => [v.id, v]));
  return {
    runId: run.id,
    brief: run.brief,
    createdAt: run.createdAt,
    ...stored,
    requirements,
    candidates: stored.candidates.filter((c) => fresh.has(c.person.id)).map((c) => ({ ...c, person: fresh.get(c.person.id)! })),
  } satisfies MatchResult & { brief: string; createdAt: Date };
}

export async function listMatchRuns(userId: string) {
  return db.aIMatchRun.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, brief: true, createdAt: true, model: true } });
}
