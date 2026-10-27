import "server-only";
import type { z } from "zod";
import { Prisma, type MemberRole, type ProjectCategory, type ProjectStage, type Commitment } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden, invalid, notFound } from "@/server/errors";
import { slugify } from "@/lib/utils";
import { STAGE_LABEL } from "@/lib/taxonomy";
import type {
  milestoneSchema,
  milestoneStatusSchema,
  memberUpdateSchema,
  peerFeedbackSchema,
  projectRoleSchema,
  projectSchema,
} from "@/lib/validation/project";
import { visibleProjectWhere } from "./privacy";
import { notify } from "./notifications";

const MAX_ACTIVE_OWNED = 12;
const MAX_CREATED_PER_DAY = 3;
const MAX_MILESTONES = 40;
const MAX_ROLES = 10;

// ─────────────────────────── Permissions ───────────────────────────

export async function getMembership(projectId: string, userId: string) {
  return db.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
}

export const canManage = (role: MemberRole | undefined | null) => role === "OWNER" || role === "ADMIN";

/** Loads the project and the caller's membership, enforcing a minimum role. */
export async function requireProjectRole(projectId: string, userId: string, minimum: "MEMBER" | "MANAGER" | "OWNER") {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("That project doesn't exist.");
  const membership = await getMembership(projectId, userId);
  const ok =
    minimum === "MEMBER" ? Boolean(membership) : minimum === "MANAGER" ? canManage(membership?.role) : membership?.role === "OWNER";
  if (!ok) {
    throw forbidden(
      minimum === "OWNER"
        ? "Only the project owner can do that."
        : minimum === "MANAGER"
          ? "Only the project owner and admins can do that."
          : "Only team members can do that.",
    );
  }
  return { project, membership: membership! };
}

async function logActivity(
  tx: Prisma.TransactionClient | typeof db,
  projectId: string,
  actorId: string,
  type: Prisma.ActivityEventCreateManyInput["type"],
  detail = "",
) {
  await tx.activityEvent.create({ data: { projectId, actorId, type, detail: detail.slice(0, 200) } });
}

