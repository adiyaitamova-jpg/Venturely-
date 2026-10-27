"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction, parseInput } from "@/server/action";
import { enforceRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import * as social from "@/server/services/social";
import * as notifications from "@/server/services/notifications";
import { text } from "@/lib/validation/common";

const idSchema = z.string().min(1).max(64);

export async function saveProfileAction(targetId: unknown, note?: unknown) {
  return authedAction(async (user) => {
    const id = parseInput(idSchema, targetId);
    const n = parseInput(text(500).optional(), note) ?? "";
    await social.saveProfile(user.id, id, n ? "AI_MATCH" : "MANUAL", n);
    revalidatePath("/saved");
    return null;
  });
}

export async function unsaveProfileAction(targetId: unknown) {
  return authedAction(async (user) => {
    await social.unsaveProfile(user.id, parseInput(idSchema, targetId));
    revalidatePath("/saved");
    return null;
  });
}

export async function blockUserAction(targetId: unknown) {
  return authedAction(async (user) => {
    await social.blockUser(user.id, parseInput(idSchema, targetId));
    revalidatePath("/", "layout");
    return null;
  });
}

export async function unblockUserAction(targetId: unknown) {
  return authedAction(async (user) => {
    await social.unblockUser(user.id, parseInput(idSchema, targetId));
    revalidatePath("/settings/account");
    return null;
  });
}

const reportSchema = z.object({
  targetType: z.enum(["USER", "PROJECT", "PORTFOLIO_ITEM", "ACHIEVEMENT"]),
  targetId: idSchema,
  reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "IMPERSONATION", "FALSE_CLAIM", "SAFETY_CONCERN", "OTHER"]),
  details: text(1000),
});

export async function reportAction(input: unknown) {
  return authedAction(async (user) => {
    const data = parseInput(reportSchema, input);
    await enforceRateLimit(`report:${user.id}`, RATE_LIMITS.report, "You've sent several reports today. Our team will review them shortly.");
    return social.fileReport(user.id, data);
  });
}

export async function markAllNotificationsReadAction() {
  return authedAction(async (user) => {
    await notifications.markAllRead(user.id);
    revalidatePath("/", "layout");
    return null;
  });
}
