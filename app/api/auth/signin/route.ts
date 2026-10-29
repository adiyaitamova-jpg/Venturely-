import { createSession, isAdminEmail, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";
import { HttpError, assertSameOrigin, clientIp, handle, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const body = await readJson<{ email?: string; password?: string }>(req, 4096);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  await rateLimit(`signin:${clientIp(req)}`, 30, 15 * 60e3);
  await rateLimit(`signin:${email}`, 10, 15 * 60e3);
  const { rows } = await query<{ id: string; password_hash: string; is_admin: boolean }>("SELECT id, password_hash, is_admin FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) throw new HttpError(401, "bad_credentials", "Wrong email or password.");
  // Keeps the moderator flag in sync with ADMIN_EMAIL when it is set after sign-up.
  if (isAdminEmail(email) !== user.is_admin) await query("UPDATE users SET is_admin = $2 WHERE id = $1", [user.id, isAdminEmail(email)]);
  await createSession(user.id);
  return json({ ok: true });
});
