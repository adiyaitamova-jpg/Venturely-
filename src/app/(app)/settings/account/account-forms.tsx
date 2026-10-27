"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { changePasswordAction, deleteAccountAction } from "@/actions/auth";
import { unblockUserAction } from "@/actions/social";
import { changePasswordSchema } from "@/lib/validation/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function BlockedList({ blocked }: { blocked: { id: string; displayName: string; username: string; avatarHue: number; since: string }[] }) {
  const router = useRouter();
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-semibold">Blocked people</h2>
      <p className="mt-0.5 text-[13px] text-muted">Blocked people can&apos;t find, invite or contact you, and you won&apos;t see them.</p>
      {blocked.length === 0 ? (
        <p className="mt-4 text-[13px] text-faint">You haven&apos;t blocked anyone.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {blocked.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2.5">
              <Avatar user={{ id: b.id, displayName: b.displayName, avatarHue: b.avatarHue }} size="sm" />
              <span className="flex-1 text-sm">
                {b.displayName} <span className="text-muted">@{b.username}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const res = await unblockUserAction(b.id);
                  if (!res.ok) return toast.error(res.error);
                  toast.success(`Unblocked ${b.displayName}`);
                  router.refresh();
                }}
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AccountForms({ isDemo }: { isDemo: boolean }) {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  return (
    <>
      <section className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-6">
        <h2 className="text-base font-semibold">Password</h2>
        <p className="mb-4 mt-0.5 text-[13px] text-muted">Changing your password signs you out on other devices.</p>
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            const res = await changePasswordAction(values);
            if (!res.ok) {
              setError(res.error);
              for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as never, { message: m[0] });
              return;
            }
            form.reset();
            toast.success("Password updated");
          })}
        >
          <div className="sm:col-span-3">
            <FormError message={error} />
          </div>
          <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...form.register("currentPassword")} />
          </Field>
          <Field label="New password" htmlFor="newPassword" error={errors.password?.message}>
            <Input id="newPassword" type="password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <Field label="Confirm" htmlFor="confirm" error={errors.confirm?.message}>
            <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" loading={isSubmitting} disabled={isDemo}>
              Update password
            </Button>
            {isDemo && <span className="ml-3 text-xs text-muted">Disabled on shared demo accounts.</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-negative/25 bg-surface p-5 shadow-xs sm:p-6">
        <h2 className="text-base font-semibold text-negative">Delete account</h2>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
          Permanently deletes your profile, portfolio, achievements, requests and AI history. Projects you own are handed to your longest-serving teammate, or deleted if you&apos;re the only member.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="danger" className="mt-4" disabled={isDemo}>
              Delete my account
            </Button>
          </DialogTrigger>
          <DialogContent title="Delete your account?" description="This can't be undone." size="sm">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setDeleting(true);
                setDeleteError(null);
                const res = await deleteAccountAction({ password: deletePassword });
                setDeleting(false);
                if (res && !res.ok) setDeleteError(res.error);
              }}
            >
              <FormError message={deleteError} />
              <Field label="Enter your password to confirm" htmlFor="delete-password">
                <Input id="delete-password" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" />
              </Field>
              <DialogFooter>
                <Button type="submit" variant="danger" loading={deleting} disabled={!deletePassword}>
                  Delete permanently
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>
    </>
  );
}
