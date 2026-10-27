import "server-only";
import type { AITool } from "@prisma/client";
import type { z } from "zod";
import { AppError } from "@/server/errors";
import { getAIConfig } from "./config";
import { getAIProvider } from "./provider";
import { assertAIBudget, recordAIUsage } from "./budget";
import { AIProviderError, type AIMessage, type StructuredResult } from "./types";

export const AI_NOT_CONFIGURED_MESSAGE =
  "The AI Mentor isn't configured on this server yet. An administrator needs to set ANTHROPIC_API_KEY (see README → AI configuration).";

/**
 * The single entry point for model calls: configuration check → budget →
 * provider call with timeout → usage ledger. Never reports success on failure.
 */
export async function runStructured<S extends z.ZodType>(opts: {
  userId: string;
  tool: AITool;
  system: string;
  messages: AIMessage[];
  schema: S;
  maxTokens?: number;
}): Promise<StructuredResult<z.output<S>>> {
  const provider = getAIProvider();
  if (!provider) throw new AppError("AI_NOT_CONFIGURED", AI_NOT_CONFIGURED_MESSAGE);
  await assertAIBudget(opts.userId);
  const config = getAIConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const result = await provider.generateStructured({
      system: opts.system,
      messages: opts.messages,
      schema: opts.schema,
      maxTokens: opts.maxTokens ?? 16_000,
      signal: controller.signal,
    });
    await recordAIUsage({
      userId: opts.userId,
      tool: opts.tool,
      status: "SUCCEEDED",
      model: result.model,
      tokensIn: result.usage.inputTokens,
      tokensOut: result.usage.outputTokens,
    });
    return result;
  } catch (err) {
    const kind = err instanceof AIProviderError ? err.kind : "unavailable";
    await recordAIUsage({
      userId: opts.userId,
      tool: opts.tool,
      status: "FAILED",
      model: config.model,
      tokensIn: err instanceof AIProviderError ? err.usage?.inputTokens : 0,
      tokensOut: err instanceof AIProviderError ? err.usage?.outputTokens : 0,
      errorCode: kind,
    }).catch(() => undefined);
    if (err instanceof AIProviderError) throw new AppError("AI_UNAVAILABLE", err.message);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
