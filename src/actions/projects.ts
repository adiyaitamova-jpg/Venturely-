"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authedAction, parseInput } from "@/server/action";
import { enforceRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import * as projects from "@/server/services/projects";
import * as collab from "@/server/services/collaboration";
import {
  applicationSchema,
  invitationSchema,
  memberUpdateSchema,
  milestoneSchema,
  milestoneStatusSchema,
  peerFeedbackSchema,
  projectRoleSchema,
  projectSchema,
} from "@/lib/validation/project";

const id = z.string().min(1).max(64);

function refresh(slug?: string) {
  revalidatePath("/projects");
  if (slug) revalidatePath(`/projects/${slug}`);
  revalidatePath("/dashboard");
}

export async function createProjectAction(values: unknown) {
  const result = await authedAction(async (user) => {
    const data = parseInput(projectSchema, values);
    return projects.createProject(user.id, data);
  });
  if (result.ok) {
    refresh();
    redirect(`/projects/${result.data.slug}?created=1`);
  }
  return result;
}

export async function updateProjectAction(projectId: unknown, values: unknown) {
  return authedAction(async (user) => {
    const pid = parseInput(id, projectId);
    await projects.updateProject(user.id, pid, parseInput(projectSchema, values));
    refresh();
    return null;
  });
}

export async function setArchivedAction(projectId: unknown, archived: unknown) {
  return authedAction(async (user) => {
    await projects.setArchived(user.id, parseInput(id, projectId), parseInput(z.boolean(), archived));
    refresh();
    return null;
  });
}

// Roles
export async function createRoleAction(projectId: unknown, values: unknown) {
  return authedAction(async (user) => {
    await projects.createRole(user.id, parseInput(id, projectId), parseInput(projectRoleSchema, values));
    refresh();
    return null;
  });
}

export async function updateRoleAction(projectId: unknown, roleId: unknown, values: unknown) {
  return authedAction(async (user) => {
    const data = parseInput(projectRoleSchema.extend({ isOpen: z.boolean() }), values);
    await projects.updateRole(user.id, parseInput(id, projectId), parseInput(id, roleId), data);
    refresh();
    return null;
  });
}

export async function deleteRoleAction(projectId: unknown, roleId: unknown) {
  return authedAction(async (user) => {
    await projects.deleteRole(user.id, parseInput(id, projectId), parseInput(id, roleId));
    refresh();
    return null;
  });
}

// Members
export async function updateMemberAction(projectId: unknown, memberId: unknown, values: unknown) {
  return authedAction(async (user) => {
    await projects.updateMember(user.id, parseInput(id, projectId), parseInput(id, memberId), parseInput(memberUpdateSchema, values));
    refresh();
    return null;
  });
}

export async function removeMemberAction(projectId: unknown, memberId: unknown) {
  return authedAction(async (user) => {
    await projects.removeMember(user.id, parseInput(id, projectId), parseInput(id, memberId));
    refresh();
    return null;
  });
}

export async function leaveProjectAction(projectId: unknown) {
  return authedAction(async (user) => {
    await projects.leaveProject(user.id, parseInput(id, projectId));
    refresh();
    return null;
  });
}

// Milestones
export async function createMilestoneAction(projectId: unknown, values: unknown) {
  return authedAction(async (user) => {
    await projects.createMilestone(user.id, parseInput(id, projectId), parseInput(milestoneSchema, values));
    refresh();
    return null;
  });
}

export async function updateMilestoneAction(projectId: unknown, milestoneId: unknown, values: unknown) {
  return authedAction(async (user) => {
    await projects.updateMilestone(user.id, parseInput(id, projectId), parseInput(id, milestoneId), parseInput(milestoneSchema, values));
    refresh();
    return null;
  });
}

export async function setMilestoneStatusAction(projectId: unknown, milestoneId: unknown, status: unknown) {
  return authedAction(async (user) => {
    await projects.setMilestoneStatus(user.id, parseInput(id, projectId), parseInput(id, milestoneId), parseInput(milestoneStatusSchema, status));
    refresh();
    return null;
  });
}

export async function deleteMilestoneAction(projectId: unknown, milestoneId: unknown) {
  return authedAction(async (user) => {
    await projects.deleteMilestone(user.id, parseInput(id, projectId), parseInput(id, milestoneId));
    refresh();
    return null;
  });
}

export async function leaveFeedbackAction(values: unknown) {
  return authedAction(async (user) => {
    await projects.leaveFeedback(user.id, parseInput(peerFeedbackSchema, values));
    return null;
  });
}

// Collaboration
export async function sendInvitationAction(values: unknown) {
  return authedAction(async (user) => {
    const data = parseInput(invitationSchema, values);
    await enforceRateLimit(`invite:${user.id}`, RATE_LIMITS.invitation, "You've sent a lot of invitations today. Try again tomorrow.");
    await collab.sendInvitation(user.id, data);
    revalidatePath("/requests");
    return null;
  });
}

export async function respondToInvitationAction(invitationId: unknown, accept: unknown) {
  return authedAction(async (user) => {
    const result = await collab.respondToInvitation(user.id, parseInput(id, invitationId), parseInput(z.boolean(), accept));
    revalidatePath("/", "layout");
    return result;
  });
}

export async function cancelInvitationAction(invitationId: unknown) {
  return authedAction(async (user) => {
    await collab.cancelInvitation(user.id, parseInput(id, invitationId));
    revalidatePath("/requests");
    return null;
  });
}

export async function applyToProjectAction(values: unknown) {
  return authedAction(async (user) => {
    const data = parseInput(applicationSchema, values);
    await enforceRateLimit(`apply:${user.id}`, RATE_LIMITS.application, "You've sent several applications today. Try again tomorrow.");
    await collab.applyToProject(user.id, data);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function reviewApplicationAction(applicationId: unknown, accept: unknown) {
  return authedAction(async (user) => {
    await collab.reviewApplication(user.id, parseInput(id, applicationId), parseInput(z.boolean(), accept));
    revalidatePath("/", "layout");
    return null;
  });
}

export async function withdrawApplicationAction(applicationId: unknown) {
  return authedAction(async (user) => {
    await collab.withdrawApplication(user.id, parseInput(id, applicationId));
    revalidatePath("/", "layout");
    return null;
  });
}
