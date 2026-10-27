import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { getEditableProfile, listSkills } from "@/server/services/profile";
import { ProfileSettings } from "./profile-settings";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const user = await requireUser("/settings/profile");
  const [p, skills] = await Promise.all([getEditableProfile(user.id), listSkills()]);
  return (
    <ProfileSettings
      skills={skills}
      initial={{
        userId: user.id,
        username: p.username,
        displayName: p.displayName,
        headline: p.headline,
        bio: p.bio,
        intendedMajor: p.intendedMajor,
        academicInterests: p.academicInterests,
        causes: p.causes,
        languages: p.languages,
        preferredCategories: p.preferredCategories,
        preferredRoles: p.preferredRoles,
        projectIdeas: p.projectIdeas,
        availability: p.availability,
        experienceLevel: p.experienceLevel,
        region: p.region,
        visibility: p.visibility,
        websiteUrl: p.websiteUrl,
        githubUrl: p.githubUrl,
        linkedinUrl: p.linkedinUrl,
        avatarHue: p.avatarHue,
        hasAvatar: p.hasAvatar,
        avatarVersion: p.avatarUpdatedAt?.getTime() ?? null,
        skills: p.skills,
      }}
    />
  );
}
