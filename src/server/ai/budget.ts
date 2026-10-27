import "server-only";
import type { AITool } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { getAIConfig } from "./config";

const DAY_MS = 24 * 3600 * 1000;

export async function getAIUsageToday(userId: string) {
  const since = new Date(Date.now() - DAY_MS);
  const agg = await db.aIUsage.aggregate({
    where: { userId, createdAt: { gte: since } },
    _count: { _all: true },
    _sum: { tokensIn: true, tokensOut: true },
  });
  const config = getAIConfig();
  const tokens = (agg._sum.tokensIn ?? 0) + (agg._sum.tokensOut ?? 0);
  return {
    requests: agg._count._all,
    tokens,
    requestLimit: config.dailyRequestLimit,
    tokenBudget: config.dailyTokenBudget,
    remaining: Math.max(0, config.dailyRequestLimit - agg._count._all),
  };
}

/** Enforces per-minute burst limits and rolling 24h request/token budgets per user. */
export async function assertAIBudget(userId: string) {
  const burst = await consumeRateLimit(`ai:${userId}`, RATE_LIMITS.aiBurst);
  if (!burst.allowed) throw new AppError("RATE_LIMITED", "You're sending requests quickly. Wait a moment and try again.");
  const usage = await getAIUsageToday(userId);
  if (usage.requests >= usage.requestLimit) {
    throw new AppError("AI_BUDGET_EXCEEDED", `You've used today's ${usage.requestLimit} AI Mentor requests. Your allowance refreshes over the next 24 hours.`);
  }
  if (usage.tokens >= usage.tokenBudget) {
    throw new AppError("AI_BUDGET_EXCEEDED", "You've reached today's AI Mentor usage budget. It refreshes over the next 24 hours.");
  }
}

export async function recordAIUsage(entry: {
  userId: string;
  tool: AITool;
  status: "SUCCEEDED" | "FAILED";
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  errorCode?: string;
}) {
  await db.aIUsage.create({
    data: {
      userId: entry.userId,
      tool: entry.tool,
      status: entry.status,
      model: entry.model,
      tokensIn: entry.tokensIn ?? 0,
      tokensOut: entry.tokensOut ?? 0,
      errorCode: entry.errorCode,
    },
  });
}
