"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ADMIN_NAV, PERSONAL_NAV, PRIMARY_NAV, PUBLIC_NAV, isActive, type NavItem } from "./nav-config";
import type { ShellCounts, ShellUser } from "./shell-types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function NavLink({ item, pathname, count, onNavigate }: { item: NavItem; pathname: string; count?: number; onNavigate?: () => void }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-md px-2.5 text-[13.5px] transition-colors",
        active ? "bg-surface-raised font-medium text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
      )}
    >
      <Icon className={cn("size-[17px] shrink-0", active ? "text-accent" : "text-muted group-hover:text-ink-2")} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {count ? (
        <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-medium leading-5 text-white tabular" aria-label={`${count} pending`}>
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function SidebarNav({ user, counts, onNavigate }: { user: ShellUser | null; counts: ShellCounts; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo href={user ? "/dashboard" : "/"} />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 pt-3">
        <div className="space-y-0.5">
          {(user ? PRIMARY_NAV : PUBLIC_NAV).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
        {user && (
          <div className="space-y-0.5">
            <p className="px-2.5 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">You</p>
            {PERSONAL_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                count={item.badgeKey ? counts[item.badgeKey] : undefined}
                onNavigate={onNavigate}
              />
            ))}
            {user.role === "ADMIN" && <NavLink item={ADMIN_NAV} pathname={pathname} onNavigate={onNavigate} />}
          </div>
        )}
      </nav>
      <div className="border-t border-line p-3">
        {user ? (
          <Link
            href={`/u/${user.username}`}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-paper-2"
          >
            <Avatar user={user} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{user.displayName}</span>
              <span className="block truncate text-xs text-muted">@{user.username}</span>
            </span>
          </Link>
        ) : (
          <div className="space-y-2 p-1">
            <p className="text-[13px] leading-snug text-muted">Join to find teammates, track projects and get AI feedback.</p>
            <Button asChild className="w-full">
              <Link href="/sign-up">Create account</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/sign-in">
                <LogIn /> Sign in
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
