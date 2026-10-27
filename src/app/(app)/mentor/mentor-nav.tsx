"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/mentor", label: "Overview", exact: true },
  { href: "/mentor/match", label: "Teammate Matcher" },
  { href: "/mentor/evaluate", label: "Project Evaluator" },
  { href: "/mentor/copilot", label: "Project Copilot" },
];

export function MentorNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mentor tools" className="-mx-4 overflow-x-auto border-b border-line px-4 scrollbar-none sm:mx-0 sm:px-0">
      <ul className="flex gap-6">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("-mb-px inline-block whitespace-nowrap border-b-2 py-2.5 text-sm", active ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink")}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
