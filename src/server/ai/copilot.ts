import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden, invalid, notFound } from "@/server/errors";
import { COPILOT_FIELD_LIMITS, copilotOutputSchema, type CopilotOutput } from "@/lib/ai-schemas";
import { CATEGORY_LABEL, MILESTONE_STATUS_LABEL, STAGE_LABEL } from "@/lib/taxonomy";
import { applyProjectTextEdits, canManage, getMembership } from "@/server/services/projects";
import { untrusted } from "./guard";
import { copilotSystem } from "./prompts";
import { runStructured } from "./run";
import type { AIMessage } from "./types";

const MAX_CONVERSATIONS = 50;
const HISTORY_MESSAGES = 20;
const HISTORY_CHARS = 24_000;

export type ProposedEdit = CopilotOutput["proposedEdits"][number];

async function ownConversation(userId: string, conversationId: string) {
  const c = await db.aIConversation.findFirst({ where: { id: conversationId, userId } });
  if (!c) throw notFound("That conversation doesn't exist.");
  return c;
}

export async function createConversation(userId: string, projectId: string | null) {
  if (projectId && !(await getMembership(projectId, userId))) throw forbidden("You can only use Copilot on projects you're a member of.");
  const count = await db.aIConversation.count({ where: { userId } });
  if (count >= MAX_CONVERSATIONS) throw invalid(`You have ${MAX_CONVERSATIONS} conversations. Delete an old one to start another.`);
  const project = projectId ? await db.project.findUnique({ where: { id: projectId }, select: { title: true } }) : null;
  return db.aIConversation.create({
    data: { userId, projectId, title: project ? `${project.title}` : "New conversation" },
    select: { id: true },
  });
}

export async function listConversations(userId: string) {
  return db.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, updatedAt: true, project: { select: { title: true, slug: true } }, _count: { select: { messages: true } } },
  });
}

export async function getConversation(userId: string, conversationId: string) {
  const c = await db.aIConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      project: { select: { id: true, slug: true, title: true, tagline: true, description: true, goals: true, outcomes: true, status: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) return null;
  const membership = c.projectId ? await getMembership(c.projectId, userId) : null;
  return { ...c, canEdit: canManage(membership?.role) && c.project?.status === "ACTIVE", isMember: Boolean(membership) };
}

async function projectContext(projectId: string) {
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      skills: { select: { name: true } },
      members: { select: { title: true, role: true } },
      roles: { where: { isOpen: true }, select: { title: true } },
      milestones: { orderBy: { position: "asc" }, select: { title: true, status: true, dueDate: true } },
    },
  });
  if (!p) return "";
  return [
    `Title: ${p.title}`,
    `Tagline: ${p.tagline}`,
    `Category: ${CATEGORY_LABEL[p.category]} · Stage: ${STAGE_LABEL[p.stage]}`,
    `Description:\n${p.description}`,
    `Goals:\n${p.goals || "(none)"}`,
    `Outcomes:\n${p.outcomes || "(none)"}`,
    `Skills: ${p.skills.map((s) => s.name).join(", ")}`,
    `Team roles: ${p.members.map((m) => m.title || m.role.toLowerCase()).join(", ")}`,
    `Open roles: ${p.roles.map((r) => r.title).join(", ") || "none"}`,
    `Milestones: ${p.milestones.map((m) => `${m.title} [${MILESTONE_STATUS_LABEL[m.status]}${m.dueDate ? `, due ${m.dueDate.toISOString().slice(0, 10)}` : ""}]`).join("; ") || "none"}`,
  ].join("\n\n");
}

/** Keeps the most recent turns within a character budget (rough token control). */
export function trimHistory(messages: { role: "USER" | "ASSISTANT"; content: string }[]): AIMessage[] {
  const recent = messages.slice(-HISTORY_MESSAGES);
  const out: AIMessage[] = [];
  let chars = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i]!;
    chars += m.content.length;
    if (chars > HISTORY_CHARS && out.length > 0) break;
    out.unshift({ role: m.role === "USER" ? "user" : "assistant", content: m.content });
  }
  // Conversations must start with a user turn.
  while (out.length && out[0]!.role !== "user") out.shift();
  return out;
}

