import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AppError } from "@/server/errors";
import { getCurrentUser } from "@/server/auth/current-user";
import type { SessionUser } from "@/server/auth/session";

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    const first = result.error.issues[0];
    throw new AppError("VALIDATION", first ? first.message : "Check the highlighted fields.", fieldErrors);
  }
  return result.data;
}

/** Wraps a server action: maps expected errors to results, hides internals. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof AppError) {
      return { ok: false, error: err.message, code: err.code, fieldErrors: err.fieldErrors };
    }
    console.error("[action] unexpected error", err);
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

/** Like runAction, but requires a signed-in user. */
export async function authedAction<T>(fn: (user: SessionUser) => Promise<T>): Promise<ActionResult<T>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Your session has ended. Please sign in again.");
    return fn(user);
  });
}
