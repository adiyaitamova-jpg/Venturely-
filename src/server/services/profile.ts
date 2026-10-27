import "server-only";
import type { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, conflict, invalid } from "@/server/errors";
import {
  ONBOARDING_STEPS,
  aboutStepSchema,
  availabilityStepSchema,
  basicsStepSchema,
  interestsStepSchema,
  profileUpdateSchema,
  skillsStepSchema,
} from "@/lib/validation/profile";

export async function listSkills() {
  return db.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, category: true } });
}

export async function getEditableProfile(userId: string) {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: {
      username: true,
      displayName: true,
      headline: true,
      bio: true,
      intendedMajor: true,
      academicInterests: true,
      causes: true,
      languages: true,
      preferredCategories: true,
      preferredRoles: true,
      projectIdeas: true,
      availability: true,
      experienceLevel: true,
      region: true,
      visibility: true,
      websiteUrl: true,
      githubUrl: true,
      linkedinUrl: true,
      avatarHue: true,
      avatarMime: true,
      avatarUpdatedAt: true,
      onboardingStep: true,
      onboardedAt: true,
      user: { select: { skills: { select: { skillId: true, level: true }, orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!profile) throw new AppError("NOT_FOUND", "Profile not found.");
  const { user, ...rest } = profile;
  return { ...rest, skills: user.skills, hasAvatar: Boolean(rest.avatarMime) };
}

async function assertSkillIds(ids: string[]) {
  if (ids.length === 0) return;
  const found = await db.skill.count({ where: { id: { in: ids } } });
  if (found !== new Set(ids).size) throw invalid("One or more selected skills no longer exist.");
}

async function writeUsername(userId: string, username: string) {
  const taken = await db.profile.findFirst({ where: { username, userId: { not: userId } }, select: { userId: true } });
  if (taken) throw conflict("That username is taken.");
}

function handleUniqueError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new AppError("CONFLICT", "That username is taken.", { username: ["That username is taken"] });
  }
  throw err;
}

type StepData =
  | { step: 0; data: z.output<typeof basicsStepSchema> }
  | { step: 1; data: z.output<typeof aboutStepSchema> }
  | { step: 2; data: z.output<typeof skillsStepSchema> }
  | { step: 3; data: z.output<typeof interestsStepSchema> }
  | { step: 4; data: z.output<typeof availabilityStepSchema> };

/** Saves one onboarding step; progress is stored so users can resume later. */
export async function saveOnboardingStep(userId: string, input: StepData) {
  const current = await db.profile.findUniqueOrThrow({ where: { userId }, select: { onboardingStep: true, onboardedAt: true } });
  const nextStep = Math.max(current.onboardingStep, input.step + 1);
  const isLast = input.step === ONBOARDING_STEPS.length - 1;
  const progress = { onboardingStep: nextStep, ...(isLast && !current.onboardedAt ? { onboardedAt: new Date() } : {}) };

  try {
    switch (input.step) {
      case 0:
        await writeUsername(userId, input.data.username);
        await db.profile.update({ where: { userId }, data: { ...input.data, ...progress } });
        break;
      case 1:
      case 3:
      case 4:
        await db.profile.update({ where: { userId }, data: { ...input.data, ...progress } });
        break;
      case 2: {
        await assertSkillIds(input.data.skills.map((s) => s.skillId));
        await db.$transaction([
          db.userSkill.deleteMany({ where: { userId } }),
          db.userSkill.createMany({ data: input.data.skills.map((s) => ({ userId, skillId: s.skillId, level: s.level })) }),
          db.profile.update({ where: { userId }, data: { experienceLevel: input.data.experienceLevel, ...progress } }),
        ]);
        break;
      }
    }
  } catch (err) {
    handleUniqueError(err);
  }
  return { onboardingStep: nextStep, finished: isLast || Boolean(current.onboardedAt) };
}

/** Full profile edit from settings. Always scoped to the caller's own userId. */
export async function updateProfile(userId: string, data: z.output<typeof profileUpdateSchema>) {
  await writeUsername(userId, data.username);
  await assertSkillIds(data.skills.map((s) => s.skillId));
  const { skills, ...profile } = data;
  try {
    await db.$transaction([
      db.profile.update({ where: { userId }, data: profile }),
      db.userSkill.deleteMany({ where: { userId } }),
      db.userSkill.createMany({ data: skills.map((s) => ({ userId, skillId: s.skillId, level: s.level })) }),
    ]);
  } catch (err) {
    handleUniqueError(err);
  }
}

export async function setVisibility(userId: string, visibility: "PUBLIC" | "MEMBERS" | "PRIVATE") {
  await db.profile.update({ where: { userId }, data: { visibility } });
}

// ─────────────────────────── Avatars ───────────────────────────

export const AVATAR_MAX_BYTES = 512 * 1024;

/** Detects the real image type from magic bytes; the client-declared type is ignored. */
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function setAvatar(userId: string, bytes: Uint8Array) {
  if (bytes.byteLength === 0) throw invalid("Choose an image to upload.");
  if (bytes.byteLength > AVATAR_MAX_BYTES) throw invalid("Images must be 512 KB or smaller.");
  const mime = sniffImageType(bytes);
  if (!mime) throw invalid("Upload a PNG, JPEG or WebP image.");
  await db.profile.update({
    where: { userId },
    data: { avatarData: Buffer.from(bytes), avatarMime: mime, avatarUpdatedAt: new Date() },
  });
}

export async function removeAvatar(userId: string) {
  await db.profile.update({ where: { userId }, data: { avatarData: null, avatarMime: null, avatarUpdatedAt: new Date() } });
}