/** Validates proposed edits against the allow-list and field length limits. */
export function filterProposedEdits(edits: ProposedEdit[], allowed: boolean): ProposedEdit[] {
  if (!allowed) return [];
  const seen = new Set<string>();
  return edits.filter((e) => {
    const limits = COPILOT_FIELD_LIMITS[e.field];
    if (!limits || seen.has(e.field)) return false;
    const len = e.value.trim().length;
    if (len < limits[0] || len > limits[1]) return false;
    seen.add(e.field);
    return true;
  });
}

export async function sendMessage(userId: string, conversationId: string, message: string) {
  const conversation = await ownConversation(userId, conversationId);
  const membership = conversation.projectId ? await getMembership(conversation.projectId, userId) : null;
  if (conversation.projectId && !membership) throw forbidden("You're no longer a member of this project.");
  const canEdit = canManage(membership?.role);

  const history = await db.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // Persist the user's message first so it's never lost, even if the model call fails.
  const userMsg = await db.aIMessage.create({ data: { conversationId, role: "USER", content: message } });

  const context = conversation.projectId ? await projectContext(conversation.projectId) : "";
  const turns = trimHistory([...history, { role: "USER", content: message }]);
  // The project snapshot is attached to the latest user turn as untrusted data.
  const last = turns[turns.length - 1]!;
  last.content = `${context ? `Current project data:\n${untrusted("project", context, 9000)}\n\n` : ""}User message:\n${untrusted("user_message", message, 4000)}`;

  try {
    const { data } = await runStructured({
      userId,
      tool: "COPILOT",
      system: copilotSystem({ hasProject: Boolean(conversation.projectId), canEdit }),
      messages: turns,
      schema: copilotOutputSchema,
      maxTokens: 12000,
    });
    const edits = filterProposedEdits(data.proposedEdits, canEdit && Boolean(conversation.projectId));
    const assistant = await db.aIMessage.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: data.reply.slice(0, 12000),
        proposedEdits: edits.length ? (edits as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
    await db.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date(), ...(history.length === 0 && !conversation.projectId ? { title: message.slice(0, 60) } : {}) },
    });
    return { userMessageId: userMsg.id, assistantMessageId: assistant.id };
  } catch (err) {
    // Roll back the unanswered user message so history stays consistent.
    await db.aIMessage.delete({ where: { id: userMsg.id } }).catch(() => undefined);
    throw err;
  }
}

/** Applies user-selected proposed edits after explicit confirmation. */
export async function applyEdits(userId: string, messageId: string, fields: string[]) {
  const msg = await db.aIMessage.findUnique({ where: { id: messageId }, include: { conversation: true } });
  if (!msg || msg.conversation.userId !== userId) throw notFound("That suggestion doesn't exist.");
  if (!msg.conversation.projectId) throw invalid("This conversation isn't linked to a project.");
  if (msg.editsResolvedAt) throw invalid("These suggestions were already applied or dismissed.");
  const proposals = filterProposedEdits((msg.proposedEdits as unknown as ProposedEdit[] | null) ?? [], true);
  const chosen = proposals.filter((p) => fields.includes(p.field));
  if (chosen.length === 0) throw invalid("Choose at least one suggestion to apply.");
  // Authorization is enforced again here (role may have changed since the suggestion).
  await applyProjectTextEdits(userId, msg.conversation.projectId, Object.fromEntries(chosen.map((c) => [c.field, c.value.trim()])));
  await db.aIMessage.update({ where: { id: messageId }, data: { editsResolvedAt: new Date() } });
  return { applied: chosen.map((c) => c.field) };
}

export async function dismissEdits(userId: string, messageId: string) {
  const msg = await db.aIMessage.findUnique({ where: { id: messageId }, include: { conversation: { select: { userId: true } } } });
  if (!msg || msg.conversation.userId !== userId) throw notFound("That suggestion doesn't exist.");
  await db.aIMessage.update({ where: { id: messageId }, data: { editsResolvedAt: new Date() } });
}

export async function clearConversation(userId: string, conversationId: string) {
  await ownConversation(userId, conversationId);
  await db.aIMessage.deleteMany({ where: { conversationId } });
}

export async function deleteConversation(userId: string, conversationId: string) {
  await ownConversation(userId, conversationId);
  await db.aIConversation.delete({ where: { id: conversationId } });
}

export { AppError };
