import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, validateSessionToken, type SessionUser } from "./session";

/** Current user for this request (memoised per request), or null when signed out. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
});

/** For pages: redirects signed-out visitors to sign-in. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
