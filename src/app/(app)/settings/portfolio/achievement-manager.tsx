"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Award, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { AchievementLevel, AchievementType, ProjectCategory, VerificationStatus } from "@prisma/client";
import { deleteAchievementAction, reorderAchievementsAction, requestVerificationAction, saveAchievementAction } from "@/actions/portfolio";
import { achievementSchema, type AchievementInput } from "@/lib/validation/portfolio";
import { ACHIEVEMENT_LEVELS, ACHIEVEMENT_LEVEL_LABEL, ACHIEVEMENT_TYPES, ACHIEVEMENT_TYPE_LABEL, PROJECT_CATEGORIES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { VerificationBadge } from "@/components/profile/verification-badge";
import { ReorderControls, moveItem } from "@/components/forms/reorder-controls";

type Item = {
  id: string;
  title: string;
  description: string;
  type: AchievementType;
  level: AchievementLevel;
  category: ProjectCategory;
  issuer: string;
  date: string;
  evidenceUrl: string;
  status: VerificationStatus;
  reviewNote: string | null;
};

function AchievementForm({ item, onDone }: { item: Item | null; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<AchievementInput>({
    resolver: zodResolver(achievementSchema) as never,
    defaultValues: item
      ? { title: item.title, description: item.description, type: item.type, level: item.level, category: item.category, issuer: item.issuer, date: item.date, evidenceUrl: item.evidenceUrl }
      : { title: "", description: "", type: "COMPETITION", level: "REGIONAL", category: "SOFTWARE", issuer: "", date: new Date().toISOString().slice(0, 7), evidenceUrl: "" },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await saveAchievementAction(item?.id ?? null, values);
        if (!res.ok) {
          setError(res.error);
          for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as never, { message: m[0] });
          return;
        }
        toast.success(res.data.verificationReset ? "Saved. Because the claim changed, it's now self-reported again." : item ? "Achievement updated" : "Achievement added");
        router.refresh();
        onDone();
      })}
    >
      <FormError message={error} />
      {item && item.status === "VERIFIED" && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          Changing the title, type, level, issuer, date or evidence will remove the verified status.
        </p>
      )}
      <Field label="Title" htmlFor="ach-title" hint="e.g. “Gold medal, National Olympiad in Informatics”" error={errors.title?.message}>
        <Input id="ach-title" {...form.register("title")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="ach-type">
          <Select id="ach-type" {...form.register("type")}>
            {ACHIEVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Level" htmlFor="ach-level">
          <Select id="ach-level" {...form.register("level")}>
            {ACHIEVEMENT_LEVELS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="ach-category">
          <Select id="ach-category" {...form.register("category")}>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issued by" htmlFor="ach-issuer" optional error={errors.issuer?.message}>
          <Input id="ach-issuer" {...form.register("issuer")} />
        </Field>
        <Field label="Date" htmlFor="ach-date" error={errors.date?.message}>
          <Input id="ach-date" type="month" {...form.register("date")} />
        </Field>
      </div>
      <Field label="Evidence link" htmlFor="ach-evidence" optional hint="Official results page or certificate. Required to request verification." error={errors.evidenceUrl?.message}>
        <Input id="ach-evidence" type="url" placeholder="https://" {...form.register("evidenceUrl")} />
      </Field>
      <Field label="Description" htmlFor="ach-description" optional error={errors.description?.message}>
        <Textarea id="ach-description" rows={3} {...form.register("description")} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {item ? "Save changes" : "Add achievement"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AchievementManager({ items: initial }: { items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Item | null | "new">(null);
  React.useEffect(() => setItems(initial), [initial]);

  const move = async (from: number, to: number) => {
    const prev = items;
    const next = moveItem(items, from, to);
    setItems(next);
    const res = await reorderAchievementsAction({ ids: next.map((i) => i.id) });
    if (!res.ok) {
      setItems(prev);
      toast.error(res.error);
    } else router.refresh();
  };

  return (
    <section id="achievements" aria-labelledby="achievements-title" className="scroll-mt-20">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="achievements-title" className="text-lg font-semibold tracking-[-0.015em]">
            Achievements
          </h2>
          <p className="max-w-xl text-[13px] text-muted">
            Awards, competitions and certifications. Everything starts as <em>self-reported</em>; add evidence and request review to get it verified by a moderator.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Add achievement
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Award} title="No achievements yet" description="Competitions, awards, selective programs and certifications all belong here." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((a, i) => (
            <li key={a.id} className="flex gap-3 p-4">
              <ReorderControls index={i} count={items.length} onMove={move} label={a.title} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{a.title}</p>
                  <VerificationBadge status={a.status} />
                </div>
                <p className="text-xs text-muted">
                  {ACHIEVEMENT_LEVEL_LABEL[a.level]} {ACHIEVEMENT_TYPE_LABEL[a.type].toLowerCase()} · {a.issuer ? `${a.issuer} · ` : ""}
                  {a.date}
                </p>
                {a.status === "REJECTED" && a.reviewNote && <p className="mt-1.5 text-[13px] text-negative">Moderator note: {a.reviewNote}</p>}
                {(a.status === "SELF_REPORTED" || a.status === "REJECTED") && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1.5 h-auto"
                    onClick={async () => {
                      const res = await requestVerificationAction(a.id);
                      if (!res.ok) return toast.error(res.error);
                      toast.success("Sent for review. A moderator will check your evidence.");
                      router.refresh();
                    }}
                  >
                    <ShieldCheck /> Request verification
                  </Button>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(a)} aria-label={`Edit ${a.title}`}>
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${a.title}`}>
                      <Trash2 />
                    </Button>
                  }
                  title="Delete this achievement?"
                  description={`“${a.title}” will be removed${a.status === "VERIFIED" ? ", including its verified status" : ""}. This can't be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    const res = await deleteAchievementAction(a.id);
                    if (!res.ok) return toast.error(res.error);
                    toast.success("Achievement deleted");
                    router.refresh();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "Add an achievement" : "Edit achievement"} size="lg">
          {editing !== null && <AchievementForm item={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
