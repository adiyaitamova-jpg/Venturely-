import { z } from "zod";
import { isoDate, optionalUrl, text } from "./common";
import { categorySchema } from "./profile";

export const portfolioItemSchema = z.object({
  title: text(100, 3),
  description: text(1200, 20),
  kind: z.enum(["PROJECT", "RESEARCH", "OPEN_SOURCE", "DESIGN", "WRITING", "OTHER"]),
  category: categorySchema,
  date: isoDate,
  contribution: text(600),
  outcome: text(600),
  projectUrl: optionalUrl,
  evidenceUrl: optionalUrl,
  mediaUrl: optionalUrl,
  skillIds: z.array(z.string().min(1).max(64)).max(8, "Choose up to 8 skills"),
});
export type PortfolioItemInput = z.input<typeof portfolioItemSchema>;

export const achievementSchema = z.object({
  title: text(120, 3),
  description: text(800),
  type: z.enum(["AWARD", "COMPETITION", "CERTIFICATION", "PUBLICATION", "PROGRAM", "OTHER"]),
  level: z.enum(["SCHOOL", "REGIONAL", "NATIONAL", "INTERNATIONAL"]),
  category: categorySchema,
  issuer: text(100),
  date: isoDate,
  evidenceUrl: optionalUrl,
});
export type AchievementInput = z.input<typeof achievementSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(100),
});
