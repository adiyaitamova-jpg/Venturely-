"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { sectionTitle } from "./nav-config";
import { SidebarNav } from "./sidebar";
import { LogoMark } from "./logo";
import type { ShellCounts, ShellUser } from "./shell-types";

function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = React.useState(pathname === "/search" ? (params.get("q") ?? "") : "");
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        aria-label="Search people and projects"
        placeholder="Search people and projects"
        className="h-9 w-full rounded-md border border-line bg-surface-raised pl-8 pr-12 text-sm text-ink shadow-xs outline-none placeholder:text-faint focus:border-accent focus:ring-3 focus:ring-accent/15"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-paper px-1.5 font-mono text-[10px] text-faint md:block">
        ⌘K
      </kbd>
    </form>
  );
}

export function Topbar({ user, counts }: { user: ShellUser | null; counts: ShellCounts }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const title = sectionTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Open navigation">
              <Menu className="!size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent side="left" title="Navigation" className="p-0 [&>div:first-child]:hidden [&>div:last-child]:p-0">
            <SidebarNav user={user} counts={counts} onNavigate={() => setMenuOpen(false)} />
          </DialogContent>
        </Dialog>
        <Link href={user ? "/dashboard" : "/"} className="lg:hidden" aria-label="Home">
          <LogoMark />
        </Link>
        <p className="hidden truncate text-sm font-medium text-ink sm:block lg:min-w-40">{title}</p>

        <GlobalSearch className="ml-auto hidden w-full max-w-sm md:block" />

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Search">
            <Link href="/search">
              <Search />
            </Link>
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}>
                <Link href="/notifications">
                  <Bell />
                  {counts.notifications > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-paper" />}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 rounded-full" aria-label="Account menu">
                  <Avatar user={user} size="sm" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    <span className="block text-sm font-medium text-ink">{user.displayName}</span>
                    <span className="block">@{user.username}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${user.username}`}>
                      <UserRound /> View profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile">
                      <Settings /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOutAction()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/sign-up">Join</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
