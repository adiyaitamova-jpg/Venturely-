import { z } from "zod";
import { optionalUrl, tagList, text } from "./common";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "dashboard",
  "discover",
  "help",
  "leaderboard",
  "mentor",
  "moderator",
  "new",
  "projects",
  "settings",
  "support",
  "venturely",
  "me",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(24, "Use at most 24 characters")
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, "Use letters, numbers, - or _ (not at the start or end)")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved");

const category = z.enum([
  "AI",
  "SOFTWARE",
  "ROBOTICS",
  "RESEARCH",
  "SUSTAINABILITY",
  "EDUCATION",
  "ENTREPRENEURSHIP",
  "DESIGN",
  "SOCIAL_IMPACT",
]);
export const categorySchema = category;

export const skillLevelSchema = z.enum(["LEARNING", "PRACTICED", "PROFICIENT", "EXPERT"]);
export const availabilitySchema = z.enum(["NOT_AVAILABLE", "FEW_HOURS", "PART_TIME", "COMMITTED"]);
export const experienceSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export const visibilitySchema = z.enum(["PUBLIC", "MEMBERS", "PRIVATE"]);
export const regionSchema = z.enum([
  "AFRICA",
  "ASIA",
  "EUROPE",
  "MIDDLE_EAST",
  "NORTH_AMERICA",
  "OCEANIA",
  "SOUTH_AMERICA",
]);

export const userSkillsSchema = z
  .array(z.object({ skillId: z.string().min(1).max(64), level: skillLevelSchema }))
  .max(20, "Choose up to 20 skills")
  .refine((items) => new Set(items.map((i) => i.skillId)).size === items.length, "Each skill can only be added once");

// Onboarding steps. Each step is independently saveable.
export const basicsStepSchema = z.object({
  displayName: text(60, 2),
  username: usernameSchema,
  headline: text(90),
  avatarHue: z.number().int().min(0).max(359),
});

export const aboutStepSchema = z.object({
  bio: text(600),
  intendedMajor: text(80),
  academicInterests: tagList(8),
  languages: tagList(8),
  region: regionSchema.nullable(),
});

export const skillsStepSchema = z.object({
  skills: userSkillsSchema,
  experienceLevel: experienceSchema,
});

export const interestsStepSchema = z.object({
  preferredCategories: z.array(category).max(9),
  causes: tagList(10),
  preferredRoles: tagList(6, 50),
});

export const availabilityStepSchema = z.object({
  availability: availabilitySchema,
  projectIdeas: text(1000),
  websiteUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  visibility: visibilitySchema,
});

export const ONBOARDING_STEPS = [
  { key: "basics", title: "The basics", schema: basicsStepSchema },
  { key: "about", title: "About you", schema: aboutStepSchema },
  { key: "skills", title: "Skills", schema: skillsStepSchema },
  { key: "interests", title: "Interests", schema: interestsStepSchema },
  { key: "availability", title: "Availability & links", schema: availabilityStepSchema },
] as const;

/** Full profile edit = all steps merged. */
export const profileUpdateSchema = basicsStepSchema
  .extend(aboutStepSchema.shape)
  .extend(skillsStepSchema.shape)
  .extend(interestsStepSchema.shape)
  .extend(availabilityStepSchema.shape);
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
