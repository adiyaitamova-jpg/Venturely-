import { z } from "zod";
import { isoDate, optionalUrl, text } from "./common";
import { categorySchema } from "./profile";

export const stageSchema = z.enum(["IDEA", "PLANNING", "IN_PROGRESS", "PROTOTYPE", "LAUNCHED", "COMPLETED"]);
export const commitmentSchema = z.enum(["LIGHT", "MODERATE", "INTENSIVE"]);

export const projectSchema = z.object({
  title: text(80, 3),
  tagline: text(140, 10),
  description: text(4000, 40),
  goals: text(1500),
  outcomes: text(1500),
  category: categorySchema,
  stage: stageSchema,
  commitment: commitmentSchema,
  visibility: z.enum(["PUBLIC", "MEMBERS"]),
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  skillIds: z.array(z.string().min(1).max(64)).max(12, "Choose up to 12 skills"),
});
export type ProjectInput = z.input<typeof projectSchema>;

/** Fields the AI copilot may propose edits to. Anything else is rejected server-side. */
export const COPILOT_EDITABLE_FIELDS = ["tagline", "description", "goals", "outcomes"] as const;
export type CopilotEditableField = (typeof COPILOT_EDITABLE_FIELDS)[number];

export const projectRoleSchema = z.object({
  title: text(60, 2),
  description: text(500),
  commitment: commitmentSchema,
  skillIds: z.array(z.string().min(1).max(64)).max(6),
});
export type ProjectRoleInput = z.input<typeof projectRoleSchema>;

export const milestoneSchema = z.object({
  title: text(100, 2),
  description: text(600),
  dueDate: isoDate.nullable(),
  assigneeId: z.string().max(64).nullable(),
  evidenceUrl: optionalUrl,
});
export type MilestoneInput = z.input<typeof milestoneSchema>;

export const milestoneStatusSchema = z.enum(["PLANNED", "IN_PROGRESS", "DONE"]);

export const invitationSchema = z.object({
  projectId: z.string().min(1).max(64),
  recipientId: z.string().min(1).max(64),
  roleId: z.string().max(64).nullable(),
  message: text(600, 10),
});
export type InvitationInput = z.input<typeof invitationSchema>;

export const applicationSchema = z.object({
  projectId: z.string().min(1).max(64),
  roleId: z.string().max(64).nullable(),
  message: text(800, 30),
});
export type ApplicationInput = z.input<typeof applicationSchema>;

export const memberUpdateSchema = z.object({
  title: text(60),
  responsibilities: text(400),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const peerFeedbackSchema = z.object({
  projectId: z.string().min(1).max(64),
  subjectId: z.string().min(1).max(64),
  contribution: z.number().int().min(1).max(5),
  reliability: z.number().int().min(1).max(5),
  note: text(400),
});
