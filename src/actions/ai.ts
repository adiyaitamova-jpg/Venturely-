"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authedAction, parseInput } from "@/server/action";
import { copilotMessageSchema, evaluateRequestSchema, matchRequestSchema } from "@/lib/ai-schemas";
import { matchTeammates } from "@/server/ai/matcher";
import { evaluateProject } from "@/server/ai/evaluator";
import * as copilot from "@/server/ai/copilot";

const id = z.string().min(1).max(64);

export async function matchTeammatesAction(values: unknown) {
  return authedAction(async (user) => {
    const result = await matchTeammates(user.id, parseInput(matchRequestSchema, values));
    revalidatePath("/mentor");
    return { runId: result.runId };
  });
}

export async function evaluateProjectAction(values: unknown) {
  return authedAction(async (user) => {
    const result = await evaluateProject(user.id, parseInput(evaluateRequestSchema, values));
    revalidatePath("/mentor");
    return result;
  });
}

export async function createConversationAction(projectId: unknown) {
  const result = await authedAction(async (user) => {
    const pid = projectId ? parseInput(id, projectId) : null;
    return copilot.createConversation(user.id, pid);
  });
  if (result.ok) redirect(`/mentor/copilot/${result.data.id}`);
  return result;
}

export async function sendCopilotMessageAction(values: unknown) {
  return authedAction(async (user) => {
    const { conversationId, message } = parseInput(copilotMessageSchema, values);
    const res = await copilot.sendMessage(user.id, conversationId, message);
    revalidatePath(`/mentor/copilot/${conversationId}`);
    return res;
  });
}

export async function applyCopilotEditsAction(messageId: unknown, fields: unknown) {
  return authedAction(async (user) => {
    const f = parseInput(z.array(z.enum(["tagline", "description", "goals", "outcomes"])).min(1).max(4), fields);
    const res = await copilot.applyEdits(user.id, parseInput(id, messageId), f);
    revalidatePath("/", "layout");
    return res;
  });
}

export async function dismissCopilotEditsAction(messageId: unknown) {
  return authedAction(async (user) => {
    await copilot.dismissEdits(user.id, parseInput(id, messageId));
    return null;
  });
}

export async function clearConversationAction(conversationId: unknown) {
  return authedAction(async (user) => {
    const cid = parseInput(id, conversationId);
    await copilot.clearConversation(user.id, cid);
    revalidatePath(`/mentor/copilot/${cid}`);
    return null;
  });
}

export async function deleteConversationAction(conversationId: unknown) {
  const result = await authedAction(async (user) => {
    await copilot.deleteConversation(user.id, parseInput(id, conversationId));
    return null;
  });
  if (result.ok) redirect("/mentor/copilot");
  return result;
}
