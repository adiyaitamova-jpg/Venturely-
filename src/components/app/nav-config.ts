import {
  Bookmark,
  Compass,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Additional path prefixes that should mark this item active. */
  match?: string[];
  badgeKey?: "requests";
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover", label: "Discover people", icon: Compass, match: ["/u/"] },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/mentor", label: "AI Mentor", icon: Sparkles },
];

export const PERSONAL_NAV: NavItem[] = [
  { href: "/requests", label: "Requests", icon: Inbox, badgeKey: "requests" },
  { href: "/saved", label: "Saved profiles", icon: Bookmark },
  { href: "/settings/profile", label: "Settings", icon: Settings, match: ["/settings"] },
];

export const PUBLIC_NAV: NavItem[] = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export const ADMIN_NAV: NavItem = { href: "/admin", label: "Moderation", icon: ShieldCheck };
export const PROFILE_ICON = UserRound;

export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/discover", label: "People", icon: Compass, match: ["/u/"] },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/mentor", label: "Mentor", icon: Sparkles },
  { href: "/requests", label: "Requests", icon: Inbox, badgeKey: "requests" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return item.match?.some((m) => pathname.startsWith(m)) ?? false;
}

/** Title shown in the top bar for a given path. */
export function sectionTitle(pathname: string): string {
  const all = [...PRIMARY_NAV, ...PERSONAL_NAV, ADMIN_NAV, { href: "/notifications", label: "Notifications", icon: Inbox }, { href: "/search", label: "Search", icon: Compass }];
  const hit = all.find((i) => isActive(pathname, i));
  if (pathname.startsWith("/u/")) return "Profile";
  return hit?.label ?? "Venturely";
}
