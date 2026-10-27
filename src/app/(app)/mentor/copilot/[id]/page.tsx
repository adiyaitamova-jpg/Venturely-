import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { isAIConfigured } from "@/server/ai/config";
import { getConversation, type ProposedEdit } from "@/server/ai/copilot";
import { ChatInterface } from "./chat-interface";

export const metadata: Metadata = { title: "Copilot" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/mentor/copilot/${id}`);
  const c = await getConversation(user.id, id.slice(0, 64));
  if (!c) notFound();
  return (
    <ChatInterface
      key={c.id}
      conversationId={c.id}
      title={c.title}
      aiConfigured={isAIConfigured()}
      project={c.project && c.isMember ? { id: c.project.id, slug: c.project.slug, title: c.project.title, fields: { tagline: c.project.tagline, description: c.project.description, goals: c.project.goals, outcomes: c.project.outcomes } } : null}
      canEdit={c.canEdit}
      messages={c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        proposedEdits: (m.proposedEdits as unknown as ProposedEdit[] | null) ?? [],
        editsResolved: Boolean(m.editsResolvedAt),
      }))}
    />
  );
}
