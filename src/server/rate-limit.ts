import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";

export type RateLimitRule = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  signIn: { limit: 10, windowSeconds: 15 * 60 },
  signUp: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 5, windowSeconds: 60 * 60 },
  invitation: { limit: 20, windowSeconds: 24 * 60 * 60 },
  application: { limit: 10, windowSeconds: 24 * 60 * 60 },
  report: { limit: 10, windowSeconds: 24 * 60 * 60 },
  aiBurst: { limit: 6, windowSeconds: 60 },
  avatarUpload: { limit: 10, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Fixed-window counter stored in Postgres so limits hold across server instances.
 * The upsert is a single atomic statement.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<{ allowed: boolean; resetAt: Date }> {
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, NOW() + make_interval(secs => ${rule.windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW()
        THEN NOW() + make_interval(secs => ${rule.windowSeconds}) ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0]!;
  return { allowed: row.count <= rule.limit, resetAt: row.resetAt };
}

export async function enforceRateLimit(key: string, rule: RateLimitRule, message?: string): Promise<void> {
  const { allowed, resetAt } = await consumeRateLimit(key, rule);
  if (!allowed) {
    const minutes = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000));
    throw new AppError("RATE_LIMITED", message ?? `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }
}
