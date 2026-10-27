"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction, parseInput } from "@/server/action";
import * as portfolio from "@/server/services/portfolio";
import { achievementSchema, portfolioItemSchema, reorderSchema } from "@/lib/validation/portfolio";

const id = z.string().min(1).max(64);

function refresh(username: string) {
  revalidatePath("/settings/portfolio");
  revalidatePath(`/u/${username}`);
}

export async function savePortfolioItemAction(itemId: unknown, values: unknown) {
  return authedAction(async (user) => {
    const data = parseInput(portfolioItemSchema, values);
    if (itemId) await portfolio.updatePortfolioItem(user.id, parseInput(id, itemId), data);
    else await portfolio.createPortfolioItem(user.id, data);
    refresh(user.username);
    return null;
  });
}

export async function deletePortfolioItemAction(itemId: unknown) {
  return authedAction(async (user) => {
    await portfolio.deletePortfolioItem(user.id, parseInput(id, itemId));
    refresh(user.username);
    return null;
  });
}

export async function reorderPortfolioAction(values: unknown) {
  return authedAction(async (user) => {
    await portfolio.reorderPortfolio(user.id, parseInput(reorderSchema, values).ids);
    refresh(user.username);
    return null;
  });
}

export async function saveAchievementAction(achievementId: unknown, values: unknown) {
  return authedAction(async (user) => {
    const data = parseInput(achievementSchema, values);
    let verificationReset = false;
    if (achievementId) ({ verificationReset } = await portfolio.updateAchievement(user.id, parseInput(id, achievementId), data));
    else await portfolio.createAchievement(user.id, data);
    refresh(user.username);
    return { verificationReset };
  });
}

export async function deleteAchievementAction(achievementId: unknown) {
  return authedAction(async (user) => {
    await portfolio.deleteAchievement(user.id, parseInput(id, achievementId));
    refresh(user.username);
    return null;
  });
}

export async function reorderAchievementsAction(values: unknown) {
  return authedAction(async (user) => {
    await portfolio.reorderAchievements(user.id, parseInput(reorderSchema, values).ids);
    refresh(user.username);
    return null;
  });
}

export async function requestVerificationAction(achievementId: unknown) {
  return authedAction(async (user) => {
    await portfolio.requestVerification(user.id, parseInput(id, achievementId));
    refresh(user.username);
    return null;
  });
}
