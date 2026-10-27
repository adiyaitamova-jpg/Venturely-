import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { listSkills } from "@/server/services/profile";
import { PageHeader } from "@/components/app/page-header";
import { ProjectForm } from "@/components/project/project-form";

export const metadata: Metadata = { title: "Start a project" };

export default async function NewProjectPage() {
  await requireUser("/projects/new");
  const skills = await listSkills();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Start a project" description="Describe what you're building. You can refine everything later — and ask the AI Mentor to review it." />
      <div className="rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-7">
        <ProjectForm skills={skills} />
      </div>
    </div>
  );
}
