/**
 * Deterministic teammate scoring used by the AI Teammate Matcher. The AI never
 * picks candidates; it only explains the ones selected here.
 */
import type { Availability, ExperienceLevel, ProjectCategory, SkillLevel } from "@prisma/client";
import { SKILL_LEVEL_RANK } from "./taxonomy";

export type MatchCandidate = {
  id: string;
  skills: { skillId: string; level: SkillLevel }[];
  availability: Availability;
  experienceLevel: ExperienceLevel;
  preferredCategories: ProjectCategory[];
  preferredRoles: string[];
  globalRank: number | null;
};

export type MatchNeeds = {
  skillIds: string[]; // ordered by importance
  roleTitles: string[];
  categories: ProjectCategory[];
  /** Skills the requester already has — complementary candidates score higher. */
  requesterSkillIds: string[];
};

export type ScoredCandidate = {
  id: string;
  score: number;
  matchedSkillIds: string[];
  complementarySkillIds: string[];
  roleMatches: string[];
};

const AVAILABILITY_POINTS: Record<Availability, number> = { COMMITTED: 3, PART_TIME: 2, FEW_HOURS: 0.5, NOT_AVAILABLE: -100 };
const EXPERIENCE_POINTS: Record<ExperienceLevel, number> = { ADVANCED: 1.5, INTERMEDIATE: 1, BEGINNER: 0.5 };

function normaliseRole(r: string) {
  return r.toLowerCase().replace(/[^a-z]+/g, " ").trim();
}

export function scoreCandidate(c: MatchCandidate, needs: MatchNeeds): ScoredCandidate {
  const levelBySkill = new Map(c.skills.map((s) => [s.skillId, s.level]));
  const requesterSkills = new Set(needs.requesterSkillIds);
  let score = 0;
  const matched: string[] = [];
  const complementary: string[] = [];
  needs.skillIds.forEach((skillId, index) => {
    const level = levelBySkill.get(skillId);
    if (!level) return;
    // Earlier (more important) skills weigh more; proficiency multiplies.
    const importance = Math.max(1, 3 - index * 0.25);
    score += importance * (1 + SKILL_LEVEL_RANK[level] * 0.75);
    matched.push(skillId);
    if (!requesterSkills.has(skillId)) {
      complementary.push(skillId);
      score += 1.5;
    }
  });
  const roleMatches = needs.roleTitles.filter((role) =>
    c.preferredRoles.some((p) => {
      const a = normaliseRole(p);
      const b = normaliseRole(role);
      return a === b || a.includes(b) || b.includes(a);
    }),
  );
  score += roleMatches.length * 3;
  score += c.preferredCategories.filter((cat) => needs.categories.includes(cat)).length * 1.5;
  score += AVAILABILITY_POINTS[c.availability];
  score += EXPERIENCE_POINTS[c.experienceLevel];
  // Small tie-breaker for evidence-backed track records; never dominates skill fit.
  if (c.globalRank !== null) score += Math.max(0, 2 - Math.log10(c.globalRank));
  return { id: c.id, score: Math.round(score * 10) / 10, matchedSkillIds: matched, complementarySkillIds: complementary, roleMatches };
}

/** Ranks candidates, dropping unavailable people and anyone with no relevant signal. */
export function rankCandidates(candidates: MatchCandidate[], needs: MatchNeeds, limit: number): ScoredCandidate[] {
  return candidates
    .filter((c) => c.availability !== "NOT_AVAILABLE")
    .map((c) => scoreCandidate(c, needs))
    .filter((s) => s.matchedSkillIds.length > 0 || s.roleMatches.length > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** Greedy set cover: which of the needed skills the shortlisted team covers. */
export function coverage(needs: string[], picked: ScoredCandidate[]): { covered: string[]; missing: string[] } {
  const covered = new Set(picked.flatMap((p) => p.matchedSkillIds));
  return { covered: needs.filter((s) => covered.has(s)), missing: needs.filter((s) => !covered.has(s)) };
}
