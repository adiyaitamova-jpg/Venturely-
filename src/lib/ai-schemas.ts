/**
 * Typed schemas for AI inputs and outputs. Output schemas double as the
 * structured-output contract sent to the model; everything returned is
 * validated against them before it reaches the database or the UI.
 */
import { z } from "zod";
import { text } from "./validation/common";

const CATEGORY = z.enum(["AI", "SOFTWARE", "ROBOTICS", "RESEARCH", "SUSTAINABILITY", "EDUCATION", "ENTREPRENEURSHIP", "DESIGN", "SOCIAL_IMPACT"]);

// ─────────────────────────── Inputs ───────────────────────────

export const matchRequestSchema = z.object({
  brief: text(2000, 20),
  projectId: z.string().max(64).nullable(),
  skillIds: z.array(z.string().min(1).max(64)).max(12),
  roles: z.array(text(50, 2)).max(6),
});
export type MatchRequest = z.input<typeof matchRequestSchema>;

export const evaluateRequestSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("project"), projectId: z.string().min(1).max(64) }),
  z.object({
    source: z.literal("idea"),
    title: text(80, 3),
    description: text(4000, 40),
    goals: text(1500),
    progress: text(1500),
    stage: z.enum(["IDEA", "PLANNING", "IN_PROGRESS", "PROTOTYPE", "LAUNCHED", "COMPLETED"]),
    teamSize: z.number().int().min(1).max(50),
  }),
]);
export type EvaluateRequest = z.input<typeof evaluateRequestSchema>;

export const copilotMessageSchema = z.object({
  conversationId: z.string().min(1).max(64),
  message: text(4000, 1),
});

// ─────────────────────────── Outputs ───────────────────────────

export const requirementsOutputSchema = z.object({
  summary: z.string().describe("One or two sentences restating what the project needs."),
  requiredSkills: z.array(z.string()).describe("Skill names chosen ONLY from the provided taxonomy list, most important first. At most 10."),
  roles: z
    .array(z.object({ title: z.string(), skills: z.array(z.string()).describe("Taxonomy skill names for this role.") }))
    .describe("Distinct team roles the project needs. At most 5."),
  categories: z.array(CATEGORY).describe("Most relevant project categories. At most 3."),
  missingFromBrief: z.array(z.string()).describe("Important information the brief does not specify. At most 4."),
});
export type RequirementsOutput = z.output<typeof requirementsOutputSchema>;

export const matchExplanationOutputSchema = z.object({
  candidates: z.array(
    z.object({
      handle: z.string().describe("The candidate handle exactly as given, e.g. C3."),
      fitSummary: z.string().describe("Two sentences on why this person fits, citing only facts from their profile."),
      strengths: z.array(z.string()).describe("2-3 concrete strengths relevant to this project."),
      complementarySkills: z.array(z.string()).describe("Skills they add that the requester or other candidates lack."),
      gaps: z.array(z.string()).describe("Honest gaps or risks for this role. May be empty."),
      suggestedRole: z.string().describe("The role from the requirements they'd best fill."),
    }),
  ),
  team: z.object({
    summary: z.string().describe("How a small team from these candidates would cover the project."),
    picks: z.array(z.object({ role: z.string(), handle: z.string().nullable().describe("Candidate handle, or null if nobody fits.") })),
  }),
  uncoveredNeeds: z.array(z.string()).describe("Roles or skills none of the candidates cover."),
});
export type MatchExplanationOutput = z.output<typeof matchExplanationOutputSchema>;

export const EVALUATION_DIMENSIONS = [
  { key: "problem_clarity", label: "Problem clarity" },
  { key: "originality", label: "Originality & differentiation" },
  { key: "feasibility", label: "Feasibility" },
  { key: "technical_depth", label: "Technical depth" },
  { key: "impact", label: "Potential impact" },
  { key: "execution_plan", label: "Execution plan" },
  { key: "evidence_of_progress", label: "Evidence of progress" },
  { key: "measurable_outcomes", label: "Measurable outcomes" },
  { key: "team_capability", label: "Team capability" },
  { key: "presentation", label: "Presentation quality" },
] as const;

const DIMENSION_KEY = z.enum(EVALUATION_DIMENSIONS.map((d) => d.key) as [string, ...string[]]);
export const RATINGS = ["strong", "solid", "developing", "needs_work", "not_enough_info"] as const;
export const RATING_LABEL: Record<(typeof RATINGS)[number], string> = {
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  needs_work: "Needs work",
  not_enough_info: "Not enough info",
};

export const evaluationOutputSchema = z.object({
  overallAssessment: z.string().describe("3-5 sentences: the honest big picture, written to the team."),
  dimensions: z.array(
    z.object({
      key: DIMENSION_KEY,
      rating: z.enum(RATINGS),
      rationale: z.string().describe("1-2 sentences grounded in the submitted material."),
    }),
  ),
  strengths: z.array(z.string()),
  weaknessesAndRisks: z.array(z.string()),
  recommendations: z.array(
    z.object({ title: z.string(), detail: z.string(), priority: z.enum(["high", "medium", "low"]) }),
  ),
  missingEvidence: z.array(z.string()).describe("Validation or evidence the team should gather."),
  suggestedMilestones: z.array(z.object({ title: z.string(), description: z.string(), timeframe: z.string().describe("e.g. 'Weeks 1-2'") })),
  technicalApproaches: z.array(z.object({ name: z.string(), description: z.string(), tradeoffs: z.string() })),
  nextQuestions: z.array(z.string()),
});
export type EvaluationOutput = z.output<typeof evaluationOutputSchema>;

export const copilotOutputSchema = z.object({
  reply: z.string().describe("Your answer in concise Markdown."),
  proposedEdits: z
    .array(
      z.object({
        field: z.enum(["tagline", "description", "goals", "outcomes"]),
        value: z.string().describe("The complete new text for this field."),
        rationale: z.string().describe("One sentence on why this is better."),
      }),
    )
    .describe("Only when the user asked for help rewriting project text and edits are allowed. Otherwise an empty array."),
});
export type CopilotOutput = z.output<typeof copilotOutputSchema>;

/** Field limits mirrored from projectSchema; proposals are re-validated before applying. */
export const COPILOT_FIELD_LIMITS = { tagline: [10, 140], description: [40, 4000], goals: [0, 1500], outcomes: [0, 1500] } as const;