async function assertSkills(ids: string[]) {
  if (!ids.length) return;
  const count = await db.skill.count({ where: { id: { in: ids } } });
  if (count !== new Set(ids).size) throw invalid("One or more selected skills no longer exist.");
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "project";
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${Math.floor(100 + Math.random() * 900)}`;
    if (!(await db.project.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ─────────────────────────── Projects ───────────────────────────

type ProjectData = z.output<typeof projectSchema>;

export async function createProject(userId: string, data: ProjectData) {
  const [activeOwned, recent] = await Promise.all([
    db.project.count({ where: { ownerId: userId, status: "ACTIVE" } }),
    db.project.count({ where: { ownerId: userId, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } }),
  ]);
  if (activeOwned >= MAX_ACTIVE_OWNED) {
    throw new AppError("VALIDATION", `You already lead ${MAX_ACTIVE_OWNED} active projects. Archive one before starting another.`);
  }
  if (recent >= MAX_CREATED_PER_DAY) {
    throw new AppError("RATE_LIMITED", "You've started several projects today. Give them some momentum first, then try again tomorrow.");
  }
  await assertSkills(data.skillIds);
  const { skillIds, ...fields } = data;
  const slug = await uniqueSlug(fields.title);
  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        ...fields,
        slug,
        ownerId: userId,
        completedAt: fields.stage === "COMPLETED" ? new Date() : null,
        skills: { connect: skillIds.map((id) => ({ id })) },
        members: { create: { userId, role: "OWNER", title: "Founder" } },
      },
      select: { id: true, slug: true },
    });
    await logActivity(tx, project.id, userId, "PROJECT_CREATED", fields.title);
    return project;
  });
}

export async function updateProject(userId: string, projectId: string, data: ProjectData) {
  const { project } = await requireProjectRole(projectId, userId, "MANAGER");
  if (project.status === "ARCHIVED") throw invalid("Restore this project before editing it.");
  await assertSkills(data.skillIds);
  const { skillIds, ...fields } = data;
  const stageChanged = project.stage !== fields.stage;
  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        ...fields,
        skills: { set: skillIds.map((id) => ({ id })) },
        ...(stageChanged
          ? { stageChangedAt: new Date(), completedAt: fields.stage === "COMPLETED" ? new Date() : null }
          : {}),
      },
    });
    if (stageChanged) await logActivity(tx, projectId, userId, "STAGE_CHANGED", STAGE_LABEL[fields.stage]);
    else await logActivity(tx, projectId, userId, "PROJECT_UPDATED");
  });
}

/** Applies reviewed AI copilot suggestions to an allow-listed set of text fields. */
export async function applyProjectTextEdits(
  userId: string,
  projectId: string,
  edits: Partial<Record<"tagline" | "description" | "goals" | "outcomes", string>>,
) {
  const { project } = await requireProjectRole(projectId, userId, "MANAGER");
  if (project.status === "ARCHIVED") throw invalid("Restore this project before editing it.");
  await db.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: edits });
    await logActivity(tx, projectId, userId, "PROJECT_UPDATED", "Applied mentor suggestions");
  });
}

export async function setArchived(userId: string, projectId: string, archived: boolean) {
  await requireProjectRole(projectId, userId, "OWNER");
  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { status: archived ? "ARCHIVED" : "ACTIVE", archivedAt: archived ? new Date() : null },
    });
    if (archived) {
      // Close the door on pending requests for archived projects.
      await tx.collaborationInvitation.updateMany({ where: { projectId, status: "PENDING" }, data: { status: "CANCELLED", respondedAt: new Date() } });
      await tx.projectApplication.updateMany({ where: { projectId, status: "PENDING" }, data: { status: "DECLINED", reviewedAt: new Date() } });
    }
  });
}

// ─────────────────────────── Roles ───────────────────────────

type RoleData = z.output<typeof projectRoleSchema>;

export async function createRole(userId: string, projectId: string, data: RoleData) {
  await requireProjectRole(projectId, userId, "MANAGER");
  if ((await db.projectRole.count({ where: { projectId } })) >= MAX_ROLES) throw invalid(`Projects can list up to ${MAX_ROLES} roles.`);
  await assertSkills(data.skillIds);
  const { skillIds, ...fields } = data;
  await db.$transaction(async (tx) => {
    await tx.projectRole.create({ data: { ...fields, projectId, skills: { connect: skillIds.map((id) => ({ id })) } } });
    await logActivity(tx, projectId, userId, "ROLE_OPENED", fields.title);
  });
}

async function ownRole(projectId: string, roleId: string) {
  const role = await db.projectRole.findFirst({ where: { id: roleId, projectId } });
  if (!role) throw notFound("That role doesn't exist.");
  return role;
}

export async function updateRole(userId: string, projectId: string, roleId: string, data: RoleData & { isOpen: boolean }) {
  await requireProjectRole(projectId, userId, "MANAGER");
  await ownRole(projectId, roleId);
  await assertSkills(data.skillIds);
  const { skillIds, ...fields } = data;
  await db.projectRole.update({ where: { id: roleId }, data: { ...fields, skills: { set: skillIds.map((id) => ({ id })) } } });
}

export async function deleteRole(userId: string, projectId: string, roleId: string) {
  await requireProjectRole(projectId, userId, "MANAGER");
  await ownRole(projectId, roleId);
  await db.projectRole.delete({ where: { id: roleId } });
}

// ─────────────────────────── Members ───────────────────────────

export async function updateMember(userId: string, projectId: string, memberId: string, data: z.output<typeof memberUpdateSchema>) {
  const { membership } = await requireProjectRole(projectId, userId, "MANAGER");
  const target = await db.projectMember.findFirst({ where: { id: memberId, projectId } });
  if (!target) throw notFound("That person isn't on this team.");
  if (target.role === "OWNER") {
    // Owners can edit their own title/responsibilities but their role is fixed.
    if (target.userId !== userId) throw forbidden("Only the owner can edit their own details.");
    await db.projectMember.update({ where: { id: memberId }, data: { title: data.title, responsibilities: data.responsibilities } });
    return;
  }
  if (data.role !== target.role && membership.role !== "OWNER") throw forbidden("Only the owner can change team roles.");
  await db.projectMember.update({ where: { id: memberId }, data });
}

export async function removeMember(userId: string, projectId: string, memberId: string) {
  const { membership } = await requireProjectRole(projectId, userId, "MANAGER");
  const target = await db.projectMember.findFirst({ where: { id: memberId, projectId } });
  if (!target) throw notFound("That person isn't on this team.");
  if (target.role === "OWNER") throw forbidden("The owner can't be removed.");
  if (target.role === "ADMIN" && membership.role !== "OWNER") throw forbidden("Only the owner can remove an admin.");
  if (target.userId === userId) throw invalid("Use “Leave project” to remove yourself.");
  await db.$transaction([
    db.projectMember.delete({ where: { id: memberId } }),
    db.projectMilestone.updateMany({ where: { projectId, assigneeId: target.userId, status: { not: "DONE" } }, data: { assigneeId: null } }),
  ]);
}

export async function leaveProject(userId: string, projectId: string) {
  const { membership } = await requireProjectRole(projectId, userId, "MEMBER");
  if (membership.role === "OWNER") throw invalid("Owners can't leave their own project. Archive it instead.");
  await db.$transaction([
    db.projectMember.delete({ where: { id: membership.id } }),
    db.projectMilestone.updateMany({ where: { projectId, assigneeId: userId, status: { not: "DONE" } }, data: { assigneeId: null } }),
  ]);
}

// ─────────────────────────── Milestones ───────────────────────────

type MilestoneData = z.output<typeof milestoneSchema>;

async function assertAssignee(projectId: string, assigneeId: string | null) {
  if (!assigneeId) return;
  if (!(await getMembership(projectId, assigneeId))) throw invalid("Milestones can only be assigned to team members.");
}

export async function createMilestone(userId: string, projectId: string, data: MilestoneData) {
  const { project } = await requireProjectRole(projectId, userId, "MEMBER");
  if (project.status === "ARCHIVED") throw invalid("This project is archived.");
  if ((await db.projectMilestone.count({ where: { projectId } })) >= MAX_MILESTONES) throw invalid(`Projects can track up to ${MAX_MILESTONES} milestones.`);
  await assertAssignee(projectId, data.assigneeId);
  const last = await db.projectMilestone.aggregate({ where: { projectId }, _max: { position: true } });
  await db.$transaction(async (tx) => {
    await tx.projectMilestone.create({ data: { ...data, projectId, position: (last._max.position ?? -1) + 1 } });
    await logActivity(tx, projectId, userId, "MILESTONE_ADDED", data.title);
  });
}

export async function updateMilestone(userId: string, projectId: string, milestoneId: string, data: MilestoneData) {
  await requireProjectRole(projectId, userId, "MEMBER");
  const ms = await db.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
  if (!ms) throw notFound("That milestone doesn't exist.");
  await assertAssignee(projectId, data.assigneeId);
  await db.projectMilestone.update({ where: { id: milestoneId }, data });
}

export async function setMilestoneStatus(
  userId: string,
  projectId: string,
  milestoneId: string,
  status: z.output<typeof milestoneStatusSchema>,
) {
  await requireProjectRole(projectId, userId, "MEMBER");
  const ms = await db.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
  if (!ms) throw notFound("That milestone doesn't exist.");
  if (ms.status === status) return;
  await db.$transaction(async (tx) => {
    await tx.projectMilestone.update({
      where: { id: milestoneId },
      data: { status, completedAt: status === "DONE" ? new Date() : null },
    });
    if (status === "DONE") {
      await logActivity(tx, projectId, userId, "MILESTONE_COMPLETED", ms.title);
      if (ms.assigneeId && ms.assigneeId !== userId) {
        await notify(ms.assigneeId, { type: "MILESTONE_COMPLETED", title: `“${ms.title}” was marked done`, link: `/projects/${(await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { slug: true } })).slug}` }, tx);
      }
    }
  });
}

export async function deleteMilestone(userId: string, projectId: string, milestoneId: string) {
  await requireProjectRole(projectId, userId, "MANAGER");
  const ms = await db.projectMilestone.findFirst({ where: { id: milestoneId, projectId }, select: { id: true } });
  if (!ms) throw notFound("That milestone doesn't exist.");
  await db.projectMilestone.delete({ where: { id: milestoneId } });
}

// ─────────────────────────── Peer feedback ───────────────────────────

export async function leaveFeedback(authorId: string, data: z.output<typeof peerFeedbackSchema>) {
  if (authorId === data.subjectId) throw invalid("You can't leave feedback for yourself.");
  const [author, subject] = await Promise.all([getMembership(data.projectId, authorId), getMembership(data.projectId, data.subjectId)]);
  if (!author || !subject) throw forbidden("Feedback can only be left between members of the same project.");
  await db.peerFeedback.upsert({
    where: { projectId_authorId_subjectId: { projectId: data.projectId, authorId, subjectId: data.subjectId } },
    create: { ...data, authorId },
    update: { contribution: data.contribution, reliability: data.reliability, note: data.note, createdAt: new Date() },
  });
  const project = await db.project.findUniqueOrThrow({ where: { id: data.projectId }, select: { slug: true, title: true } });
  await notify(data.subjectId, {
    type: "FEEDBACK_RECEIVED",
    title: `A teammate left feedback on your work in ${project.title}`,
    body: "Peer feedback is private and contributes to your ranking.",
    link: `/projects/${project.slug}`,
  });
}

// ─────────────────────────── Queries ───────────────────────────

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  tagline: true,
  category: true,
  stage: true,
  status: true,
  commitment: true,
  updatedAt: true,
  createdAt: true,
  skills: { select: { id: true, name: true }, take: 6 },
  roles: { where: { isOpen: true }, select: { id: true, title: true } },
  members: {
    take: 5,
    orderBy: { joinedAt: "asc" },
    select: {
      user: { select: { id: true, profile: { select: { displayName: true, avatarHue: true, avatarMime: true, avatarUpdatedAt: true } } } },
    },
  },
  _count: { select: { members: true, milestones: true } },
} satisfies Prisma.ProjectSelect;

export type ProjectCard = Prisma.ProjectGetPayload<{ select: typeof cardSelect }>;

export type ProjectFilters = {
  q?: string;
  category?: ProjectCategory;
  stage?: ProjectStage;
  skillIds?: string[];
  commitment?: Commitment;
  openRoles?: boolean;
  sort?: "recent" | "new" | "advanced";
  page?: number;
  pageSize?: number;
};

export async function listProjects(viewerId: string | null, f: ProjectFilters) {
  const pageSize = f.pageSize ?? 12;
  const page = Math.max(1, f.page ?? 1);
  const q = f.q?.trim();
  const where: Prisma.ProjectWhereInput = {
    AND: [
      visibleProjectWhere(viewerId),
      { status: "ACTIVE" },
      f.category ? { category: f.category } : {},
      f.stage ? { stage: f.stage } : {},
      f.commitment ? { commitment: f.commitment } : {},
      f.openRoles ? { roles: { some: { isOpen: true } } } : {},
      f.skillIds?.length ? { skills: { some: { id: { in: f.skillIds } } } } : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { tagline: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { skills: { some: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {},
    ],
  };
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    f.sort === "new" ? [{ createdAt: "desc" }] : f.sort === "advanced" ? [{ stage: "desc" }, { updatedAt: "desc" }] : [{ updatedAt: "desc" }];
  const [total, items] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, select: cardSelect }),
  ]);
  return { total, items, page, pageSize };
}

export async function listMyProjects(userId: string) {
  return db.project.findMany({
    where: { members: { some: { userId } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: { ...cardSelect, members: { ...cardSelect.members }, ownerId: true },
  });
}

/** Projects the user manages that can receive invitations, with open roles. */
export async function getInviteOptions(userId: string) {
  return db.project.findMany({
    where: { status: "ACTIVE", members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, roles: { where: { isOpen: true }, select: { id: true, title: true } } },
  });
}

export async function getProjectPage(slug: string, viewerId: string | null) {
  const project = await db.project.findFirst({
    where: { AND: [{ slug }, visibleProjectWhere(viewerId)] },
    include: {
      owner: { select: { id: true, isDemo: true } },
      skills: { select: { id: true, name: true } },
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              isDemo: true,
              profile: { select: { username: true, displayName: true, headline: true, avatarHue: true, avatarMime: true, avatarUpdatedAt: true } },
            },
          },
        },
      },
      roles: { orderBy: [{ isOpen: "desc" }, { createdAt: "asc" }], include: { skills: { select: { id: true, name: true } } } },
      milestones: {
        orderBy: [{ position: "asc" }],
        include: { assignee: { select: { id: true, profile: { select: { displayName: true, username: true } } } } },
      },
      activity: {
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { actor: { select: { profile: { select: { displayName: true, username: true } } } } },
      },
    },
  });
  if (!project) return null;
  // Archived projects stay visible to their own team only.
  const membership = viewerId ? project.members.find((m) => m.userId === viewerId) ?? null : null;
  if (project.status === "ARCHIVED" && !membership) return null;
  const isManager = canManage(membership?.role);

  const [pendingApplication, pendingInvitation, incomingApplications, outgoingInvitations, myFeedback] = await Promise.all([
    viewerId && !membership
      ? db.projectApplication.findFirst({ where: { projectId: project.id, applicantId: viewerId, status: "PENDING" }, select: { id: true, createdAt: true } })
      : null,
    viewerId && !membership
      ? db.collaborationInvitation.findFirst({ where: { projectId: project.id, recipientId: viewerId, status: "PENDING" }, select: { id: true } })
      : null,
    isManager
      ? db.projectApplication.count({ where: { projectId: project.id, status: "PENDING" } })
      : 0,
    isManager
      ? db.collaborationInvitation.count({ where: { projectId: project.id, status: "PENDING" } })
      : 0,
    membership
      ? db.peerFeedback.findMany({ where: { projectId: project.id, authorId: viewerId! }, select: { subjectId: true, contribution: true, reliability: true } })
      : [],
  ]);

  return {
    project,
    membership,
    isManager,
    isOwner: membership?.role === "OWNER",
    pendingApplication,
    pendingInvitation,
    pendingCounts: { applications: incomingApplications, invitations: outgoingInvitations },
    myFeedback,
  };
}

export type ProjectPageData = NonNullable<Awaited<ReturnType<typeof getProjectPage>>>;

/** For the edit form: only managers. */
export async function getProjectForEdit(slug: string, userId: string) {
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      skills: { select: { id: true } },
      roles: { orderBy: { createdAt: "asc" }, include: { skills: { select: { id: true } } } },
    },
  });
  if (!project) return null;
  const membership = await getMembership(project.id, userId);
  if (!canManage(membership?.role)) return null;
  return { project, isOwner: membership?.role === "OWNER" };
}

export function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
