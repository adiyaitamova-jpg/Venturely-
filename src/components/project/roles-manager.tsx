"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, UserRoundSearch } from "lucide-react";
import type { Commitment } from "@prisma/client";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "@/actions/projects";
import { COMMITMENT, COMMITMENT_LABEL, SUGGESTED_ROLES } from "@/lib/taxonomy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SkillPicker, type SkillOption } from "@/components/forms/skill-picker";

type Role = { id: string; title: string; description: string; commitment: Commitment; isOpen: boolean; skillIds: string[] };

function RoleForm({ projectId, role, skills, onDone }: { projectId: string; role: Role | null; skills: SkillOption[]; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(role?.title ?? "");
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [commitment, setCommitment] = React.useState<Commitment>(role?.commitment ?? "MODERATE");
  const [skillIds, setSkillIds] = React.useState<string[]>(role?.skillIds ?? []);
  const [isOpen, setIsOpen] = React.useState(role?.isOpen ?? true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const values = { title, description, commitment, skillIds };
        const res = role ? await updateRoleAction(projectId, role.id, { ...values, isOpen }) : await createRoleAction(projectId, values);
        setPending(false);
        if (!res.ok) return setError(res.error);
        toast.success(role ? "Role updated" : "Role opened");
        router.refresh();
        onDone();
      }}
    >
      <FormError message={error} />
      <Field label="Role title" htmlFor="role-title">
        <Input id="role-title" list="role-suggestions" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required />
      </Field>
      <datalist id="role-suggestions">
        {SUGGESTED_ROLES.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <Field label="What they'd do" htmlFor="role-desc" optional>
        <Textarea id="role-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </Field>
      <Field label="Commitment" htmlFor="role-commitment">
        <Select id="role-commitment" value={commitment} onChange={(e) => setCommitment(e.target.value as Commitment)}>
          {COMMITMENT.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Key skills" htmlFor="role-skills" optional>
        <SkillPicker id="role-skills" skills={skills} value={skillIds} onChange={setSkillIds} max={6} />
      </Field>
      {role && (
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox checked={isOpen} onCheckedChange={(v) => setIsOpen(v === true)} /> Accepting applications for this role
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} disabled={title.trim().length < 2}>
          {role ? "Save role" : "Open role"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RolesManager({ projectId, roles, skills }: { projectId: string; roles: Role[]; skills: SkillOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Role | "new" | null>(null);
  const names = new Map(skills.map((s) => [s.id, s.name]));
  return (
    <section id="roles" aria-labelledby="roles-title" className="scroll-mt-20">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="roles-title" className="text-lg font-semibold tracking-[-0.015em]">
            Roles
          </h2>
          <p className="text-[13px] text-muted">Specific roles get better applicants. Closed roles stay listed for context.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Open a role
        </Button>
      </div>
      {roles.length === 0 ? (
        <EmptyState icon={UserRoundSearch} title="No roles yet" description="What does the team need most right now? Open one role at a time." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {roles.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{r.title}</p>
                  <Badge tone={r.isOpen ? "positive" : "neutral"}>{r.isOpen ? "Open" : "Closed"}</Badge>
                </div>
                <p className="text-xs text-muted">
                  {COMMITMENT_LABEL[r.commitment]}
                  {r.skillIds.length > 0 && <> · {r.skillIds.map((id) => names.get(id)).filter(Boolean).join(", ")}</>}
                </p>
                {r.description && <p className="mt-1 text-[13px] text-ink-2">{r.description}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label={`Edit ${r.title}`}>
                <Pencil />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${r.title}`}>
                    <Trash2 />
                  </Button>
                }
                title="Delete this role?"
                description="Pending invitations and applications for it will become general requests."
                confirmLabel="Delete"
                destructive
                onConfirm={async () => {
                  const res = await deleteRoleAction(projectId, r.id);
                  if (!res.ok) return toast.error(res.error);
                  router.refresh();
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "Open a role" : "Edit role"}>
          {editing !== null && <RoleForm projectId={projectId} role={editing === "new" ? null : editing} skills={skills} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
