import "server-only";
import type { z } from "zod";
import { db } from "@/server/db";
import { conflict, forbidden, invalid, notFound } from "@/server/errors";
import type { applicationSchema, invitationSchema } from "@/lib/validation/project";
import { canViewUser, isBlockedBetween, visibleProjectWhere } from "./privacy";
import { notify } from "./notifications";
import { canManage, getMembership, requireProjectRole } from "./projects";

async function displayName(userId: string) {
  return (await db.profile.findUnique({ where: { userId }, select: { displayName: true } }))?.displayName ?? "Someone";
}

async function assertRole(projectId: string, roleId: string | null) {
  if (!roleId) return null;
  const role = await db.projectRole.findFirst({ where: { id: roleId, projectId } });
  if (!role) throw invalid("That role doesn't belong to this project.");
  if (!role.isOpen) throw invalid("That role has already been filled.");
  return role;
}

// ─────────────────────────── Invitations ───────────────────────────

export async function sendInvitation(senderId: string, data: z.output<typeof invitationSchema>) {
  const { project } = await requireProjectRole(data.projectId, senderId, "MANAGER");
  if (project.status !== "ACTIVE") throw invalid("Archived projects can't send invitations.");
  if (data.recipientId === senderId) throw invalid("You're already on this team.");
  if (!(await canViewUser(senderId, data.recipientId))) throw notFound("That person isn't available to invite.");
  if (await isBlockedBetween(senderId, data.recipientId)) throw notFound("That person isn't available to invite.");
  if (await getMembership(data.projectId, data.recipientId)) throw conflict("They're already on this team.");
  const role = await assertRole(data.projectId, data.roleId);
  const pending = await db.collaborationInvitation.findFirst({
    where: { projectId: data.projectId, recipientId: data.recipientId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) throw conflict("You've already invited them to this project. Give them time to respond.");
  const recentlyDeclined = await db.collaborationInvitation.count({
    where: {
      projectId: data.projectId,
      recipientId: data.recipientId,
      status: "DECLINED",
      respondedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    },
  });
  if (recentlyDeclined) throw conflict("They declined an invitation to this project recently. Please respect their decision.");

  const sender = await displayName(senderId);
  return db.$transaction(async (tx) => {
    const inv = await tx.collaborationInvitation.create({
      data: { projectId: data.projectId, roleId: role?.id ?? null, senderId, recipientId: data.recipientId, message: data.message },
      select: { id: true },
    });
    await notify(
      data.recipientId,
      {
        type: "INVITATION_RECEIVED",
        title: `${sender} invited you to join ${project.title}`,
        body: role ? `Role: ${role.title}` : "",
        link: "/requests",
      },
      tx,
    );
    return inv;
  });
}

export async function respondToInvitation(userId: string, invitationId: string, accept: boolean) {
  const inv = await db.collaborationInvitation.findUnique({
    where: { id: invitationId },
    include: { project: { select: { id: true, title: true, slug: true, status: true } }, role: true },
  });
  if (!inv || inv.recipientId !== userId) throw notFound("That invitation doesn't exist.");
  if (inv.status !== "PENDING") throw invalid("This invitation has already been answered.");
  if (accept && inv.project.status !== "ACTIVE") throw invalid("This project has been archived.");
  const name = await displayName(userId);

  await db.$transaction(async (tx) => {
    // Guarded update prevents double-accepting in concurrent requests.
    const updated = await tx.collaborationInvitation.updateMany({
      where: { id: invitationId, status: "PENDING" },
      data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
    });
    if (updated.count === 0) throw invalid("This invitation has already been answered.");
    if (accept) {
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: inv.projectId, userId } },
        create: { projectId: inv.projectId, userId, role: "MEMBER", title: inv.role?.title ?? "" },
        update: {},
      });
      if (inv.roleId) await tx.projectRole.update({ where: { id: inv.roleId }, data: { isOpen: false } });
      await tx.activityEvent.create({ data: { projectId: inv.projectId, actorId: userId, type: "MEMBER_JOINED", detail: inv.role?.title ?? "" } });
      // Any application from the same person is now moot.
      await tx.projectApplication.updateMany({
        where: { projectId: inv.projectId, applicantId: userId, status: "PENDING" },
        data: { status: "ACCEPTED", reviewedAt: new Date() },
      });
    }
    await notify(
      inv.senderId,
      {
        type: accept ? "INVITATION_ACCEPTED" : "INVITATION_DECLINED",
        title: accept ? `${name} joined ${inv.project.title}` : `${name} declined your invitation to ${inv.project.title}`,
        link: `/projects/${inv.project.slug}`,
      },
      tx,
    );
  });
  return { slug: inv.project.slug };
}

export async function cancelInvitation(userId: string, invitationId: string) {
  const inv = await db.collaborationInvitation.findUnique({ where: { id: invitationId } });
  if (!inv) throw notFound("That invitation doesn't exist.");
  const membership = await getMembership(inv.projectId, userId);
  if (inv.senderId !== userId && !canManage(membership?.role)) throw forbidden();
  if (inv.status !== "PENDING") throw invalid("This invitation has already been answered.");
  await db.collaborationInvitation.update({ where: { id: invitationId }, data: { status: "CANCELLED", respondedAt: new Date() } });
}

// ─────────────────────────── Applications ───────────────────────────

