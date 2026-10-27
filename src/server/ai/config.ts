import "server-only";

export type AIEffort = "low" | "medium" | "high" | "xhigh" | "max";

export type AIConfig = {
  provider: "anthropic";
  apiKey: string | undefined;
  model: string;
  effort: AIEffort;
  /** Server-side refusal fallback ("default") or "off". */
  fallbacks: "default" | "off";
  timeoutMs: number;
  dailyRequestLimit: number;
  dailyTokenBudget: number;
};

const EFFORTS: AIEffort[] = ["low", "medium", "high", "xhigh", "max"];

function int(value: string | undefined, fallback: number, min: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : fallback;
}

/** All AI settings come from environment variables; nothing is exposed to the client. */
export function getAIConfig(): AIConfig {
  const effort = (process.env.AI_EFFORT ?? "medium") as AIEffort;
  return {
    provider: "anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY || undefined,
    model: process.env.AI_MODEL || "claude-opus-5-5",
    effort: EFFORTS.includes(effort) ? effort : "medium",
    fallbacks: process.env.AI_FALLBACKS === "off" ? "off" : "default",
    timeoutMs: int(process.env.AI_TIMEOUT_MS, 90_000, 5_000, 300_000),
    dailyRequestLimit: int(process.env.AI_DAILY_REQUEST_LIMIT, 40, 1, 10_000),
    dailyTokenBudget: int(process.env.AI_DAILY_TOKEN_BUDGET, 600_000, 1_000, 100_000_000),
  };
}

export function isAIConfigured(): boolean {
  return Boolean(getAIConfig().apiKey);
}
