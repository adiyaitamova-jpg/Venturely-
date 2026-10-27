export type CompletionInput = {
  headline: string;
  bio: string;
  intendedMajor: string;
  skillsCount: number;
  preferredCategories: unknown[];
  preferredRoles: string[];
  languages: string[];
  hasLinks: boolean;
  portfolioCount: number;
  achievementsCount: number;
  hasAvatarOrHue: boolean;
};

export type CompletionStep = { key: string; label: string; done: boolean; href: string };

/** Profile completeness checklist shown on the dashboard. Weighted equally. */
export function profileCompletion(p: CompletionInput): { percent: number; steps: CompletionStep[] } {
  const steps: CompletionStep[] = [
    { key: "headline", label: "Write a one-line headline", done: p.headline.trim().length > 0, href: "/settings/profile#basics" },
    { key: "bio", label: "Add a short bio (60+ characters)", done: p.bio.trim().length >= 60, href: "/settings/profile#about" },
    { key: "major", label: "Add your intended major", done: p.intendedMajor.trim().length > 0, href: "/settings/profile#about" },
    { key: "skills", label: "List at least 3 skills", done: p.skillsCount >= 3, href: "/settings/profile#skills" },
    { key: "interests", label: "Pick project categories you care about", done: p.preferredCategories.length > 0, href: "/settings/profile#interests" },
    { key: "roles", label: "Say which roles you want to play", done: p.preferredRoles.length > 0, href: "/settings/profile#interests" },
    { key: "languages", label: "Add languages you work in", done: p.languages.length > 0, href: "/settings/profile#about" },
    { key: "portfolio", label: "Add a portfolio entry", done: p.portfolioCount > 0, href: "/settings/portfolio" },
    { key: "achievement", label: "Add an achievement", done: p.achievementsCount > 0, href: "/settings/portfolio#achievements" },
    { key: "links", label: "Link your work (GitHub or website)", done: p.hasLinks, href: "/settings/profile#links" },
  ];
  const done = steps.filter((s) => s.done).length;
  return { percent: Math.round((done / steps.length) * 100), steps };
}
