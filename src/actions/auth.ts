"use server";

import { redirect } from "next/navigation";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema, changePasswordSchema } from "@/lib/validation/auth";
import { safeRedirectPath } from "@/lib/utils";
import { authedAction, parseInput, runAction } from "@/server/action";
import { createSession, invalidateSessionToken } from "@/server/auth/session";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "@/server/auth/cookies";
import { enforceRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { appUrl, clientIp } from "@/server/request";
import { sendEmail } from "@/server/email";
import * as auth from "@/server/services/auth";
import { z } from "zod";
import { forbidden } from "@/server/errors";

export async function signUpAction(input: unknown) {
  const result = await runAction(async () => {
    const data = parseInput(signUpSchema, input);
    await enforceRateLimit(`signup:${await clientIp()}`, RATE_LIMITS.signUp);
    const user = await auth.registerUser(data);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return null;
  });
  if (result.ok) redirect("/onboarding");
  return result;
}

export async function signInAction(input: unknown, next?: string) {
  const result = await runAction(async () => {
    const data = parseInput(signInSchema, input);
    const ip = await clientIp();
    await enforceRateLimit(`signin:${ip}:${data.email}`, RATE_LIMITS.signIn);
    const userId = await auth.authenticate(data.email, data.password);
    const session = await createSession(userId);
    await setSessionCookie(session.token, session.expiresAt);
    return null;
  });
  if (result.ok) redirect(safeRedirectPath(next));
  return result;
}

export async function signOutAction() {
  const token = await readSessionCookie();
  if (token) await invalidateSessionToken(token);
  await clearSessionCookie();
  redirect("/");
}

export async function forgotPasswordAction(input: unknown) {
  return runAction(async () => {
    const { email } = parseInput(forgotPasswordSchema, input);
    await enforceRateLimit(`reset:${await clientIp()}`, RATE_LIMITS.passwordReset);
    const created = await auth.createPasswordResetToken(email);
    if (created) {
      const link = `${appUrl()}/reset-password/${created.token}`;
      await sendEmail({
        to: email,
        subject: "Reset your TEAMi password",
        text: `Someone (hopefully you) asked to reset your TEAMi password.\n\nReset it here (valid for 1 hour):\n${link}\n\nIf this wasn't you, you can ignore this email — your password won't change.`,
      });
    }
    // Same response whether or not the account exists.
    return null;
  });
}

export async function resetPasswordAction(input: unknown) {
  const result = await runAction(async () => {
    const data = parseInput(resetPasswordSchema, input);
    await enforceRateLimit(`reset-submit:${await clientIp()}`, RATE_LIMITS.passwordReset);
    const userId = await auth.resetPassword(data.token, data.password);
    const session = await createSession(userId);
    await setSessionCookie(session.token, session.expiresAt);
    return null;
  });
  if (result.ok) redirect("/dashboard?reset=1");
  return result;
}

export async function changePasswordAction(input: unknown) {
  return authedAction(async (user) => {
    if (user.isDemo) throw forbidden("Shared demo accounts can't change their password.");
    const data = parseInput(changePasswordSchema, input);
    await auth.changePassword(user.id, data, await readSessionCookie());
    return null;
  });
}

export async function deleteAccountAction(input: unknown) {
  const result = await authedAction(async (user) => {
    if (user.isDemo) throw forbidden("Shared demo accounts can't be deleted.");
    const { password } = parseInput(z.object({ password: z.string().min(1).max(128) }), input);
    await auth.deleteAccount(user.id, password);
    await clearSessionCookie();
    return null;
  });
  if (result.ok) redirect("/?deleted=1");
  return result;
}
