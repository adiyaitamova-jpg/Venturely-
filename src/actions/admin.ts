"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction, parseInput } from "@/server/action";
import { forbidden } from "@/server/errors";
import * as moderation from "@/server/services/moderation";
import { recomputeRankings } from "@/server/services/rankings";
import { text } from "@/lib/validation/common";

const id = z.string().min(1).max(64);

export async function reviewAchievementAction(achievementId: unknown, approve: unknown, note: unknown) {
  return authedAction(async (user) => {
    await moderation.reviewAchievement(user.id, parseInput(id, achievementId), parseInput(z.boolean(), approve), parseInput(text(500), note ?? ""));
    revalidatePath("/admin");
    return null;
  });
}

export async function resolveReportAction(reportId: unknown, action: unknown, note: unknown) {
  return authedAction(async (user) => {
    await moderation.resolveReport(user.id, parseInput(id, reportId), parseInput(z.enum(["dismiss", "actioned"]), action), parseInput(text(500), note ?? ""));
    revalidatePath("/admin");
    return null;
  });
}

export async function setSuspendedAction(userId: unknown, suspended: unknown) {
  return authedAction(async (user) => {
    await moderation.setSuspended(user.id, parseInput(id, userId), parseInput(z.boolean(), suspended));
    revalidatePath("/admin");
    return null;
  });
}

export async function recomputeRankingsAction() {
  return authedAction(async (user) => {
    if (user.role !== "ADMIN") throw forbidden("Moderator access required.");
    const r = await recomputeRankings();
    revalidatePath("/leaderboard");
    return { entries: r?.entries ?? 0, skipped: !r };
  });
}
