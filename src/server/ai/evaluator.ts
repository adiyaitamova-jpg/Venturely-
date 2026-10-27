import "server-only";
import type { z } from "zod";
import { db } from "@/server/db";
import { forbidden, notFound } from "@/server/errors";
import { EVALUATION_DIMENSIONS, evaluationOutputSchema, type EvaluationOutput, type evaluateRequestSchema } from "@/lib/ai-schemas";
import { CATEGORY_LABEL, COMMITMENT_LABEL, MILESTONE_STATUS_LABEL, STAGE_LABEL } from "@/lib/taxonomy";
import { getMembership } from "@/server/services/projects";
import { untrusted } from "./guard";
import { EVALUATE_SYSTEM } from "./prompts";
import { runStructured } from "./run";

/** Builds the evaluation input from a project the user belongs to. No personal names are sent. */
async function projectSnapshot(userId: string, projectId: string) {
  if (!(await getMembership(projectId, userId))) throw forbidden("You can only evaluate projects you're a member of.");
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      skills: { select: { name: true } },
      members: { select: { title: true, role: true, user: { select: { skills: { select: { level: true, skill: { select: { name: true } } } } } } } },
      roles: { where: { isOpen: true }, select: { title: true } },
      milestones: { orderBy: { position: "asc" }, select: { title: true, status: true, evidenceUrl: true } },
    },
  });
  if (!p) throw notFound("That project doesn't exist.");
  const text = [
    `Title: ${p.title}`,
    `Tagline: ${p.tagline}`,
    `Category: ${CATEGORY_LABEL[p.category]} · Stage: ${STAGE_LABEL[p.stage]} · Expected commitment: ${COMMITMENT_LABEL[p.commitment]}`,
    `Description:\n${p.description}`,
    `Goals:\n${p.goals || "(none written)"}`,
    `Outcomes so far:\n${p.outcomes || "(none written)"}`,
    `Links: repository ${p.repoUrl ? "provided" : "not provided"}, demo ${p.demoUrl ? "provided" : "not provided"}`,
    `Skills used: ${p.skills.map((s) => s.name).join(", ") || "none listed"}`,
    `Team (${p.members.length}): ${p.members
      .map((m, i) => `Member ${i + 1} — ${m.title || m.role.toLowerCase()}; skills: ${m.user.skills.map((s) => `${s.skill.name} (${s.level.toLowerCase()})`).slice(0, 6).join(", ") || "not listed"}`)
      .join(" | ")}`,
    `Open roles: ${p.roles.map((r) => r.title).join(", ") || "none"}`,
    `Milestones: ${p.milestones.map((m) => `${m.title} [${MILESTONE_STATUS_LABEL[m.status]}${m.evidenceUrl ? ", has evidence link" : ""}]`).join("; ") || "none"}`,
  ].join("\n\n");
  return { title: p.title, projectId: p.id, text, input: { source: "project", projectId: p.id, stage: p.stage } };
}

export async function evaluateProject(userId: string, req: z.output<typeof evaluateRequestSchema>) {
  const snapshot =
    req.source === "project"
      ? await projectSnapshot(userId, req.projectId)
      : {
          title: req.title,
          projectId: null,
          text: [
            `Title: ${req.title}`,
            `Stage: ${STAGE_LABEL[req.stage]} · Team size: ${req.teamSize}`,
            `Description:\n${req.description}`,
            `Goals:\n${req.goals || "(none written)"}`,
            `Progress and evidence so far:\n${req.progress || "(none described)"}`,
          ].join("\n\n"),
          input: { source: "idea", title: req.title, stage: req.stage, teamSize: req.teamSize, description: req.description, goals: req.goals, progress: req.progress },
        };

  const { data, model } = await runStructured({
    userId,
    tool: "EVALUATOR",
    system: EVALUATE_SYSTEM,
    messages: [{ role: "user", content: `Evaluate this project.\n\n${untrusted("project_submission", snapshot.text, 9000)}` }],
    schema: evaluationOutputSchema,
    maxTokens: 16000,
  });

  const result = normalizeEvaluation(data);
  const saved = await db.aIProjectAssessment.create({
    data: { userId, projectId: snapshot.projectId, title: snapshot.title, input: snapshot.input, result, model },
    select: { id: true },
  });
  return { id: saved.id };
}

/** Ensures exactly one entry per dimension in canonical order and clips runaway text. */
export function normalizeEvaluation(data: EvaluationOutput): EvaluationOutput {
  const clip = (s: string, n: number) => s.slice(0, n);
  const byKey = new Map(data.dimensions.map((d) => [d.key, d]));
  return {
    overallAssessment: clip(data.overallAssessment, 2000),
    dimensions: EVALUATION_DIMENSIONS.map((d) => {
      const found = byKey.get(d.key);
      return found
        ? { key: d.key, rating: found.rating, rationale: clip(found.rationale, 600) }
        : { key: d.key, rating: "not_enough_info" as const, rationale: "The mentor didn't assess this dimension." };
    }),
    strengths: data.strengths.slice(0, 6).map((s) => clip(s, 400)),
    weaknessesAndRisks: data.weaknessesAndRisks.slice(0, 6).map((s) => clip(s, 400)),
    recommendations: data.recommendations.slice(0, 8).map((r) => ({ title: clip(r.title, 120), detail: clip(r.detail, 600), priority: r.priority })),
    missingEvidence: data.missingEvidence.slice(0, 6).map((s) => clip(s, 300)),
    suggestedMilestones: data.suggestedMilestones.slice(0, 6).map((m) => ({ title: clip(m.title, 120), description: clip(m.description, 400), timeframe: clip(m.timeframe, 40) })),
    technicalApproaches: data.technicalApproaches.slice(0, 4).map((t) => ({ name: clip(t.name, 100), description: clip(t.description, 500), tradeoffs: clip(t.tradeoffs, 400) })),
    nextQuestions: data.nextQuestions.slice(0, 6).map((s) => clip(s, 300)),
  };
}

export async function getAssessment(userId: string, id: string) {
  const a = await db.aIProjectAssessment.findFirst({
    where: { id, userId },
    include: { project: { select: { slug: true, title: true } } },
  });
  if (!a) return null;
  return { ...a, result: a.result as unknown as EvaluationOutput };
}

export async function listAssessments(userId: string) {
  return db.aIProjectAssessment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, createdAt: true, project: { select: { slug: true } } },
  });
}
