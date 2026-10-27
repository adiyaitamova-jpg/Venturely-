import { describe, expect, it } from "vitest";
import { signUpSchema } from "@/lib/validation/auth";
import { basicsStepSchema, usernameSchema } from "@/lib/validation/profile";
import { portfolioItemSchema } from "@/lib/validation/portfolio";
import { projectSchema } from "@/lib/validation/project";
import { evaluateRequestSchema, matchRequestSchema } from "@/lib/ai-schemas";
import { safeExternalUrl, safeRedirectPath } from "@/lib/utils";

describe("validation", () => {
  it("normalises and validates usernames", () => {
    expect(usernameSchema.parse("  Maya_K ")).toBe("maya_k");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("-bad").success).toBe(false);
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("has space").success).toBe(false);
  });

  it("requires age confirmation and a reasonable password at sign-up", () => {
    const ok = { displayName: "Maya", email: "MAYA@Example.com ", password: "correct-horse-1", ageConfirmed: true };
    expect(signUpSchema.parse(ok).email).toBe("maya@example.com");
    expect(signUpSchema.safeParse({ ...ok, ageConfirmed: false }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, password: "short1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, password: "onlyletterslong" }).success).toBe(false);
  });

  it("rejects non-http links so javascript: URLs can never be stored", () => {
    const base = { title: "Thing", description: "A description that is long enough to pass.", kind: "PROJECT", category: "AI", date: "2026-01", contribution: "", outcome: "", evidenceUrl: "", mediaUrl: "", skillIds: [] };
    expect(portfolioItemSchema.safeParse({ ...base, projectUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(portfolioItemSchema.safeParse({ ...base, projectUrl: "data:text/html,hi" }).success).toBe(false);
    const parsed = portfolioItemSchema.parse({ ...base, projectUrl: "https://example.com/x" });
    expect(parsed.projectUrl).toBe("https://example.com/x");
    expect(parsed.evidenceUrl).toBeNull();
  });

  it("strips control characters and enforces length limits", () => {
    const r = basicsStepSchema.parse({ displayName: "Ma\u0000ya", username: "maya", headline: "hi\u0007", avatarHue: 10 });
    expect(r.displayName).toBe("Maya");
    expect(r.headline).toBe("hi");
    expect(projectSchema.safeParse({ title: "x".repeat(81) }).success).toBe(false);
  });

  it("validates AI inputs", () => {
    expect(matchRequestSchema.safeParse({ brief: "too short", projectId: null, skillIds: [], roles: [] }).success).toBe(false);
    expect(matchRequestSchema.safeParse({ brief: "x".repeat(2001), projectId: null, skillIds: [], roles: [] }).success).toBe(false);
    expect(matchRequestSchema.safeParse({ brief: "A real brief about a robotics project", projectId: null, skillIds: Array(13).fill("a"), roles: [] }).success).toBe(false);
    expect(evaluateRequestSchema.safeParse({ source: "project" }).success).toBe(false);
    expect(evaluateRequestSchema.safeParse({ source: "idea", title: "Idea", description: "x".repeat(40), goals: "", progress: "", stage: "IDEA", teamSize: 0 }).success).toBe(false);
  });

  it("only allows safe external and redirect URLs", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl("https://example.com")).toBe("https://example.com/");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/projects/x")).toBe("/projects/x");
  });
});
