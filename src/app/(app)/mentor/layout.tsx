import { PageHeader } from "@/components/app/page-header";
import { MentorNav } from "./mentor-nav";

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader
        title="AI Mentor"
        description="Honest, specific help with finding teammates, evaluating your work and planning what comes next."
      />
      <MentorNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
