"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Check, Circle, CircleDot, Ellipsis, Flag, LogOut, MessageSquareHeart, Pencil, Plus, Share2, Trash2, UserMinus } from "lucide-react";
import type { MemberRole, MilestoneStatus } from "@prisma/client";
import {
  applyToProjectAction,
  createMilestoneAction,
  deleteMilestoneAction,
  leaveFeedbackAction,
  leaveProjectAction,
  removeMemberAction,
  setArchivedAction,
  setMilestoneStatusAction,
  updateMemberAction,
  updateMilestoneAction,
  withdrawApplicationAction,
} from "@/actions/projects";
import { MILESTONE_STATUS_LABEL } from "@/lib/taxonomy";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CharCount, Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ReportDialog } from "@/components/profile/report-dialog";

// ─────────────────────────── Apply ───────────────────────────

export function ApplyButton({
  projectId,
  projectTitle,
  roles,
  defaultRoleId,
  pendingApplicationId,
  label = "Apply to join",
  size = "md",
  variant = "primary",
}: {
  projectId: string;
  projectTitle: string;
  roles: { id: string; title: string }[];
  defaultRoleId?: string;
  pendingApplicationId?: string | null;
  label?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [roleId, setRoleId] = React.useState(defaultRoleId ?? "");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  if (pendingApplicationId) {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="secondary" size={size}>
            <Check /> Application sent
          </Button>
        }
        title="Withdraw your application?"
        description="The team won't be able to accept it anymore. You can apply again later."
        confirmLabel="Withdraw"
        onConfirm={async () => {
          const res = await withdrawApplicationAction(pendingApplicationId);
          if (!res.ok) return toast.error(res.error);
          toast.success("Application withdrawn");
          router.refresh();
        }}
      />
    );
  }

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`Apply to ${projectTitle}`} description="Tell the team why you're interested and what you'd bring. Be specific — it makes a real difference.">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError(null);
              const res = await applyToProjectAction({ projectId, roleId: roleId || null, message });
              setPending(false);
              if (!res.ok) return setError(res.error);
              toast.success("Application sent. You'll be notified when the team responds.");
              setOpen(false);
              router.refresh();
            }}
          >
            <FormError message={error} />
            {roles.length > 0 && (
              <Field label="Role" htmlFor="apply-role">
                <Select id="apply-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">General — wherever I&apos;m most useful</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Your message" htmlFor="apply-message" hint="At least 30 characters. Mention relevant work and your availability." aside={<CharCount value={message} max={800} />}>
              <Textarea id="apply-message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={800} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={message.trim().length < 30}>
                Send application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────── Project-level actions ───────────────────────────

export function ProjectMenu({
  projectId,
  slug,
  title,
  isOwner,
  isMember,
  archived,
  signedIn,
}: {
  projectId: string;
  slug: string;
  title: string;
  isOwner: boolean;
  isMember: boolean;
  archived: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = React.useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/projects/${slug}`);
      toast.success("Project link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="More project actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={share}>
            <Share2 /> Copy link
          </DropdownMenuItem>
          {isOwner && (
            <ConfirmDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Restore project" : "Archive project"}
                </DropdownMenuItem>
              }
              title={archived ? "Restore this project?" : "Archive this project?"}
              description={
                archived
                  ? "It will be visible in discovery again and can receive applications."
                  : "It will be hidden from discovery and pending invitations and applications will be closed. Your team keeps access, and you can restore it any time."
              }
              confirmLabel={archived ? "Restore" : "Archive"}
              onConfirm={async () => {
                const res = await setArchivedAction(projectId, !archived);
                if (!res.ok) return toast.error(res.error);
                toast.success(archived ? "Project restored" : "Project archived");
                router.refresh();
              }}
            />
          )}
          {isMember && !isOwner && (
            <ConfirmDialog
              trigger={
                <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                  <LogOut /> Leave project
                </DropdownMenuItem>
              }
              title={`Leave ${title}?`}
              description="You'll be removed from the team and unassigned from open milestones. Completed work stays credited."
              confirmLabel="Leave"
              destructive
              onConfirm={async () => {
                const res = await leaveProjectAction(projectId);
                if (!res.ok) return toast.error(res.error);
                toast.success("You left the project");
                router.push("/projects?view=mine");
              }}
            />
          )}
          {signedIn && !isMember && (
            <DropdownMenuItem onSelect={() => setReportOpen(true)}>
              <Flag /> Report project
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="PROJECT" targetId={projectId} subject={title} />
    </>
  );
}

// ─────────────────────────── Team ───────────────────────────

type MemberRow = { id: string; userId: string; displayName: string; role: MemberRole; title: string; responsibilities: string };

export function MemberActions({
  projectId,
  member,
  viewerRole,
  viewerId,
  existingFeedback,
}: {
  projectId: string;
  member: MemberRow;
  viewerRole: MemberRole | null;
  viewerId: string | null;
  existingFeedback?: { contribution: number; reliability: number };
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const isSelf = member.userId === viewerId;
  const isManager = viewerRole === "OWNER" || viewerRole === "ADMIN";
  const canEdit = isManager && (member.role !== "OWNER" || isSelf);
  const canRemove = isManager && !isSelf && member.role !== "OWNER" && (member.role !== "ADMIN" || viewerRole === "OWNER");
  const canFeedback = Boolean(viewerRole) && !isSelf;
  if (!canEdit && !canRemove && !canFeedback) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.displayName}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {canEdit && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil /> Edit role &amp; responsibilities
            </DropdownMenuItem>
          )}
          {canFeedback && (
            <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
              <MessageSquareHeart /> {existingFeedback ? "Update feedback" : "Leave feedback"}
            </DropdownMenuItem>
          )}
          {canRemove && (
            <ConfirmDialog
              trigger={
                <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                  <UserMinus /> Remove from team
                </DropdownMenuItem>
              }
              title={`Remove ${member.displayName}?`}
              description="They'll lose access to team-only actions and be unassigned from open milestones."
              confirmLabel="Remove"
              destructive
              onConfirm={async () => {
                const res = await removeMemberAction(projectId, member.id);
                if (!res.ok) return toast.error(res.error);
                toast.success(`${member.displayName} was removed`);
                router.refresh();
              }}
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canEdit && <EditMemberDialog open={editOpen} onOpenChange={setEditOpen} projectId={projectId} member={member} canChangeRole={viewerRole === "OWNER" && member.role !== "OWNER"} />}
      {canFeedback && <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} projectId={projectId} member={member} existing={existingFeedback} />}
    </>
  );
}

function EditMemberDialog({
  open,
  onOpenChange,
  projectId,
  member,
  canChangeRole,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  member: MemberRow;
  canChangeRole: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(member.title);
  const [responsibilities, setResponsibilities] = React.useState(member.responsibilities);
  const [role, setRole] = React.useState<"ADMIN" | "MEMBER">(member.role === "ADMIN" ? "ADMIN" : "MEMBER");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${member.displayName}'s role`} size="sm">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const res = await updateMemberAction(projectId, member.id, { title, responsibilities, role: member.role === "OWNER" ? "MEMBER" : role });
            setPending(false);
            if (!res.ok) return setError(res.error);
            toast.success("Team details updated");
            onOpenChange(false);
            router.refresh();
          }}
        >
          <FormError message={error} />
          <Field label="Title" htmlFor="m-title" hint="e.g. “Hardware lead”">
            <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Responsibilities" htmlFor="m-resp" hint="Documented responsibilities make contributions count fully in rankings.">
            <Textarea id="m-resp" rows={3} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} maxLength={400} />
          </Field>
          {canChangeRole && (
            <Field label="Permissions" htmlFor="m-role" hint="Admins can edit the project, manage roles and review applications.">
              <Select id="m-role" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button type="submit" loading={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RatingRow({ label, value, onChange, id }: { label: string; value: number; onChange: (n: number) => void; id: string }) {
  return (
    <div>
      <p id={id} className="mb-1.5 text-[13px] font-medium">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "size-9 rounded-md border text-sm font-medium tabular transition-colors",
              value === n ? "border-accent bg-accent text-white" : "border-line-strong bg-surface-raised text-ink-2 hover:border-faint",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackDialog({
  open,
  onOpenChange,
  projectId,
  member,
  existing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  member: MemberRow;
  existing?: { contribution: number; reliability: number };
}) {
  const [contribution, setContribution] = React.useState(existing?.contribution ?? 0);
  const [reliability, setReliability] = React.useState(existing?.reliability ?? 0);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Feedback for ${member.displayName}`} description="Private to TEAMi — they see that feedback was left, not your ratings. Be fair and honest." size="sm">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const res = await leaveFeedbackAction({ projectId, subjectId: member.userId, contribution, reliability, note });
            setPending(false);
            if (!res.ok) return setError(res.error);
            toast.success("Thanks — feedback saved");
            onOpenChange(false);
          }}
        >
          <FormError message={error} />
          <RatingRow id="fb-contribution" label="Substance of their contribution" value={contribution} onChange={setContribution} />
          <RatingRow id="fb-reliability" label="Reliability as a teammate" value={reliability} onChange={setReliability} />
          <Field label="Note" htmlFor="fb-note" optional>
            <Textarea id="fb-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
          </Field>
          <DialogFooter>
            <Button type="submit" loading={pending} disabled={!contribution || !reliability}>
              Save feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────── Milestones ───────────────────────────

type Milestone = {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueDate: string | null;
  completedAt: string | null;
  evidenceUrl: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
};

const STATUS_ICON = { PLANNED: Circle, IN_PROGRESS: CircleDot, DONE: Check } as const;

export function MilestoneList({
  projectId,
  milestones,
  members,
  canEdit,
  canDelete,
}: {
  projectId: string;
  milestones: Milestone[];
  members: { userId: string; displayName: string }[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Milestone | "new" | null>(null);
  const done = milestones.filter((m) => m.status === "DONE").length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted tabular">
          {done} of {milestones.length} done
        </p>
        {canEdit && (
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus /> Add milestone
          </Button>
        )}
      </div>
      {milestones.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">
          No milestones yet.{canEdit && " Break the work into 3–6 concrete, checkable steps."}
        </p>
      ) : (
        <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
          {milestones.map((m) => {
            const Icon = STATUS_ICON[m.status];
            return (
              <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                    m.status === "DONE" ? "border-accent bg-accent text-white" : m.status === "IN_PROGRESS" ? "border-accent text-accent" : "border-line-strong text-faint",
                  )}
                  aria-hidden
                >
                  <Icon className="size-3" strokeWidth={m.status === "DONE" ? 3 : 2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", m.status === "DONE" ? "text-muted line-through decoration-line-strong" : "text-ink")}>{m.title}</p>
                  {m.description && <p className="mt-0.5 text-[13px] text-muted">{m.description}</p>}
                  <p className="mt-1 text-xs text-faint">
                    {m.assigneeName ? m.assigneeName : "Unassigned"}
                    {m.dueDate && m.status !== "DONE" && <> · due {formatDate(m.dueDate)}</>}
                    {m.completedAt && <> · done {formatDate(m.completedAt)}</>}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Select
                      aria-label={`Status of ${m.title}`}
                      className="h-8 w-[118px] text-xs"
                      value={m.status}
                      onChange={async (e) => {
                        const res = await setMilestoneStatusAction(projectId, m.id, e.target.value);
                        if (!res.ok) return toast.error(res.error);
                        if (e.target.value === "DONE") toast.success("Milestone completed");
                        router.refresh();
                      }}
                    >
                      {(Object.keys(MILESTONE_STATUS_LABEL) as MilestoneStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {MILESTONE_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(m)} aria-label={`Edit ${m.title}`}>
                      <Pencil />
                    </Button>
                    {canDelete && (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${m.title}`}>
                            <Trash2 />
                          </Button>
                        }
                        title="Delete milestone?"
                        description={`“${m.title}” will be removed.`}
                        confirmLabel="Delete"
                        destructive
                        onConfirm={async () => {
                          const res = await deleteMilestoneAction(projectId, m.id);
                          if (!res.ok) return toast.error(res.error);
                          router.refresh();
                        }}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "Add milestone" : "Edit milestone"}>
          {editing !== null && <MilestoneForm projectId={projectId} milestone={editing === "new" ? null : editing} members={members} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneForm({
  projectId,
  milestone,
  members,
  onDone,
}: {
  projectId: string;
  milestone: Milestone | null;
  members: { userId: string; displayName: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(milestone?.title ?? "");
  const [description, setDescription] = React.useState(milestone?.description ?? "");
  const [dueDate, setDueDate] = React.useState(milestone?.dueDate?.slice(0, 10) ?? "");
  const [assigneeId, setAssigneeId] = React.useState(milestone?.assigneeId ?? "");
  const [evidenceUrl, setEvidenceUrl] = React.useState(milestone?.evidenceUrl ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const values = { title, description, dueDate: dueDate || null, assigneeId: assigneeId || null, evidenceUrl };
        const res = milestone ? await updateMilestoneAction(projectId, milestone.id, values) : await createMilestoneAction(projectId, values);
        setPending(false);
        if (!res.ok) return setError(res.error);
        router.refresh();
        onDone();
      }}
    >
      <FormError message={error} />
      <Field label="Title" htmlFor="ms-title" hint="Concrete and checkable: “Collect 200 labelled images”">
        <Input id="ms-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
      </Field>
      <Field label="Details" htmlFor="ms-desc" optional>
        <Textarea id="ms-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Owner" htmlFor="ms-assignee" optional>
          <Select id="ms-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date" htmlFor="ms-due" optional>
          <Input id="ms-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Evidence link" htmlFor="ms-evidence" optional hint="A PR, document or demo that shows it's done.">
        <Input id="ms-evidence" type="url" placeholder="https://" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} disabled={title.trim().length < 2}>
          {milestone ? "Save" : "Add milestone"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreatedBanner() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-accent-line bg-accent-softer p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-2">
        <span className="font-medium text-ink">Your project is live.</span> Next: add open roles so people can apply, and break the work into milestones.
      </p>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href="?" replace>
            Dismiss
          </Link>
        </Button>
      </div>
    </div>
  );
}
