import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser, projectInput, resetDb } from "../helpers";

// Simulate the request context: no session cookie unless a test sets one.
let currentUser: unknown = null;
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => currentUser }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); }, unstable_rethrow: (e: unknown) => { if (e instanceof Error && e.message.startsWith("REDIRECT:")) throw e; } }));

beforeEach(async () => {
  currentUser = null;
  await resetDb();
});

describe("server actions reject unauthenticated and unauthorized callers", () => {
  it("returns UNAUTHENTICATED for every protected mutation without a session", async () => {
    const projectActions = await import("@/actions/projects");
    const portfolioActions = await import("@/actions/portfolio");
    const aiActions = await import("@/actions/ai");
    const adminActions = await import("@/actions/admin");
    const results = await Promise.all([
      projectActions.updateProjectAction("x", projectInput()),
      projectActions.sendInvitationAction({ projectId: "x", recipientId: "y", roleId: null, message: "hello there" }),
      portfolioActions.deletePortfolioItemAction("x"),
      aiActions.evaluateProjectAction({ source: "project", projectId: "x" }),
      adminActions.recomputeRankingsAction(),
    ]);
    for (const r of results) expect(r).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("blocks non-admins from moderation and validates input before touching data", async () => {
    const u = await makeUser();
    currentUser = { id: u.id, role: "USER", isDemo: false, username: "u" };
    const adminActions = await import("@/actions/admin");
    expect(await adminActions.recomputeRankingsAction()).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(await adminActions.reviewAchievementAction("x", true, "")).toMatchObject({ ok: false, code: "FORBIDDEN" });
    const projectActions = await import("@/actions/projects");
    const bad = await projectActions.createMilestoneAction("p", { title: "", description: "", dueDate: null, assigneeId: null, evidenceUrl: "javascript:alert(1)" });
    expect(bad).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("prevents demo accounts from changing passwords server-side", async () => {
    currentUser = { id: "demo", role: "USER", isDemo: true };
    const authActions = await import("@/actions/auth");
    expect(await authActions.changePasswordAction({ currentPassword: "a", password: "new-password-1", confirm: "new-password-1" })).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });
});
