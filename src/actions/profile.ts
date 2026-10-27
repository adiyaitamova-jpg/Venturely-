"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction, parseInput } from "@/server/action";
import { invalid } from "@/server/errors";
import { enforceRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import * as profiles from "@/server/services/profile";
import {
  aboutStepSchema,
  availabilityStepSchema,
  basicsStepSchema,
  interestsStepSchema,
  profileUpdateSchema,
  skillsStepSchema,
  visibilitySchema,
} from "@/lib/validation/profile";

const stepSchemas = [basicsStepSchema, aboutStepSchema, skillsStepSchema, interestsStepSchema, availabilityStepSchema] as const;

export async function saveOnboardingStepAction(step: number, values: unknown) {
  return authedAction(async (user) => {
    const index = parseInput(z.number().int().min(0).max(stepSchemas.length - 1), step) as 0 | 1 | 2 | 3 | 4;
    const data = parseInput(stepSchemas[index] as z.ZodType, values);
    const result = await profiles.saveOnboardingStep(user.id, { step: index, data } as Parameters<typeof profiles.saveOnboardingStep>[1]);
    revalidatePath("/", "layout");
    return result;
  });
}

export async function updateProfileAction(values: unknown) {
  return authedAction(async (user) => {
    const data = parseInput(profileUpdateSchema, values);
    await profiles.updateProfile(user.id, data);
    revalidatePath("/", "layout");
    return { username: data.username };
  });
}

export async function setVisibilityAction(value: unknown) {
  return authedAction(async (user) => {
    await profiles.setVisibility(user.id, parseInput(visibilitySchema, value));
    revalidatePath("/", "layout");
    return null;
  });
}

export async function uploadAvatarAction(formData: FormData) {
  return authedAction(async (user) => {
    await enforceRateLimit(`avatar:${user.id}`, RATE_LIMITS.avatarUpload);
    const file = formData.get("avatar");
    if (!(file instanceof File)) throw invalid("Choose an image to upload.");
    if (file.size > profiles.AVATAR_MAX_BYTES) throw invalid("Images must be 512 KB or smaller.");
    await profiles.setAvatar(user.id, new Uint8Array(await file.arrayBuffer()));
    revalidatePath("/", "layout");
    return null;
  });
}

export async function removeAvatarAction() {
  return authedAction(async (user) => {
    await profiles.removeAvatar(user.id);
    revalidatePath("/", "layout");
    return null;
  });
}