export async function applyToProject(userId: string, data: z.output<typeof applicationSchema>) {
  const project = await db.project.findFirst({
    where: { AND: [{ id: data.projectId }, visibleProjectWhere(userId)] },
    select: { id: true, title: true, slug: true, status: true, ownerId: true },
  });
  if (!project) throw notFound("That project doesn't exist.");
  if (project.status !== "ACTIVE") throw invalid("This project isn't accepting applications.");
  if (await getMembership(project.id, userId)) throw conflict("You're already on this team.");
  if (await isBlockedBetween(userId, project.ownerId)) throw notFound("That project doesn't exist.");
  const role = await assertRole(project.id, data.roleId);
  const pending = await db.projectApplication.findFirst({
    where: { projectId: project.id, applicantId: userId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) throw conflict("You've already applied. The team will get back to you.");

  const managers = await db.projectMember.findMany({
    where: { projectId: project.id, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });
  const name = await displayName(userId);
  return db.$transaction(async (tx) => {
    const app = await tx.projectApplication.create({
      data: { projectId: project.id, roleId: role?.id ?? null, applicantId: userId, message: data.message },
      select: { id: true },
    });
    for (const m of managers) {
      await notify(
        m.userId,
        {
          type: "APPLICATION_RECEIVED",
          title: `${name} applied to join ${project.title}`,
          body: role ? `For: ${role.title}` : "",
          link: "/requests?tab=incoming",
        },
        tx,
      );
    }
    return app;
  });
}

export async function reviewApplication(reviewerId: string, applicationId: string, accept: boolean) {
  const app = await db.projectApplication.findUnique({
    where: { id: applicationId },
    include: { project: { select: { id: true, title: true, slug: true, status: true } }, role: true },
  });
  if (!app) throw notFound("That application doesn't exist.");
  await requireProjectRole(app.projectId, reviewerId, "MANAGER");
  if (app.status !== "PENDING") throw invalid("This application has already been reviewed.");
  if (accept && app.project.status !== "ACTIVE") throw invalid("This project has been archived.");

  await db.$transaction(async (tx) => {
    const updated = await tx.projectApplication.updateMany({
      where: { id: applicationId, status: "PENDING" },
      data: { status: accept ? "ACCEPTED" : "DECLINED", reviewedById: reviewerId, reviewedAt: new Date() },
    });
    if (updated.count === 0) throw invalid("This application has already been reviewed.");
    if (accept) {
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: app.projectId, userId: app.applicantId } },
        create: { projectId: app.projectId, userId: app.applicantId, role: "MEMBER", title: app.role?.title ?? "" },
        update: {},
      });
      if (app.roleId && app.role?.isOpen) await tx.projectRole.update({ where: { id: app.roleId }, data: { isOpen: false } });
      await tx.activityEvent.create({ data: { projectId: app.projectId, actorId: app.applicantId, type: "MEMBER_JOINED", detail: app.role?.title ?? "" } });
      await tx.collaborationInvitation.updateMany({
        where: { projectId: app.projectId, recipientId: app.applicantId, status: "PENDING" },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
    }
    await notify(
      app.applicantId,
      {
        type: accept ? "APPLICATION_ACCEPTED" : "APPLICATION_DECLINED",
        title: accept ? `You're in! Welcome to ${app.project.title}` : `${app.project.title} isn't moving forward with your application`,
        body: accept ? "" : "Thanks for applying — keep exploring, there are plenty of teams looking for help.",
        link: `/projects/${app.project.slug}`,
      },
      tx,
    );
  });
}

export async function withdrawApplication(userId: string, applicationId: string) {
  const app = await db.projectApplication.findUnique({ where: { id: applicationId } });
  if (!app || app.applicantId !== userId) throw notFound("That application doesn't exist.");
  if (app.status !== "PENDING") throw invalid("This application has already been reviewed.");
  await db.projectApplication.update({ where: { id: applicationId }, data: { status: "CANCELLED" } });
}

// ─────────────────────────── Inbox ───────────────────────────

const personSelect = {
  id: true,
  isDemo: true,
  profile: { select: { username: true, displayName: true, headline: true, avatarHue: true, avatarMime: true, avatarUpdatedAt: true } },
} as const;

export async function getRequestsInbox(userId: string) {
  const [received, sent, myApplications, incoming] = await Promise.all([
    db.collaborationInvitation.findMany({
      where: { recipientId: userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        sender: { select: personSelect },
        project: { select: { id: true, slug: true, title: true, tagline: true, category: true, stage: true } },
        role: { select: { title: true } },
      },
    }),
    db.collaborationInvitation.findMany({
      where: { senderId: userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        recipient: { select: personSelect },
        project: { select: { id: true, slug: true, title: true } },
        role: { select: { title: true } },
      },
    }),
    db.projectApplication.findMany({
      where: { applicantId: userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: { project: { select: { id: true, slug: true, title: true, tagline: true } }, role: { select: { title: true } } },
    }),
    db.projectApplication.findMany({
      where: { project: { members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        applicant: {
          select: {
            ...personSelect,
            skills: { take: 5, orderBy: { level: "desc" }, select: { level: true, skill: { select: { name: true } } } },
          },
        },
        project: { select: { id: true, slug: true, title: true } },
        role: { select: { title: true } },
      },
    }),
  ]);
  return { received, sent, myApplications, incoming };
}
