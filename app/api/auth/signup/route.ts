import { createSession, hashPassword, isAdminEmail, newUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import { HttpError, assertSameOrigin, clientIp, handle, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const body = await readJson<{ email?: string; password?: string; age13?: boolean }>(req, 4096);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!EMAIL.test(email)) throw new HttpError(400, "invalid_email", "Enter a valid email address.");
  if (password.length < 8 || password.length > 200) throw new HttpError(400, "weak_password", "Use a password of at least 8 characters.");
  if (body.age13 !== true) throw new HttpError(400, "age", "You need to be 13 or older to join TEAMi.");
  await rateLimit(`signup:${clientIp(req)}`, 8, 3600e3);
  const id = newUserId();
  const hash = await hashPassword(password);
  const res = await query("INSERT INTO users (id, email, password_hash, is_admin, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING", [id, email, hash, isAdminEmail(email), Date.now()]);
  if (!res.rowCount) throw new HttpError(409, "email_taken", "An account with this email already exists. Sign in instead.");
  await createSession(id);
  return json({ ok: true });
});
