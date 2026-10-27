import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShellCounts } from "@/server/services/shell";
import { SidebarNav } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { MobileTabs } from "@/components/app/mobile-tabs";
import type { ShellUser } from "@/components/app/shell-types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (session && session.onboardingStep === 0 && !session.onboarded) redirect("/onboarding");
  const user: ShellUser | null = session
    ? {
        id: session.id,
        username: session.username,
        displayName: session.displayName,
        avatarHue: session.avatarHue,
        hasAvatar: session.hasAvatar,
        avatarVersion: session.avatarVersion,
        role: session.role,
        isDemo: session.isDemo,
        onboarded: session.onboarded,
      }
    : null;
  const counts = session ? await getShellCounts(session.id) : { requests: 0, notifications: 0 };

  return (
    <div className="min-h-dvh lg:pl-60">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-paper lg:block">
        <SidebarNav user={user} counts={counts} />
      </aside>
      <Suspense fallback={<div className="h-14 border-b border-line" />}>
        <Topbar user={user} counts={counts} />
      </Suspense>
      <main id="main" className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16">
        {children}
      </main>
      {user && <MobileTabs counts={counts} />}
    </div>
  );
}
