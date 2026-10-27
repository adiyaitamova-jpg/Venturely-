import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { authenticate, createPasswordResetToken, registerUser, resetPassword } from "@/server/services/auth";
import { createSession, validateSessionToken } from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { consumeRateLimit } from "@/server/rate-limit";
import { resetDb } from "../helpers";

beforeEach(resetDb);

describe("registration and authentication", () => {
  it("registers a user with a profile, hashes the password and authenticates", async () => {
    const u = await registerUser({ displayName: "Maya", email: "maya@x.test", password: "correct-horse-1", ageConfirmed: true });
    const stored = await db.user.findUniqueOrThrow({ where: { id: u.id }, include: { profile: true } });
    expect(stored.passwordHash).not.toContain("correct-horse");
    expect(stored.profile?.visibility).toBe("MEMBERS"); // private-by-default
    expect(stored.termsAcceptedAt).not.toBeNull();
    expect(await authenticate("maya@x.test", "correct-horse-1")).toBe(u.id);
  });

  it("rejects duplicate emails and wrong passwords with generic errors", async () => {
    await registerUser({ displayName: "Maya", email: "maya@x.test", password: "correct-horse-1", ageConfirmed: true });
    await expect(registerUser({ displayName: "M", email: "maya@x.test", password: "correct-horse-1", ageConfirmed: true })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(authenticate("maya@x.test", "wrong-password-1")).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(authenticate("nobody@x.test", "wrong-password-1")).rejects.toMatchObject({ message: "That email and password don't match." });
  });

  it("blocks suspended accounts", async () => {
    const u = await registerUser({ displayName: "S", email: "s@x.test", password: "correct-horse-1", ageConfirmed: true });
    await db.user.update({ where: { id: u.id }, data: { suspendedAt: new Date() } });
    await expect(authenticate("s@x.test", "correct-horse-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("sessions", () => {
  it("stores only a hash of the token and validates it", async () => {
    const u = await registerUser({ displayName: "Maya", email: "maya@x.test", password: "correct-horse-1", ageConfirmed: true });
    const { token } = await createSession(u.id);
    expect(await db.session.findUnique({ where: { id: token } })).toBeNull();
    expect(await db.session.findUnique({ where: { id: hashToken(token) } })).not.toBeNull();
    const v = await validateSessionToken(token);
    expect(v?.user.id).toBe(u.id);
    expect(v?.user).not.toHaveProperty("passwordHash");
    expect(await validateSessionToken("forged-token")).toBeNull();
  });

  it("deletes expired sessions and extends ones nearing expiry", async () => {
    const u = await registerUser({ displayName: "Maya", email: "maya@x.test", password: "correct-horse-1", ageConfirmed: true });
    const { token } = await createSession(u.id);
    await db.session.update({ where: { id: hashToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await db.session.count()).toBe(0);
    const s2 = await createSession(u.id);
    await db.session.update({ where: { id: hashToken(s2.token) }, data: { expiresAt: new Date(Date.now() + 86400000) } });
    expect((await validateSessionToken(s2.token))?.renewed).toBe(true);
  });
});

describe("password reset", () => {
  it("issues single-use tokens and signs out other sessions", async () => {
    const u = await registerUser({ displayName: "Maya", email: "maya@x.test", password: "correct-horse-1", ageConfirmed: true });
    await createSession(u.id);
    expect(await createPasswordResetToken("nobody@x.test")).toBeNull();
    const t = await createPasswordResetToken("maya@x.test");
    await resetPassword(t!.token, "brand-new-pass-2");
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect(await authenticate("maya@x.test", "brand-new-pass-2")).toBe(u.id);
    await expect(resetPassword(t!.token, "another-pass-3")).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("rate limiting", () => {
  it("allows up to the limit within a window", async () => {
    const rule = { limit: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await consumeRateLimit("t:1", rule)).allowed);
    expect(results).toEqual([true, true, true, false, false]);
  });
});
