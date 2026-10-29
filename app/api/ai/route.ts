import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/auth";
import { HttpError, assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

type Turn = { role: "user" | "assistant"; content: string };
const EFFORT = { quick: "low", default: "medium", complex: "high" } as const;
const MAX_INPUT_CHARS = 60_000;

/** The AI Mentor's only door to Claude: signed-in members, per-member daily limits, the key stays on the server. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(503, "not_configured", "The AI Mentor isn't set up on this site yet.");
  const body = await readJson<{ input?: string | Turn[]; modelTier?: keyof typeof EFFORT }>(req, MAX_INPUT_CHARS * 2);
  const turns: Turn[] = typeof body.input === "string" ? [{ role: "user", content: body.input }] : Array.isArray(body.input) ? body.input : [];
  const clean = turns
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .map((t) => ({ role: t.role, content: t.content }));
  if (!clean.length || clean[clean.length - 1]!.role !== "user") throw new HttpError(400, "invalid_argument", "Nothing to send.");
  if (clean.reduce((n, t) => n + t.content.length, 0) > MAX_INPUT_CHARS) throw new HttpError(413, "prompt_too_large", "That's too much text at once.");
  await rateLimit(`ai-min:${user.id}`, 8, 60e3, "rate_limited");
  await rateLimit(`ai-day:${user.id}`, Number(process.env.AI_DAILY_LIMIT) || 40, 864e5, "rate_limited");

  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: process.env.AI_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: EFFORT[body.modelTier ?? "default"] ?? "medium" },
    messages: clean,
  });
  if (response.stop_reason === "refusal") throw new HttpError(422, "refused", "The mentor couldn't help with that request.");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  if (!text.trim()) throw new HttpError(502, "empty_completion", "The mentor returned nothing.");
  return json({ text, truncated: response.stop_reason === "max_tokens" });
});
