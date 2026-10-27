import "server-only";
import { getAIConfig } from "./config";
import { AnthropicProvider } from "./providers/anthropic";
import type { AIProvider } from "./types";

let override: AIProvider | null = null;

/** Test hook: inject a fake provider. */
export function setAIProviderForTesting(provider: AIProvider | null) {
  override = provider;
}

export function getAIProvider(): AIProvider | null {
  if (override) return override;
  const config = getAIConfig();
  if (!config.apiKey) return null;
  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider(config);
  }
}
