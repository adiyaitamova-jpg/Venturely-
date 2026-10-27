"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { PortfolioKind, ProjectCategory } from "@prisma/client";
import { deletePortfolioItemAction, reorderPortfolioAction, savePortfolioItemAction } from "@/actions/portfolio";
import { portfolioItemSchema, type PortfolioItemInput } from "@/lib/validation/portfolio";
import { CATEGORY_LABEL, PORTFOLIO_KINDS, PORTFOLIO_KIND_LABEL, PROJECT_CATEGORIES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CharCount, Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SkillBadge } from "@/components/profile/skill-badge";
import { SkillPicker, type SkillOption } from "@/components/forms/skill-picker";
import { ReorderControls, moveItem } from "@/components/forms/reorder-controls";

type Item = {
  id: string;
  title: string;
  description: string;
  kind: PortfolioKind;
  category: ProjectCategory;
  date: string;
  contribution: string;
  outcome: string;
  projectUrl: string;
  evidenceUrl: string;
  mediaUrl: string;
  skillIds: string[];
  skillNames: string[];
};

function ItemForm({ item, skills, onDone }: { item: Item | null; skills: SkillOption[]; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<PortfolioItemInput>({
    resolver: zodResolver(portfolioItemSchema) as never,
    defaultValues: item
      ? { ...item }
      : {
          title: "",
          description: "",
          kind: "PROJECT",
          category: "SOFTWARE",
          date: new Date().toISOString().slice(0, 7),
          contribution: "",
          outcome: "",
          projectUrl: "",
          evidenceUrl: "",
          mediaUrl: "",
          skillIds: [],
        },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await savePortfolioItemAction(item?.id ?? null, values);
        if (!res.ok) {
          setError(res.error);
          for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k as never, { message: m[0] });
          return;
        }
        toast.success(item ? "Entry updated" : "Entry added to your portfolio");
        router.refresh();
        onDone();
      })}
    >
      <FormError message={error} />
      <Field label="Title" htmlFor="pf-title" error={errors.title?.message}>
        <Input id="pf-title" {...form.register("title")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="pf-kind">
          <Select id="pf-kind" {...form.register("kind")}>
            {PORTFOLIO_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="pf-category">
          <Select id="pf-category" {...form.register("category")}>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="pf-date" error={errors.date?.message}>
          <Input id="pf-date" type="month" {...form.register("date")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="pf-description" error={errors.description?.message} aside={<CharCount value={form.watch("description")} max={1200} />}>
        <Textarea id="pf-description" rows={4} {...form.register("description")} />
      </Field>
      <Field label="What you personally did" htmlFor="pf-contribution" optional hint="Be specific: “Built the data pipeline and trained the classifier”." error={errors.contribution?.message}>
        <Textarea id="pf-contribution" rows={2} {...form.register("contribution")} />
      </Field>
      <Field label="Outcome" htmlFor="pf-outcome" optional hint="Measurable results: users, accuracy, awards, what changed." error={errors.outcome?.message}>
        <Textarea id="pf-outcome" rows={2} {...form.register("outcome")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project link" htmlFor="pf-projectUrl" optional error={errors.projectUrl?.message}>
          <Input id="pf-projectUrl" type="url" placeholder="https://" {...form.register("projectUrl")} />
        </Field>
        <Field label="Evidence link" htmlFor="pf-evidenceUrl" optional hint="Repo, paper, demo video, press…" error={errors.evidenceUrl?.message}>
          <Input id="pf-evidenceUrl" type="url" placeholder="https://" {...form.register("evidenceUrl")} />
        </Field>
      </div>
      <Field label="Skills used" htmlFor="pf-skills" hint="Linking skills to evidenced work is what makes them count." error={errors.skillIds?.message}>
        <Controller control={form.control} name="skillIds" render={({ field }) => <SkillPicker id="pf-skills" skills={skills} value={field.value} onChange={field.onChange} max={8} />} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {item ? "Save changes" : "Add entry"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PortfolioManager({ items: initial, skills }: { items: Item[]; skills: SkillOption[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Item | null | "new">(null);
  React.useEffect(() => setItems(initial), [initial]);

  const move = async (from: number, to: number) => {
    const prev = items;
    const next = moveItem(items, from, to);
    setItems(next);
    const res = await reorderPortfolioAction({ ids: next.map((i) => i.id) });
    if (!res.ok) {
      setItems(prev);
      toast.error(res.error);
    } else router.refresh();
  };

  return (
    <section aria-labelledby="portfolio-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="portfolio-title" className="text-lg font-semibold tracking-[-0.015em]">
            Portfolio
          </h2>
          <p className="text-[13px] text-muted">Projects, research and work you&apos;re proud of. Order matters — put your strongest first.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Add entry
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No portfolio entries yet" description="Add a project with links and outcomes. Evidence-backed entries help your skills count toward your ranking." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((item, i) => (
            <li key={item.id} className="flex gap-3 p-4">
              <ReorderControls index={i} count={items.length} onMove={move} label={item.title} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{item.title}</p>
                <p className="text-xs text-muted">
                  {PORTFOLIO_KIND_LABEL[item.kind]} · {CATEGORY_LABEL[item.category]} · {item.date}
                  {!item.projectUrl && !item.evidenceUrl && <span className="text-warning"> · No links yet</span>}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-2">{item.description}</p>
                {item.skillNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.skillNames.map((n) => (
                      <SkillBadge key={n} name={n} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(item)} aria-label={`Edit ${item.title}`}>
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.title}`}>
                      <Trash2 />
                    </Button>
                  }
                  title="Delete this entry?"
                  description={`“${item.title}” will be removed from your portfolio. This can't be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    const res = await deletePortfolioItemAction(item.id);
                    if (!res.ok) return toast.error(res.error);
                    toast.success("Entry deleted");
                    router.refresh();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "Add a portfolio entry" : "Edit portfolio entry"} size="lg">
          {editing !== null && <ItemForm item={editing === "new" ? null : editing} skills={skills} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
