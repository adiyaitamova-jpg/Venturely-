import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import * as projects from "@/server/services/projects";
import * as collab from "@/server/services/collaboration";
import { blockUser } from "@/server/services/social";
import { makeUser, projectInput, resetDb } from "../helpers";

beforeEach(resetDb);

async function setup() {
  const owner = await makeUser();
  const member = await makeUser();
  const outsider = await makeUser();
  const p = await projects.createProject(owner.id, projectInput());
  await db.projectMember.create({ data: { projectId: p.id, userId: member.id, role: "MEMBER" } });
  return { owner, member, outsider, p };
}

describe("project creation", () => {
  it("makes the creator the owner and logs activity", async () => {
    const owner = await makeUser();
    const p = await projects.createProject(owner.id, projectInput());
    const m = await db.projectMember.findMany({ where: { projectId: p.id } });
    expect(m).toHaveLength(1);
    expect(m[0]!.role).toBe("OWNER");
    expect(await db.activityEvent.count({ where: { projectId: p.id, type: "PROJECT_CREATED" } })).toBe(1);
  });

  it("limits how many projects can be created per day", async () => {
    const owner = await makeUser();
    for (let i = 0; i < 3; i++) await projects.createProject(owner.id, projectInput({ title: `P ${i}` }));
    await expect(projects.createProject(owner.id, projectInput({ title: "P 4" }))).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("project permissions", () => {
  it("only owners/admins edit; members manage milestones; outsiders do nothing", async () => {
    const { owner, member, outsider, p } = await setup();
    await expect(projects.updateProject(outsider.id, p.id, projectInput({ title: "Hijack" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(projects.updateProject(member.id, p.id, projectInput({ title: "Hijack" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await projects.updateProject(owner.id, p.id, projectInput({ title: "Renamed", stage: "PROTOTYPE" }));
    expect((await db.project.findUniqueOrThrow({ where: { id: p.id } })).title).toBe("Renamed");

    const ms = { title: "Build it", description: "", dueDate: null, assigneeId: member.id, evidenceUrl: null };
    await expect(projects.createMilestone(outsider.id, p.id, ms)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await projects.createMilestone(member.id, p.id, ms);
    await expect(projects.createMilestone(member.id, p.id, { ...ms, assigneeId: outsider.id })).rejects.toMatchObject({ code: "VALIDATION" });
    const m = await db.projectMilestone.findFirstOrThrow({ where: { projectId: p.id } });
    await projects.setMilestoneStatus(member.id, p.id, m.id, "DONE");
    expect((await db.projectMilestone.findUniqueOrThrow({ where: { id: m.id } })).completedAt).not.toBeNull();
    await expect(projects.deleteMilestone(member.id, p.id, m.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("protects the owner and restricts role changes to the owner", async () => {
    const { owner, member, p } = await setup();
    const admin = await makeUser();
    const adminM = await db.projectMember.create({ data: { projectId: p.id, userId: admin.id, role: "ADMIN" } });
    const ownerM = await db.projectMember.findFirstOrThrow({ where: { projectId: p.id, role: "OWNER" } });
    const memberM = await db.projectMember.findFirstOrThrow({ where: { projectId: p.id, userId: member.id } });
    await expect(projects.removeMember(admin.id, p.id, ownerM.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(projects.updateMember(admin.id, p.id, memberM.id, { title: "x", responsibilities: "", role: "ADMIN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await projects.updateMember(owner.id, p.id, memberM.id, { title: "Lead dev", responsibilities: "API", role: "ADMIN" });
    await expect(projects.removeMember(member.id, p.id, adminM.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await projects.removeMember(owner.id, p.id, adminM.id);
    await expect(projects.leaveProject(owner.id, p.id)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("archiving is owner-only and closes pending requests", async () => {
    const { owner, member, outsider, p } = await setup();
    await collab.applyToProject(outsider.id, { projectId: p.id, roleId: null, message: "x".repeat(40) });
    await expect(projects.setArchived(member.id, p.id, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await projects.setArchived(owner.id, p.id, true);
    expect(await db.projectApplication.count({ where: { projectId: p.id, status: "PENDING" } })).toBe(0);
  });
});

describe("invitations", () => {
  it("runs the full invite → accept flow and fills the role", async () => {
    const { owner, outsider, p } = await setup();
    await projects.createRole(owner.id, p.id, { title: "Designer", description: "", commitment: "LIGHT", skillIds: [] });
    const role = await db.projectRole.findFirstOrThrow({ where: { projectId: p.id } });
    const inv = await collab.sendInvitation(owner.id, { projectId: p.id, recipientId: outsider.id, roleId: role.id, message: "Join us please!" });
    expect(await db.notification.count({ where: { userId: outsider.id, type: "INVITATION_RECEIVED" } })).toBe(1);
    await expect(collab.sendInvitation(owner.id, { projectId: p.id, recipientId: outsider.id, roleId: null, message: "Again please!" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(collab.respondToInvitation(owner.id, inv.id, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await collab.respondToInvitation(outsider.id, inv.id, true);
    expect(await projects.getMembership(p.id, outsider.id)).not.toBeNull();
    expect((await db.projectRole.findUniqueOrThrow({ where: { id: role.id } })).isOpen).toBe(false);
    await expect(collab.respondToInvitation(outsider.id, inv.id, true)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("forbids non-managers, private or blocked recipients", async () => {
    const { owner, member, outsider, p } = await setup();
    await expect(collab.sendInvitation(member.id, { projectId: p.id, recipientId: outsider.id, roleId: null, message: "Join us please!" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const priv = await makeUser({ visibility: "PRIVATE" });
    await expect(collab.sendInvitation(owner.id, { projectId: p.id, recipientId: priv.id, roleId: null, message: "Join us please!" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await blockUser(outsider.id, owner.id);
    await expect(collab.sendInvitation(owner.id, { projectId: p.id, recipientId: outsider.id, roleId: null, message: "Join us please!" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("respects a recent decline", async () => {
    const { owner, outsider, p } = await setup();
    const inv = await collab.sendInvitation(owner.id, { projectId: p.id, recipientId: outsider.id, roleId: null, message: "Join us please!" });
    await collab.respondToInvitation(outsider.id, inv.id, false);
    await expect(collab.sendInvitation(owner.id, { projectId: p.id, recipientId: outsider.id, roleId: null, message: "Pretty please!" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("applications", () => {
  it("only managers review; acceptance adds membership exactly once", async () => {
    const { owner, member, outsider, p } = await setup();
    const app = await collab.applyToProject(outsider.id, { projectId: p.id, roleId: null, message: "x".repeat(40) });
    await expect(collab.applyToProject(outsider.id, { projectId: p.id, roleId: null, message: "x".repeat(40) })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(collab.applyToProject(member.id, { projectId: p.id, roleId: null, message: "x".repeat(40) })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(collab.reviewApplication(member.id, app.id, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(collab.reviewApplication(outsider.id, app.id, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await Promise.allSettled([collab.reviewApplication(owner.id, app.id, true), collab.reviewApplication(owner.id, app.id, true)]);
    expect(await db.projectMember.count({ where: { projectId: p.id, userId: outsider.id } })).toBe(1);
    expect(await db.notification.count({ where: { userId: outsider.id, type: "APPLICATION_ACCEPTED" } })).toBe(1);
  });

  it("hides members-only projects from signed-out listings", async () => {
    const owner = await makeUser();
    await projects.createProject(owner.id, projectInput({ title: "Secret", visibility: "MEMBERS" }));
    await projects.createProject(owner.id, projectInput({ title: "Open" }));
    expect((await projects.listProjects(null, {})).items.map((p) => p.title)).toEqual(["Open"]);
    expect((await projects.listProjects(owner.id, {})).total).toBe(2);
  });
});

describe("peer feedback", () => {
  it("is only possible between teammates and not about yourself", async () => {
    const { owner, member, outsider, p } = await setup();
    const f = { projectId: p.id, subjectId: member.id, contribution: 5, reliability: 4, note: "" };
    await expect(projects.leaveFeedback(outsider.id, f)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(projects.leaveFeedback(member.id, f)).rejects.toMatchObject({ code: "VALIDATION" });
    await projects.leaveFeedback(owner.id, f);
    await projects.leaveFeedback(owner.id, { ...f, contribution: 3 });
    expect(await db.peerFeedback.count()).toBe(1);
  });
});
