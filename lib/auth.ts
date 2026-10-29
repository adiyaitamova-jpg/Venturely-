import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query } from "./db";
import { HttpError } from "./http";

export const SESSION_COOKIE = "teami_session";
const SESSION_DAYS = 30;

export type SessionUser = { id: string; email: string; isAdmin: boolean };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newUserId = () => randomBytes(12).toString("hex");

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 864e5;
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), userId, expires]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query<{ id: string; email: string; is_admin: boolean; expires_at: string }>(
    `SELECT u.id, u.email, u.is_admin, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1`,
    [sha256(token)],
  );
  const row = rows[0];
  if (!row || Number(row.expires_at) < Date.now()) return null;
  return { id: row.id, email: row.email, isAdmin: row.is_admin };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "unauthenticated", "Sign in to continue.");
  return user;
}

export function isAdminEmail(email: string) {
  const admins = (process.env.ADMIN_EMAIL || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}
