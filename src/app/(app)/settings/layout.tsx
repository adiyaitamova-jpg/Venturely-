import { PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Settings" description="Your profile, portfolio, privacy and account." />
      <SettingsNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
