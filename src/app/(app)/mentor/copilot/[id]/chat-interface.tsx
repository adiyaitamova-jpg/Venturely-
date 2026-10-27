"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ArrowUp, Eraser, FileDiff, Sparkles, Trash2 } from "lucide-react";
import { applyCopilotEditsAction, clearConversationAction, deleteConversationAction, dismissCopilotEditsAction, sendCopilotMessageAction } from "@/actions/ai";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";
import { Thinking } from "@/components/ai/thinking";
import { AdvisoryNote } from "@/components/ai/advisory-note";

type Field = "tagline" | "description" | "goals" | "outcomes";
type Edit = { field: Field; value: string; rationale: string };
type Message = { id: string; role: "USER" | "ASSISTANT"; content: string; createdAt: string; proposedEdits: Edit[]; editsResolved: boolean };

const FIELD_LABEL: Record<Field, string> = { tagline: "Tagline", description: "Description", goals: "Goals", outcomes: "Outcomes" };
const STARTERS_PROJECT = [
  "What's the riskiest assumption in this project, and how could we test it in a week?",
  "Break the next month into 4 concrete milestones with owners by role.",
  "Rewrite our tagline and description so a teacher understands it in 10 seconds.",
  "Which technologies would you choose for our next step, and what should we learn first?",
];
const STARTERS_GENERAL = [
  "Help me turn a vague idea into a project I can finish in 8 weeks.",
  "How do I find out whether people actually have the problem I want to solve?",
  "What makes a strong project write-up for a portfolio?",
];

