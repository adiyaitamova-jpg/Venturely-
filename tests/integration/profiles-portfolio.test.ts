import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { saveOnboardingStep, setAvatar, sniffImageType } from "@/server/services/profile";
import * as portfolio from "@/server/services/portfolio";
import { getProfilePage } from "@/server/services/public-profile";
import { blockUser } from "@/server/services/social";
import { makeUser, resetDb } from "../helpers";

beforeEach(resetDb);

const item = { title: "Thing", description: "A description that is long enough.", kind: "PROJECT" as const, category: "AI" as const, date: new Date("2026-01-01"), contribution: "", outcome: "", projectUrl: null, evidenceUrl: null, mediaUrl: null, skillIds: [] };
const ach = { title: "Award", description: "", type: "AWARD" as const, level: "NATIONAL" as const, category: "AI" as const, issuer: "Org", date: new Date("2026-01-01"), evidenceUrl: "https://example.com/proof" };

describe("onboarding", () => {
  it("saves progress per step and finishes on the last step", async () => {
    const u = await makeUser({ onboarded: false });
    await db.profile.update({ where: { userId: u.id }, data: { onboardingStep: 0 } });
    const r1 = await saveOnboardingStep(u.id, { step: 0, data: { displayName: "New Name", username: "newname", headline: "", avatarHue: 10 } });
    expect(r1).toEqual({ onboardingStep: 1, finished: false });
    const r5 = await saveOnboardingStep(u.id, { step: 4, data: { availability: "COMMITTED", projectIdeas: "", websiteUrl: null, githubUrl: null, linkedinUrl: null, visibility: "PUBLIC" } });
    expect(r5.finished).toBe(true);
    expect((await db.profile.findUniqueOrThrow({ where: { userId: u.id } })).onboardedAt).not.toBeNull();
  });

  it("rejects a username that's taken", async () => {
    await makeUser({ username: "taken" });
    const u = await makeUser();
    await expect(saveOnboardingStep(u.id, { step: 0, data: { displayName: "X", username: "taken", headline: "", avatarHue: 1 } })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("portfolio ownership", () => {
  it("lets owners edit/reorder/delete and blocks everyone else", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const a = await portfolio.createPortfolioItem(owner.id, item);
    const b = await portfolio.createPortfolioItem(owner.id, { ...item, title: "Second" });
    await expect(portfolio.updatePortfolioItem(other.id, a.id, { ...item, title: "Hacked" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(portfolio.deletePortfolioItem(other.id, a.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(portfolio.reorderPortfolio(other.id, [b.id, a.id])).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(portfolio.reorderPortfolio(owner.id, [b.id])).rejects.toMatchObject({ code: "VALIDATION" });
    await portfolio.reorderPortfolio(owner.id, [b.id, a.id]);
    const list = await portfolio.listOwnPortfolio(owner.id);
    expect(list.map((i) => i.title)).toEqual(["Second", "Thing"]);
    await portfolio.deletePortfolioItem(owner.id, a.id);
    expect(await db.portfolioItem.count()).toBe(1);
  });

  it("never lets users self-verify and resets verification when claims change", async () => {
    const u = await makeUser();
    const other = await makeUser();
    const { id } = await portfolio.createAchievement(u.id, { ...ach });
    expect((await db.achievement.findUniqueOrThrow({ where: { id } })).status).toBe("SELF_REPORTED");
    await expect(portfolio.requestVerification(other.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await portfolio.requestVerification(u.id, id);
    expect((await db.achievement.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
    await db.achievement.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
    const r = await portfolio.updateAchievement(u.id, id, { ...ach, level: "INTERNATIONAL" });
    expect(r.verificationReset).toBe(true);
    expect((await db.achievement.findUniqueOrThrow({ where: { id } })).status).toBe("SELF_REPORTED");
  });

  it("requires evidence before verification can be requested", async () => {
    const u = await makeUser();
    const { id } = await portfolio.createAchievement(u.id, { ...ach, evidenceUrl: null });
    await expect(portfolio.requestVerification(u.id, id)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("profile visibility & privacy", () => {
  it("applies public / members / private rules and blocks", async () => {
    const pub = await makeUser({ username: "pubby", visibility: "PUBLIC" });
    const mem = await makeUser({ username: "memby", visibility: "MEMBERS" });
    const priv = await makeUser({ username: "privy", visibility: "PRIVATE" });
    const viewer = await makeUser();
    expect(await getProfilePage("pubby", null)).not.toBeNull();
    expect(await getProfilePage("memby", null)).toBeNull();
    expect(await getProfilePage("memby", viewer.id)).not.toBeNull();
    expect(await getProfilePage("privy", viewer.id)).toBeNull();
    expect((await getProfilePage("privy", priv.id))?.isOwner).toBe(true);
    await blockUser(pub.id, viewer.id);
    expect(await getProfilePage("pubby", viewer.id)).toBeNull();
    void mem;
  });

  it("never exposes email on the public profile payload", async () => {
    await makeUser({ username: "pubby", visibility: "PUBLIC" });
    const page = await getProfilePage("pubby", null);
    expect(JSON.stringify(page)).not.toContain("@test.local");
  });
});

describe("avatar uploads", () => {
  it("accepts real images by magic bytes only, with a size limit", async () => {
    const u = await makeUser();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(sniffImageType(png)).toBe("image/png");
    const html = new TextEncoder().encode("<svg onload=alert(1)>");
    await expect(setAvatar(u.id, html)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(setAvatar(u.id, new Uint8Array(600 * 1024))).rejects.toMatchObject({ code: "VALIDATION" });
    await setAvatar(u.id, png);
    expect((await db.profile.findUniqueOrThrow({ where: { userId: u.id } })).avatarMime).toBe("image/png");
  });
});
