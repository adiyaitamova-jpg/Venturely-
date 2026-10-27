import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { listOwnAchievements, listOwnPortfolio } from "@/server/services/portfolio";
import { listSkills } from "@/server/services/profile";
import { PortfolioManager } from "./portfolio-manager";
import { AchievementManager } from "./achievement-manager";

export const metadata: Metadata = { title: "Portfolio & achievements" };

const toMonth = (d: Date) => d.toISOString().slice(0, 7);

export default async function PortfolioSettingsPage() {
  const user = await requireUser("/settings/portfolio");
  const [items, achievements, skills] = await Promise.all([listOwnPortfolio(user.id), listOwnAchievements(user.id), listSkills()]);
  return (
    <div className="max-w-4xl space-y-12">
      <PortfolioManager
        skills={skills}
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          kind: i.kind,
          category: i.category,
          date: toMonth(i.date),
          contribution: i.contribution,
          outcome: i.outcome,
          projectUrl: i.projectUrl ?? "",
          evidenceUrl: i.evidenceUrl ?? "",
          mediaUrl: i.mediaUrl ?? "",
          skillIds: i.skills.map((s) => s.id),
          skillNames: i.skills.map((s) => s.name),
        }))}
      />
      <AchievementManager
        items={achievements.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          type: a.type,
          level: a.level,
          category: a.category,
          issuer: a.issuer,
          date: toMonth(a.date),
          evidenceUrl: a.evidenceUrl ?? "",
          status: a.status,
          reviewNote: a.reviewNote,
        }))}
      />
    </div>
  );
}
