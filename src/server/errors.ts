export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_NOT_CONFIGURED"
  | "AI_UNAVAILABLE"
  | "AI_BUDGET_EXCEEDED";

/** Expected, user-presentable failure. Anything else is treated as an internal error. */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = (message = "You don't have permission to do that.") => new AppError("FORBIDDEN", message);
export const notFound = (message = "We couldn't find that.") => new AppError("NOT_FOUND", message);
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const invalid = (message: string, fieldErrors?: Record<string, string[]>) =>
  new AppError("VALIDATION", message, fieldErrors);
