import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { isAIConfigured } from "@/server/ai/config";
import { listConversations } from "@/server/ai/copilot";
import { db } from "@/server/db";
import { AIStatus } from "@/components/ai/ai-status";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";
import { NewConversation } from "./new-conversation";

export const metadata: Metadata = { title: "Project Copilot" };

export default async function CopilotIndex({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requireUser("/mentor/copilot");
  const { project } = await searchParams;
  const [conversations, projects] = await Promise.all([
    listConversations(user.id),
    db.project.findMany({ where: { status: "ACTIVE", members: { some: { userId: user.id } } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="conv-heading">
        <h2 id="conv-heading" className="mb-3 text-lg font-semibold tracking-[-0.015em]">
          Your conversations
        </h2>
        {conversations.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No conversations yet" description="Start one to scope your project, plan milestones or tighten your pitch." />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/mentor/copilot/${c.id}`} className="block px-4 py-3.5 transition-colors hover:bg-paper/60">
                  <p className="font-medium text-ink">{c.title}</p>
                  <p className="text-xs text-muted">
                    {c.project ? `Project: ${c.project.title}` : "General"} · {c._count.messages} messages · {timeAgo(c.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="space-y-4">
        <AIStatus userId={user.id} />
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <h2 className="mb-4 font-semibold">New conversation</h2>
          <NewConversation projects={projects} defaultProjectId={projects.find((p) => p.id === project)?.id} disabled={!isAIConfigured()} />
        </div>
      </aside>
    </div>
  );
}
