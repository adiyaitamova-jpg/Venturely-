import "server-only";
import { db } from "@/server/db";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "vt_session";
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
const RENEW_THRESHOLD_MS = 15 * 24 * 3600 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  isDemo: boolean;
  username: string;
  displayName: string;
  avatarHue: number;
  hasAvatar: boolean;
  avatarVersion: number | null;
  onboardingStep: number;
  onboarded: boolean;
};

/** Creates a session and returns the raw token (only the SHA-256 hash is stored). */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/**
 * Validates a raw session token. Expired sessions are deleted; sessions past the
 * halfway point are extended (sliding expiry). Suspended users are rejected.
 */
export async function validateSessionToken(
  token: string,
): Promise<{ user: SessionUser; expiresAt: Date; renewed: boolean } | null> {
  if (!token || token.length > 200) return null;
  const id = hashToken(token);
  const session = await db.session.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isDemo: true,
          suspendedAt: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              avatarHue: true,
              avatarMime: true,
              avatarUpdatedAt: true,
              onboardingStep: true,
              onboardedAt: true,
            },
          },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || session.user.suspendedAt || !session.user.profile) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }
  let expiresAt = session.expiresAt;
  let renewed = false;
  if (expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.session.update({ where: { id }, data: { expiresAt } });
    renewed = true;
  }
  const { user } = session;
  const profile = user.profile!;
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isDemo: user.isDemo,
      username: profile.username,
      displayName: profile.displayName,
      avatarHue: profile.avatarHue,
      hasAvatar: Boolean(profile.avatarMime),
      avatarVersion: profile.avatarUpdatedAt?.getTime() ?? null,
      onboardingStep: profile.onboardingStep,
      onboarded: Boolean(profile.onboardedAt),
    },
    expiresAt,
    renewed,
  };
}

export async function invalidateSessionToken(token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function invalidateAllSessions(userId: string, exceptToken?: string): Promise<void> {
  await db.session.deleteMany({
    where: { userId, ...(exceptToken ? { id: { not: hashToken(exceptToken) } } : {}) },
  });
}
