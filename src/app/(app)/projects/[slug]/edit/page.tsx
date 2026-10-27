import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { getProjectForEdit } from "@/server/services/projects";
import { listSkills } from "@/server/services/profile";
import { PageHeader } from "@/components/app/page-header";
import { ProjectForm } from "@/components/project/project-form";
import { RolesManager } from "@/components/project/roles-manager";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/projects/${slug}/edit`);
  const [data, skills] = await Promise.all([getProjectForEdit(slug, user.id), listSkills()]);
  // Non-managers get a 404 rather than a hint that the project exists.
  if (!data) notFound();
  const { project } = data;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/projects/${project.slug}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to project
      </Link>
      <PageHeader title={`Edit ${project.title}`} />
      <div className="space-y-10">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-7">
          <ProjectForm
            skills={skills}
            projectId={project.id}
            initial={{
              title: project.title,
              tagline: project.tagline,
              description: project.description,
              goals: project.goals,
              outcomes: project.outcomes,
              category: project.category,
              stage: project.stage,
              commitment: project.commitment,
              visibility: project.visibility,
              repoUrl: project.repoUrl ?? "",
              demoUrl: project.demoUrl ?? "",
              skillIds: project.skills.map((s) => s.id),
            }}
          />
        </div>
        <RolesManager
          projectId={project.id}
          skills={skills}
          roles={project.roles.map((r) => ({ id: r.id, title: r.title, description: r.description, commitment: r.commitment, isOpen: r.isOpen, skillIds: r.skills.map((s) => s.id) }))}
        />
      </div>
    </div>
  );
}
