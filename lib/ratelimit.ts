import { query } from "./db";
import { HttpError } from "./http";

/** Fixed-window limiter stored in Postgres, so it holds across serverless instances. */
export async function rateLimit(key: string, limit: number, windowMs: number, message = "Too many attempts. Wait a little and try again.") {
  const now = Date.now();
  const { rows } = await query<{ count: number }>(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= $3 THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= $3 THEN $2 ELSE rate_limits.reset_at END
     RETURNING count`,
    [key, now + windowMs, now],
  );
  if ((rows[0]?.count ?? 0) > limit) throw new HttpError(429, "rate_limited", message);
}
