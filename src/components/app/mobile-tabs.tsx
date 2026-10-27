"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, isActive } from "./nav-config";
import type { ShellCounts } from "./shell-types";

/** Bottom tab bar for phones; the full menu stays reachable from the top bar. */
export function MobileTabs({ counts }: { counts: ShellCounts }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          const count = item.badgeKey ? counts[item.badgeKey] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-14 flex-col items-center justify-center gap-1 text-[10.5px]", active ? "font-medium text-accent" : "text-muted")}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
                {count > 0 && <span className="absolute right-[calc(50%-16px)] top-2 size-2 rounded-full bg-accent ring-2 ring-surface-raised" aria-label={`${count} pending`} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
