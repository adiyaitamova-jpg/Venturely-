import type { z } from "zod";

export type AIMessage = { role: "user" | "assistant"; content: string };

export type StructuredRequest<S extends z.ZodType> = {
  system: string;
  messages: AIMessage[];
  schema: S;
  maxTokens: number;
  signal: AbortSignal;
};

export type AIUsageInfo = { inputTokens: number; outputTokens: number };

export type StructuredResult<T> = { data: T; usage: AIUsageInfo; model: string };

/**
 * Provider abstraction. Each provider turns a system prompt + messages + Zod
 * schema into validated structured output. Add a provider by implementing this
 * interface and registering it in ./provider.ts.
 */
export interface AIProvider {
  readonly name: string;
  generateStructured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResult<z.output<S>>>;
}

export class AIProviderError extends Error {
  constructor(
    public readonly kind: "auth" | "rate_limit" | "timeout" | "refusal" | "invalid_output" | "unavailable" | "bad_request",
    message: string,
    public readonly usage?: AIUsageInfo,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
