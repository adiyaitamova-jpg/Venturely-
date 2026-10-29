import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { handle, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns every readable document changed after `since` (ms). Clients poll this and merge by version. */
export const GET = handle(async (req) => {
  const user = await requireUser();
  const since = Math.max(0, Number(req.nextUrl.searchParams.get("since")) || 0);
  const now = Date.now();
  const { rows } = await query<{ path: string; data: unknown; version: number; deleted: boolean }>(
    `SELECT path, data, version, deleted FROM docs
     WHERE updated_at > $1 AND (path NOT LIKE 'data/%' OR path LIKE $2)
     ORDER BY updated_at LIMIT 5000`,
    [since, `data/users/${user.id}/%`],
  );
  return json({ now, docs: rows });
});
