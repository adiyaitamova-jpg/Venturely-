import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { getEditableProfile, listSkills } from "@/server/services/profile";
import { Logo } from "@/components/app/logo";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const [profile, skills] = await Promise.all([getEditableProfile(user.id), listSkills()]);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo href="/dashboard" />
          <span className="text-xs text-muted">Signed in as {user.displayName}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <OnboardingFlow
          skills={skills}
          initialStep={Math.min(profile.onboardingStep, 4)}
          alreadyOnboarded={Boolean(profile.onboardedAt)}
          initial={{
            userId: user.id,
            username: profile.username,
            displayName: profile.displayName,
            headline: profile.headline,
            bio: profile.bio,
            intendedMajor: profile.intendedMajor,
            academicInterests: profile.academicInterests,
            causes: profile.causes,
            languages: profile.languages,
            preferredCategories: profile.preferredCategories,
            preferredRoles: profile.preferredRoles,
            projectIdeas: profile.projectIdeas,
            availability: profile.availability,
            experienceLevel: profile.experienceLevel,
            region: profile.region,
            visibility: profile.visibility,
            websiteUrl: profile.websiteUrl,
            githubUrl: profile.githubUrl,
            linkedinUrl: profile.linkedinUrl,
            avatarHue: profile.avatarHue,
            hasAvatar: profile.hasAvatar,
            avatarVersion: profile.avatarUpdatedAt?.getTime() ?? null,
            skills: profile.skills,
          }}
        />
      </main>
    </div>
  );
}
