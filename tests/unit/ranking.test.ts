import { describe, expect, it } from "vitest";
import { RANKING_CONFIG, assignRanks, computeScores, type RankingInput } from "@/lib/ranking/formula";

const NOW = new Date("2026-10-01T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000);

function base(): RankingInput {
  return {
    asOf: NOW,
    users: [
      { id: "a", createdAt: daysAgo(200), skillIds: ["py", "ml"] },
      { id: "b", createdAt: daysAgo(200), skillIds: ["py"] },
      { id: "c", createdAt: daysAgo(200), skillIds: [] },
    ],
    skillCategories: { py: "ENGINEERING", ml: "AI_DATA" },
    achievements: [],
    projects: [],
    memberships: [],
    milestones: [],
    portfolio: [],
    feedback: [],
  };
}
const score = (input: RankingInput, user: string, cat = "GLOBAL") => computeScores(input).find((s) => s.userId === user && s.category === cat);

describe("ranking formula", () => {
  it("gives nothing for declared skills, projects at idea stage or no evidence", () => {
    const input = base();
    input.projects.push({ id: "p", category: "AI", stage: "IDEA", outcomes: "", repoUrl: null, demoUrl: null, createdAt: daysAgo(100), skillIds: ["py"] });
    input.memberships.push({ userId: "a", projectId: "p", role: "OWNER", responsibilities: "", joinedAt: daysAgo(100) });
    expect(score(input, "a")).toBeUndefined();
  });

  it("weights verified achievements fully and caps self-reported ones", () => {
    const input = base();
    input.achievements.push({ userId: "a", level: "NATIONAL", category: "AI", status: "VERIFIED", createdAt: daysAgo(30), verifiedAt: daysAgo(20) });
    for (let i = 0; i < 20; i++) {
      input.achievements.push({ userId: "b", level: "INTERNATIONAL", category: "AI", status: "SELF_REPORTED", createdAt: daysAgo(30), verifiedAt: null });
    }
    expect(score(input, "a")!.breakdown.achievementsVerified).toBe(30);
    expect(score(input, "b")!.breakdown.achievementsUnverified).toBe(RANKING_CONFIG.achievements.unverifiedCap);
    expect(score(input, "b")!.provisional).toBe(true);
    expect(score(input, "a")!.provisional).toBe(false);
  });

  it("ignores rejected achievements and verification that happens after asOf", () => {
    const input = base();
    input.achievements.push({ userId: "a", level: "NATIONAL", category: "AI", status: "REJECTED", createdAt: daysAgo(30), verifiedAt: null });
    input.achievements.push({ userId: "b", level: "NATIONAL", category: "AI", status: "VERIFIED", createdAt: daysAgo(30), verifiedAt: daysAgo(-5) });
    expect(score(input, "a")).toBeUndefined();
    // Not yet verified at asOf → counts only as unverified.
    expect(score(input, "b")!.breakdown.achievementsVerified).toBe(0);
    expect(score(input, "b")!.breakdown.achievementsUnverified).toBeGreaterThan(0);
  });

  it("only scores launched projects fully when outcomes and links are documented", () => {
    const input = base();
    const outcomes = "x".repeat(RANKING_CONFIG.projects.minOutcomeChars);
    input.projects.push(
      { id: "good", category: "SOFTWARE", stage: "LAUNCHED", outcomes, repoUrl: "https://x", demoUrl: null, createdAt: daysAgo(100), skillIds: [] },
      { id: "bare", category: "SOFTWARE", stage: "LAUNCHED", outcomes: "", repoUrl: null, demoUrl: null, createdAt: daysAgo(100), skillIds: [] },
    );
    input.memberships.push(
      { userId: "a", projectId: "good", role: "OWNER", responsibilities: "", joinedAt: daysAgo(100) },
      { userId: "b", projectId: "bare", role: "OWNER", responsibilities: "", joinedAt: daysAgo(100) },
    );
    expect(score(input, "a")!.breakdown.projects).toBe(RANKING_CONFIG.projects.stagePoints.LAUNCHED);
    expect(score(input, "b")!.breakdown.projects).toBe(RANKING_CONFIG.projects.stagePoints.PROTOTYPE);
  });

  it("does not reward creating many projects (top-N with decay) or brand-new ones", () => {
    const input = base();
    for (let i = 0; i < 30; i++) {
      input.projects.push({ id: `p${i}`, category: "SOFTWARE", stage: "PROTOTYPE", outcomes: "", repoUrl: null, demoUrl: null, createdAt: daysAgo(i < 25 ? 60 : 1), skillIds: [] });
      input.memberships.push({ userId: "a", projectId: `p${i}`, role: "OWNER", responsibilities: "", joinedAt: daysAgo(i < 25 ? 60 : 1) });
    }
    const p = RANKING_CONFIG.projects;
    const expected = [0, 1, 2, 3, 4].reduce((s, i) => s + p.stagePoints.PROTOTYPE * Math.pow(p.decay, i), 0);
    expect(score(input, "a")!.breakdown.projects).toBeCloseTo(expected, 1);
  });

  it("counts at most N completed milestones per project", () => {
    const input = base();
    input.projects.push({ id: "p", category: "AI", stage: "IN_PROGRESS", outcomes: "", repoUrl: null, demoUrl: null, createdAt: daysAgo(60), skillIds: [] });
    input.memberships.push({ userId: "a", projectId: "p", role: "MEMBER", responsibilities: "x", joinedAt: daysAgo(60) });
    for (let i = 0; i < 20; i++) input.milestones.push({ projectId: "p", assigneeId: "a", status: "DONE", completedAt: daysAgo(5), evidenceUrl: null });
    const c = RANKING_CONFIG.contributions;
    const expected = [0, 1, 2, 3].reduce((s, i) => s + c.perMilestone * Math.pow(c.decay, i), 0);
    expect(score(input, "a")!.breakdown.contributions).toBeCloseTo(expected, 1);
  });

  it("ignores milestones of people no longer on the team", () => {
    const input = base();
    input.projects.push({ id: "p", category: "AI", stage: "IN_PROGRESS", outcomes: "", repoUrl: null, demoUrl: null, createdAt: daysAgo(60), skillIds: [] });
    input.milestones.push({ projectId: "p", assigneeId: "a", status: "DONE", completedAt: daysAgo(5), evidenceUrl: "https://e" });
    expect(score(input, "a")).toBeUndefined();
  });

  it("only counts declared skills that are evidenced", () => {
    const input = base();
    input.portfolio.push({ userId: "a", category: "AI", projectUrl: "https://x", evidenceUrl: null, createdAt: daysAgo(10), skillIds: ["py", "ml", "unknown"] });
    input.portfolio.push({ userId: "b", category: "AI", projectUrl: null, evidenceUrl: null, createdAt: daysAgo(10), skillIds: ["py"] });
    expect(score(input, "a")!.breakdown.skills).toBe(2 * RANKING_CONFIG.skills.perSkill);
    expect(score(input, "b")).toBeUndefined();
    expect(score(input, "a", "AI")!.breakdown.skills).toBe(RANKING_CONFIG.skills.perSkill);
  });

  describe("peer feedback safeguards", () => {
    function withTeam() {
      const input = base();
      input.projects.push(
        { id: "p1", category: "AI", stage: "IN_PROGRESS", outcomes: "", repoUrl: null, demoUrl: null, createdAt: daysAgo(90), skillIds: [] },
        { id: "p2", category: "AI", stage: "IN_PROGRESS", outcomes: "", repoUrl: null, demoUrl: null, createdAt: daysAgo(90), skillIds: [] },
      );
      for (const u of ["a", "b", "c"]) for (const p of ["p1", "p2"]) input.memberships.push({ userId: u, projectId: p, role: "MEMBER", responsibilities: "", joinedAt: daysAgo(90) });
      return input;
    }

    it("requires both people to be on the project", () => {
      const input = withTeam();
      input.memberships = input.memberships.filter((m) => !(m.userId === "b" && m.projectId === "p1"));
      input.feedback.push({ projectId: "p1", authorId: "b", subjectId: "a", contribution: 5, reliability: 5, createdAt: daysAgo(5) });
      expect(score(input, "a")!.breakdown.feedback).toBe(0);
    });

    it("rejects feedback from very new accounts", () => {
      const input = withTeam();
      input.users.find((u) => u.id === "b")!.createdAt = daysAgo(3);
      input.feedback.push({ projectId: "p1", authorId: "b", subjectId: "a", contribution: 5, reliability: 5, createdAt: daysAgo(1) });
      expect(score(input, "a")!.breakdown.feedback).toBe(0);
    });

    it("counts one feedback per author→subject pair even across projects, halved with a single author", () => {
      const input = withTeam();
      input.feedback.push(
        { projectId: "p1", authorId: "b", subjectId: "a", contribution: 5, reliability: 5, createdAt: daysAgo(5) },
        { projectId: "p2", authorId: "b", subjectId: "a", contribution: 5, reliability: 5, createdAt: daysAgo(4) },
      );
      const max = RANKING_CONFIG.feedback.maxPerFeedback;
      expect(score(input, "a")!.breakdown.feedback).toBe(max * RANKING_CONFIG.feedback.fewAuthorsFactor);
    });

    it("halves mutual perfect ratings", () => {
      const input = withTeam();
      input.feedback.push(
        { projectId: "p1", authorId: "b", subjectId: "a", contribution: 5, reliability: 5, createdAt: daysAgo(5) },
        { projectId: "p1", authorId: "a", subjectId: "b", contribution: 5, reliability: 5, createdAt: daysAgo(5) },
        { projectId: "p1", authorId: "c", subjectId: "a", contribution: 5, reliability: 5, createdAt: daysAgo(5) },
      );
      const max = RANKING_CONFIG.feedback.maxPerFeedback;
      // b→a is mutual-perfect (×0.5); c→a is not; a has 2 distinct authors (no few-authors penalty).
      expect(score(input, "a")!.breakdown.feedback).toBe(max * 0.5 + max);
    });
  });

  it("assigns competition ranks with ties", () => {
    const ranked = assignRanks([
      { userId: "x", category: "GLOBAL", score: 10, verifiedPoints: 5, breakdown: {} as never, provisional: false },
      { userId: "y", category: "GLOBAL", score: 10, verifiedPoints: 5, breakdown: {} as never, provisional: false },
      { userId: "z", category: "GLOBAL", score: 8, verifiedPoints: 0, breakdown: {} as never, provisional: false },
      { userId: "w", category: "GLOBAL", score: 10, verifiedPoints: 9, breakdown: {} as never, provisional: false },
    ]);
    const r = Object.fromEntries(ranked.map((x) => [x.userId, x.rank]));
    expect(r).toEqual({ w: 1, x: 2, y: 2, z: 4 });
  });

  it("is deterministic as-of a past date", () => {
    const input = base();
    input.achievements.push({ userId: "a", level: "REGIONAL", category: "AI", status: "VERIFIED", createdAt: daysAgo(10), verifiedAt: daysAgo(9) });
    expect(score({ ...input, asOf: daysAgo(20) }, "a")).toBeUndefined();
    expect(score(input, "a")!.score).toBe(16);
  });
});
