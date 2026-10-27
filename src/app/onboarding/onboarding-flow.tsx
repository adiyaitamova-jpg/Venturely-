"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ONBOARDING_STEPS } from "@/lib/validation/profile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SkillOption } from "@/components/forms/skill-picker";
import {
  AboutSection,
  AvailabilitySection,
  BasicsSection,
  InterestsSection,
  SkillsSection,
  type ProfileInitial,
} from "@/components/profile/profile-sections";

const COPY = [
  { title: "Let's start with the basics", body: "This is how teammates will recognise you. You can change any of it later." },
  { title: "Tell people what drives you", body: "A short, specific bio makes it far easier for the right people to reach out." },
  { title: "What can you bring to a team?", body: "Pick the skills you'd be comfortable using on a real project." },
  { title: "What do you want to work on?", body: "We use this to recommend projects and teammates — never to rank you." },
  { title: "Availability, links and privacy", body: "Last step. Your profile is visible to signed-in members by default." },
];

export function OnboardingFlow({
  initial,
  skills,
  initialStep,
  alreadyOnboarded,
}: {
  initial: ProfileInitial;
  skills: SkillOption[];
  initialStep: number;
  alreadyOnboarded: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(initialStep);
  const [furthest, setFurthest] = React.useState(initialStep);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const go = (n: number) => {
    setStep(n);
    setFurthest((f) => Math.max(f, n));
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const onSaved = (result: { finished: boolean }) => {
    if (step === ONBOARDING_STEPS.length - 1 || (result.finished && step === ONBOARDING_STEPS.length - 1)) {
      router.push("/dashboard?welcome=1");
    } else go(step + 1);
  };

  const footer = (
    <div className="flex items-center gap-1">
      {step > 0 && (
        <Button type="button" variant="ghost" onClick={() => go(step - 1)}>
          Back
        </Button>
      )}
      {step > 0 && (
        <Button type="button" variant="ghost" asChild>
          <Link href="/dashboard">{alreadyOnboarded ? "Exit" : "Finish later"}</Link>
        </Button>
      )}
    </div>
  );
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const submitLabel = isLast ? "Finish and go to dashboard" : "Save and continue";
  const props = { initial, onSaved, footer, submitLabel };

  return (
    <div>
      <nav aria-label="Onboarding progress" className="mb-10">
        <p className="mb-3 text-xs font-medium text-muted tabular">
          Step {step + 1} of {ONBOARDING_STEPS.length}
        </p>
        <ol className="grid grid-cols-5 gap-1.5">
          {ONBOARDING_STEPS.map((s, i) => {
            const reachable = i <= furthest;
            const done = i < furthest || (i < step);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => go(i)}
                  aria-current={i === step ? "step" : undefined}
                  className="group block w-full text-left disabled:cursor-not-allowed"
                >
                  <span className={cn("block h-1 rounded-full transition-colors", i <= step ? "bg-accent" : done ? "bg-accent/40" : "bg-line")} />
                  <span className={cn("mt-2 hidden items-center gap-1 text-xs sm:flex", i === step ? "font-medium text-ink" : reachable ? "text-muted group-hover:text-ink" : "text-faint")}>
                    {done && i !== step && <Check className="size-3 text-accent" aria-hidden />}
                    {s.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-semibold tracking-[-0.025em] outline-none sm:text-[32px]">
        {COPY[step]?.title}
      </h1>
      <p className="mb-8 mt-2 max-w-xl text-[15px] text-muted">{COPY[step]?.body}</p>

      <div key={step} className="animate-slide-up rounded-xl border border-line bg-surface p-5 shadow-xs sm:p-7">
        {step === 0 && <BasicsSection {...props} />}
        {step === 1 && <AboutSection {...props} />}
        {step === 2 && <SkillsSection {...props} skills={skills} />}
        {step === 3 && <InterestsSection {...props} />}
        {step === 4 && <AvailabilitySection {...props} />}
      </div>
      <p className="mt-6 text-center text-xs text-faint">Your progress is saved after each step.</p>
    </div>
  );
}
