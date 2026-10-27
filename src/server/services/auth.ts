import "server-only";
import type { z } from "zod";
import { db } from "@/server/db";
import { AppError, conflict } from "@/server/errors";
import { hashPassword, verifyPassword, DUMMY_HASH } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { invalidateAllSessions } from "@/server/auth/session";
import type { changePasswordSchema, signUpSchema } from "@/lib/validation/auth";
import { slugify } from "@/lib/utils";

const RESET_TTL_MS = 60 * 60 * 1000;

async function uniqueUsername(base: string): Promise<string> {
  const root = (slugify(base).replace(/-/g, "") || "member").slice(0, 16);
  for (let i = 0; i < 20; i++) {
    const candidate = `${root}${Math.floor(1000 + Math.random() * 9000)}`;
    const taken = await db.profile.findUnique({ where: { username: candidate }, select: { userId: true } });
    if (!taken) return candidate;
  }
  return `member${Date.now().toString(36)}`;
}

export async function registerUser(input: z.output<typeof signUpSchema>) {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw conflict("An account with this email already exists. Try signing in instead.");
  const passwordHash = await hashPassword(input.password);
  const username = await uniqueUsername(input.displayName);
  return db.user.create({
    data: {
      email: input.email,
      passwordHash,
      termsAcceptedAt: new Date(),
      profile: {
        create: {
          username,
          displayName: input.displayName,
          avatarHue: Math.floor(Math.random() * 360),
        },
      },
    },
    select: { id: true },
  });
}

/** Returns the user id on success. Uses a constant-time-ish path for unknown emails. */
export async function authenticate(email: string, password: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, suspendedAt: true },
  });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError("VALIDATION", "That email and password don't match.");
  if (user.suspendedAt) throw new AppError("FORBIDDEN", "This account is suspended. Contact support if you think this is a mistake.");
  return user.id;
}

/** Creates a reset token if the account exists. Always resolves (no account enumeration). */
export async function createPasswordResetToken(email: string): Promise<{ token: string; userId: string } | null> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, suspendedAt: true } });
  if (!user || user.suspendedAt) return null;
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const token = generateToken();
  await db.passwordResetToken.create({
    data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return { token, userId: user.id };
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  const record = await db.passwordResetToken.findUnique({ where: { id: hashToken(token) } });
  return Boolean(record && !record.usedAt && record.expiresAt > new Date());
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const id = hashToken(token);
  const record = await db.passwordResetToken.findUnique({ where: { id } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new AppError("VALIDATION", "This reset link has expired or was already used. Request a new one.");
  }
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } }),
  ]);
  // Sign out everywhere after a reset.
  await invalidateAllSessions(record.userId);
  return record.userId;
}

export async function changePassword(
  userId: string,
  input: z.output<typeof changePasswordSchema>,
  currentToken?: string,
) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError("VALIDATION", "Your current password is incorrect.", { currentPassword: ["Incorrect password"] });
  }
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.password) } });
  await invalidateAllSessions(userId, currentToken);
}

export async function deleteAccount(userId: string, password: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new AppError("VALIDATION", "Your password is incorrect.", { password: ["Incorrect password"] });
  }
  // Cascades remove the profile, portfolio, memberships, requests, AI history and sessions.
  // Projects the user owns are deleted too; we transfer ownership first where a teammate exists.
  const owned = await db.project.findMany({
    where: { ownerId: userId },
    select: { id: true, members: { where: { userId: { not: userId } }, orderBy: [{ role: "asc" }, { joinedAt: "asc" }], take: 1 } },
  });
  for (const p of owned) {
    const heir = p.members[0];
    if (heir) {
      await db.$transaction([
        db.project.update({ where: { id: p.id }, data: { ownerId: heir.userId } }),
        db.projectMember.update({ where: { id: heir.id }, data: { role: "OWNER" } }),
      ]);
    }
  }
  await db.user.delete({ where: { id: userId } });
}
