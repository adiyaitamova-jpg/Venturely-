"use client";

import type { SkillOption } from "@/components/forms/skill-picker";
import {
  AboutSection,
  AvailabilitySection,
  BasicsSection,
  InterestsSection,
  SkillsSection,
  type ProfileInitial,
} from "@/components/profile/profile-sections";

const SECTIONS = [
  { id: "basics", title: "Basics", description: "Name, username, photo and headline." },
  { id: "about", title: "About", description: "Bio, field of study, languages." },
  { id: "skills", title: "Skills", description: "What you can contribute, with honest proficiency." },
  { id: "interests", title: "Interests", description: "Projects, roles and causes you care about." },
  { id: "links", title: "Availability, links & visibility", description: "When you can help and who can see you." },
];

export function ProfileSettings({ initial, skills }: { initial: ProfileInitial; skills: SkillOption[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Profile sections" className="hidden lg:block">
        <ul className="sticky top-20 space-y-1 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block rounded-md px-2.5 py-1.5 text-muted hover:bg-paper-2 hover:text-ink">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="max-w-3xl space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-20 rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-6">
            <h2 id={`${s.id}-title`} className="text-base font-semibold tracking-[-0.01em]">
              {s.title}
            </h2>
            <p className="mb-5 mt-0.5 text-[13px] text-muted">{s.description}</p>
            {s.id === "basics" && <BasicsSection initial={initial} />}
            {s.id === "about" && <AboutSection initial={initial} />}
            {s.id === "skills" && <SkillsSection initial={initial} skills={skills} />}
            {s.id === "interests" && <InterestsSection initial={initial} />}
            {s.id === "links" && <AvailabilitySection initial={initial} />}
          </section>
        ))}
      </div>
    </div>
  );
}
