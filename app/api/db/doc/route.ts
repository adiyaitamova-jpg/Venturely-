import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { HttpError, assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { MAX_DOC_BYTES, canRead, canWrite, validPath } from "@/lib/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const user = await requireUser();
  const path = req.nextUrl.searchParams.get("path") || "";
  if (!validPath(path) || !canRead(path, user)) return json({ exists: false });
  const { rows } = await query<{ data: unknown; version: number }>("SELECT data, version FROM docs WHERE path = $1 AND NOT deleted", [path]);
  return json(rows[0] ? { exists: true, data: rows[0].data, version: rows[0].version } : { exists: false });
});

export const PUT = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const body = await readJson<{ path?: string; data?: unknown }>(req, MAX_DOC_BYTES + 2048);
  const path = String(body.path || "");
  if (!canWrite(path, user)) throw new HttpError(403, "invalid_argument", "You can't change this.");
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) throw new HttpError(400, "invalid_argument", "Documents must be objects.");
  if (JSON.stringify(body.data).length > MAX_DOC_BYTES) throw new HttpError(413, "invalid_argument", "This document is too large.");
  await rateLimit(`write:${user.id}`, 240, 60e3, "You're saving very quickly. Wait a moment and try again.");
  const { rows } = await query<{ version: number }>(
    `INSERT INTO docs (path, data, version, deleted, updated_by, updated_at) VALUES ($1, $2, 1, FALSE, $3, $4)
     ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, version = docs.version + 1, deleted = FALSE,
       updated_by = EXCLUDED.updated_by, updated_at = GREATEST(EXCLUDED.updated_at, docs.updated_at + 1)
     RETURNING version`,
    [path, JSON.stringify(body.data), user.id, Date.now()],
  );
  return json({ ok: true, version: rows[0]!.version });
});
