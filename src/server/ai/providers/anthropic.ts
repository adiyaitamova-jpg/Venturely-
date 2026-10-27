import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { AIConfig } from "../config";
import { AIProviderError, type AIProvider, type StructuredRequest, type StructuredResult } from "../types";

/** Claude via the official Anthropic SDK, using structured outputs validated against Zod schemas. */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(private config: AIConfig) {
    // Retries are handled by the SDK for 408/409/429/5xx and connection errors.
    this.client = new Anthropic({ apiKey: config.apiKey, timeout: config.timeoutMs, maxRetries: 2 });
  }

  async generateStructured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResult<z.output<S>>> {
    const { config } = this;
    let response;
    try {
      response = await this.client.beta.messages.parse(
        {
          model: config.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: req.messages,
          output_config: { effort: config.effort, format: betaZodOutputFormat(req.schema) },
          // Server-side refusal fallback: re-routes a declined request instead of failing outright.
          ...(config.fallbacks === "default" ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        },
        { signal: req.signal },
      );
    } catch (err) {
      throw mapError(err);
    }

    const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    if (response.stop_reason === "refusal") {
      throw new AIProviderError("refusal", "The mentor couldn't help with this request. Try rephrasing it around your project.", usage);
    }
    if (response.stop_reason === "max_tokens") {
      throw new AIProviderError("invalid_output", "The response was too long to complete. Try a shorter or more focused request.", usage);
    }
    if (response.parsed_output == null) {
      throw new AIProviderError("invalid_output", "The mentor returned a response we couldn't read. Please try again.", usage);
    }
    return { data: response.parsed_output as z.output<S>, usage, model: response.model };
  }
}

function mapError(err: unknown): AIProviderError {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AIProviderError("auth", "The AI provider rejected our credentials. An administrator needs to check ANTHROPIC_API_KEY.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AIProviderError("rate_limit", "The AI mentor is busy right now. Please try again in a minute.");
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError || (err instanceof Error && err.name === "AbortError")) {
    return new AIProviderError("timeout", "The AI mentor took too long to respond. Please try again.");
  }
  if (err instanceof Anthropic.BadRequestError) {
    console.error("[ai] bad request", err.message);
    return new AIProviderError("bad_request", "The AI request was rejected. Please shorten your input and try again.");
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[ai] provider error", err.status, err.message);
    return new AIProviderError("unavailable", "The AI provider is temporarily unavailable. Please try again shortly.");
  }
  if (err instanceof AIProviderError) return err;
  console.error("[ai] unexpected error", err);
  return new AIProviderError("unavailable", "The AI mentor is temporarily unavailable. Please try again shortly.");
}
