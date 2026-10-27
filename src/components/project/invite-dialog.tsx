"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
import { sendInvitationAction } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { CharCount, Field, FormError } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

export type InviteOption = { id: string; title: string; roles: { id: string; title: string }[] };

export function InviteDialog({
  open,
  onOpenChange,
  recipient,
  options,
  defaultMessage,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipient: { id: string; displayName: string };
  options: InviteOption[];
  defaultMessage?: string;
}) {
  const [projectId, setProjectId] = React.useState(options[0]?.id ?? "");
  const [roleId, setRoleId] = React.useState<string>("");
  const [message, setMessage] = React.useState(defaultMessage ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const project = options.find((o) => o.id === projectId);

  React.useEffect(() => {
    if (open) {
      setError(null);
      if (!projectId && options[0]) setProjectId(options[0].id);
    }
  }, [open, options, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Invite ${recipient.displayName}`} description="They'll get a notification and can accept or decline. Keep it specific and kind.">
        {options.length === 0 ? (
          <EmptyState
            compact
            icon={FolderPlus}
            title="You don't lead any active projects yet"
            description="Create a project first — then you can invite people to specific roles."
            action={
              <Button asChild size="sm">
                <Link href="/projects/new">Start a project</Link>
              </Button>
            }
          />
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError(null);
              const res = await sendInvitationAction({ projectId, recipientId: recipient.id, roleId: roleId || null, message });
              setPending(false);
              if (!res.ok) return setError(res.error);
              toast.success(`Invitation sent to ${recipient.displayName}`);
              onOpenChange(false);
            }}
          >
            <FormError message={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project" htmlFor="invite-project">
                <Select
                  id="invite-project"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setRoleId("");
                  }}
                >
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role" htmlFor="invite-role" optional>
                <Select id="invite-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">General teammate</option>
                  {project?.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Message" htmlFor="invite-message" hint="Why them, specifically? What would they work on?" aside={<CharCount value={message} max={600} />}>
              <Textarea id="invite-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} minLength={10} maxLength={600} required />
            </Field>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={message.trim().length < 10}>
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
