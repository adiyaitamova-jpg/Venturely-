import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { searchPeople } from "@/server/services/discovery";
import { listProjects } from "@/server/services/projects";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonCard } from "@/components/profile/person-card";
import { ProjectCard } from "@/components/project/project-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw } = await searchParams;
  const q = raw?.trim().slice(0, 100) ?? "";
  const viewer = await getCurrentUser();
  const [people, projects] = q
    ? await Promise.all([viewer ? searchPeople(viewer.id, { q, pageSize: 6 }) : null, listProjects(viewer?.id ?? null, { q, pageSize: 6 })])
    : [null, null];

  return (
    <div>
      <PageHeader title={q ? `Results for “${q}”` : "Search"} />
      <form action="/search" className="mb-8 flex max-w-xl gap-2 md:hidden" role="search">
        <Input name="q" defaultValue={q} type="search" placeholder="Search people and projects" aria-label="Search" className="h-10" />
        <Button type="submit" className="h-10">
          <Search /> Search
        </Button>
      </form>
      {!q ? (
        <EmptyState icon={Search} title="Search people and projects" description="Try a skill (“computer vision”), a cause (“climate”) or a name." />
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">People</h2>
              {viewer && people && people.total > 6 && (
                <Link href={`/discover?q=${encodeURIComponent(q)}`} className="text-[13px] text-accent hover:underline">
                  All {people.total} people
                </Link>
              )}
            </div>
            {!viewer ? (
              <p className="text-sm text-muted">
                <Link href={`/sign-in?next=${encodeURIComponent(`/search?q=${q}`)}`} className="text-accent hover:underline">
                  Sign in
                </Link>{" "}
                to search members.
              </p>
            ) : people && people.items.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {people.items.map((p) => (
                  <PersonCard key={p.id} person={p} compact />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No people match.</p>
            )}
          </section>
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Projects</h2>
              {projects && projects.total > 6 && (
                <Link href={`/projects?q=${encodeURIComponent(q)}`} className="text-[13px] text-accent hover:underline">
                  All {projects.total} projects
                </Link>
              )}
            </div>
            {projects && projects.items.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {projects.items.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No projects match.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
