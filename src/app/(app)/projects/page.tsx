import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import type { Commitment, ProjectCategory, ProjectStage } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { listMyProjects, listProjects } from "@/server/services/projects";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ProjectCard } from "@/components/project/project-card";
import { COMMITMENT, PROJECT_CATEGORIES, STAGES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { ProjectFilters } from "./project-filters";

export const metadata: Metadata = { title: "Projects", description: "Student-led projects in AI, research, robotics, climate and more — looking for teammates." };

type SP = Promise<Record<string, string | undefined>>;
function enumParam<T extends string>(v: string | undefined, values: readonly { value: T }[]): T | undefined {
  return values.find((x) => x.value.toLowerCase() === v?.toLowerCase())?.value;
}

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const viewer = await getCurrentUser();
  const view = sp.view === "mine" && viewer ? "mine" : "explore";

  const tabs = (
    <nav aria-label="Project views" className="mb-6 flex gap-6 border-b border-line">
      {[
        { key: "explore", label: "Explore", href: "/projects" },
        ...(viewer ? [{ key: "mine", label: "Your projects", href: "/projects?view=mine" }] : []),
      ].map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={view === t.key ? "page" : undefined}
          className={cn("-mb-px border-b-2 py-2.5 text-sm", view === t.key ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  const header = (
    <PageHeader
      title="Projects"
      description="Real projects led by students — find one to join, or start your own and recruit a team."
      actions={
        <Button asChild>
          <Link href={viewer ? "/projects/new" : "/sign-up?next=/projects/new"}>
            <Plus /> Start a project
          </Link>
        </Button>
      }
    />
  );

  if (view === "mine" && viewer) {
    const mine = await listMyProjects(viewer.id);
    return (
      <div>
        {header}
        {tabs}
        {mine.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="You're not on any projects yet"
            description="Start one, or browse projects with open roles and apply."
            action={
              <Button asChild size="sm">
                <Link href="/projects?open=1">Browse open roles</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const sort = sp.sort === "new" || sp.sort === "advanced" ? sp.sort : "recent";
  const result = await listProjects(viewer?.id ?? null, {
    q: sp.q?.slice(0, 100),
    category: enumParam<ProjectCategory>(sp.category, PROJECT_CATEGORIES),
    stage: enumParam<ProjectStage>(sp.stage, STAGES),
    commitment: enumParam<Commitment>(sp.commitment, COMMITMENT),
    openRoles: sp.open === "1",
    sort,
    page,
  });

  return (
    <div>
      {header}
      {tabs}
      <ProjectFilters>
        <p className="mb-4 text-[13px] text-muted" aria-live="polite">
          {result.total} {result.total === 1 ? "project" : "projects"}
          {!viewer && " · sign in to see members-only projects"}
        </p>
        {result.items.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects match" description="Try a different category or stage — or start the project you wish existed." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
        <Pagination
          page={page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/projects"
          params={{ q: sp.q, category: sp.category, stage: sp.stage, commitment: sp.commitment, open: sp.open, sort: sp.sort }}
        />
      </ProjectFilters>
    </div>
  );
}