/** Markdown from the model, rendered without raw HTML and with safe links. */
function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-ai">
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children: c }) => {
            const safe = href && /^https?:\/\//i.test(href) ? href : undefined;
            return safe ? (
              <a href={safe} target="_blank" rel="noopener noreferrer nofollow">
                {c}
              </a>
            ) : (
              <span>{c}</span>
            );
          },
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function EditReview({ message, current, onDone }: { message: Message; current: Record<Field, string>; onDone: () => void }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Field[]>(message.proposedEdits.map((e) => e.field));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <div className="mt-3 rounded-lg border border-accent-line bg-accent-softer p-3">
      <p className="flex items-center gap-2 text-[13px] font-medium text-accent-ink">
        <FileDiff className="size-4" aria-hidden /> Suggested edits to {message.proposedEdits.map((e) => FIELD_LABEL[e.field].toLowerCase()).join(", ")}
      </p>
      <p className="mt-0.5 text-xs text-ink-2">Nothing changes until you review and confirm.</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" onClick={() => setOpen(true)}>
          Review changes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const res = await dismissCopilotEditsAction(message.id);
            if (res.ok) onDone();
          }}
        >
          Dismiss
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Review suggested edits" description="Compare the current text with the suggestion. Select what to apply." size="lg">
          <FormError message={error} />
          <ul className="space-y-5">
            {message.proposedEdits.map((e) => (
              <li key={e.field}>
                <label className="flex items-center gap-2.5 text-sm font-medium">
                  <Checkbox checked={selected.includes(e.field)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, e.field] : s.filter((x) => x !== e.field)))} />
                  {FIELD_LABEL[e.field]}
                </label>
                <p className="mt-1 pl-7 text-xs text-muted">{e.rationale}</p>
                <div className="mt-2 grid gap-2 pl-7 md:grid-cols-2">
                  <div className="rounded-md border border-line bg-paper p-3">
                    <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Current</p>
                    <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted line-through decoration-negative/40">{current[e.field] || "(empty)"}</p>
                  </div>
                  <div className="rounded-md border border-accent-line bg-surface-raised p-3">
                    <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.08em] text-accent">Suggested</p>
                    <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">{e.value}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={selected.length === 0}
              onClick={async () => {
                setPending(true);
                setError(null);
                const res = await applyCopilotEditsAction(message.id, selected);
                setPending(false);
                if (!res.ok) return setError(res.error);
                toast.success(`Updated ${res.data.applied.map((f) => FIELD_LABEL[f as Field].toLowerCase()).join(", ")}`);
                setOpen(false);
                onDone();
                router.refresh();
              }}
            >
              Apply {selected.length} {selected.length === 1 ? "change" : "changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ChatInterface({
  conversationId,
  title,
  project,
  canEdit,
  messages: initial,
  aiConfigured,
}: {
  conversationId: string;
  title: string;
  project: { id: string; slug: string; title: string; fields: Record<Field, string> } | null;
  canEdit: boolean;
  messages: Message[];
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = React.useState(initial);
  const [draft, setDraft] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottom = React.useRef<HTMLDivElement>(null);
  const textarea = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => setMessages(initial), [initial]);
  React.useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setPending(true);
    setDraft("");
    setMessages((m) => [...m, { id: `pending-${Date.now()}`, role: "USER", content: message, createdAt: new Date().toISOString(), proposedEdits: [], editsResolved: true }]);
    const res = await sendCopilotMessageAction({ conversationId, message });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      setMessages((m) => m.filter((x) => !x.id.startsWith("pending-")));
      setDraft(message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-[60dvh] flex-col rounded-xl border border-line bg-surface shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-muted">{project ? `Working on ${project.title}` : "General conversation"}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" disabled={messages.length === 0}>
                  <Eraser /> <span className="hidden sm:inline">Clear history</span>
                </Button>
              }
              title="Clear this conversation's history?"
              description="Copilot will forget everything said here. The conversation itself stays so you can start fresh."
              confirmLabel="Clear history"
              onConfirm={async () => {
                const res = await clearConversationAction(conversationId);
                if (!res.ok) return toast.error(res.error);
                setMessages([]);
                router.refresh();
              }}
            />
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Delete conversation">
                  <Trash2 />
                </Button>
              }
              title="Delete this conversation?"
              description="It will be permanently removed."
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                const res = await deleteConversationAction(conversationId);
                if (res && !res.ok) toast.error(res.error);
              }}
            />
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {messages.length === 0 && !pending && (
            <div className="mx-auto max-w-lg py-6 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <p className="mt-3 font-medium">What would be most useful right now?</p>
              <ul className="mt-4 space-y-2 text-left">
                {(project ? STARTERS_PROJECT : STARTERS_GENERAL).map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={!aiConfigured}
                      onClick={() => send(s)}
                      className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-left text-[13.5px] text-ink-2 transition-colors hover:border-accent-line hover:text-ink disabled:opacity-50"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {messages.map((m) =>
            m.role === "USER" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14px] leading-relaxed text-paper">{m.content}</div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
                  <Sparkles className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Markdown>{m.content}</Markdown>
                  {m.proposedEdits.length > 0 && !m.editsResolved && project && canEdit && (
                    <EditReview message={m} current={project.fields} onDone={() => setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, editsResolved: true } : x)))} />
                  )}
                </div>
              </div>
            ),
          )}
          {pending && <Thinking steps={["Thinking about your project…", "Drafting a careful answer…", "Still working — longer questions take a bit…"]} />}
          <div ref={bottom} />
        </div>

        <form
          className="border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <FormError message={error} />
          <div className={cn("flex items-end gap-2 rounded-lg border border-line-strong bg-surface-raised p-2 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15", error && "mt-2")}>
            <label htmlFor="copilot-input" className="sr-only">
              Message Copilot
            </label>
            <textarea
              id="copilot-input"
              ref={textarea}
              rows={2}
              value={draft}
              maxLength={4000}
              disabled={!aiConfigured}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={aiConfigured ? "Ask about scope, milestones, tools, risks… (Enter to send, Shift+Enter for a new line)" : "The AI Mentor isn't configured on this server."}
              className="max-h-48 min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-faint"
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || pending || !aiConfigured} aria-label="Send message">
              <ArrowUp />
            </Button>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        {project ? (
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Linked project</p>
            <Link href={`/projects/${project.slug}`} className="mt-1 block font-medium text-ink hover:text-accent">
              {project.title}
            </Link>
            <p className="mt-1 line-clamp-3 text-[13px] text-ink-2">{project.fields.tagline}</p>
            <p className="mt-3 text-xs text-muted">
              {canEdit ? "Copilot can propose edits to the tagline, description, goals and outcomes. You review every change." : "You can discuss this project; only owners and admins can apply edits."}
            </p>
          </div>
        ) : null}
        <AdvisoryNote>Copilot remembers this conversation (the most recent ~20 messages). It can be wrong — double-check facts, and never share passwords or personal contact details.</AdvisoryNote>
      </aside>
    </div>
  );
}
