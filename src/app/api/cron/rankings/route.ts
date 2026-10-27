import { timingSafeEqual } from "node:crypto";
import { recomputeRankings } from "@/server/services/rankings";

/**
 * Scheduled ranking recompute (e.g. Vercel Cron every 15 minutes).
 * Requires `Authorization: Bearer $CRON_SECRET`; disabled when CRON_SECRET is unset.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await recomputeRankings();
  return Response.json(result ? { ok: true, ...result } : { ok: true, skipped: true });
}
