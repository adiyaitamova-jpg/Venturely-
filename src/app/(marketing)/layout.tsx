import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Product" className="hidden items-center gap-6 text-sm text-ink-2 md:flex">
            <Link href="/projects" className="hover:text-ink">
              Projects
            </Link>
            <Link href="/leaderboard" className="hover:text-ink">
              Leaderboard
            </Link>
            <Link href="/leaderboard/methodology" className="hover:text-ink">
              How ranking works
            </Link>
            <Link href="/guidelines" className="hover:text-ink">
              Safety
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">Find your team</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{BRAND.tagline} A place for students to find teammates and do work they&apos;re proud of.</p>
          </div>
          {[
            { title: "Product", links: [["Projects", "/projects"], ["Leaderboard", "/leaderboard"], ["How ranking works", "/leaderboard/methodology"], ["AI Mentor", "/mentor"]] },
            { title: "Company", links: [["Contact", "/contact"], ["Community guidelines", "/guidelines"]] },
            { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href!} className="text-ink-2 hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-faint sm:px-6">
            © {new Date().getFullYear()} {BRAND.name}. For students aged 13+. Rankings and AI feedback are advisory and are not admissions evaluations.
          </p>
        </div>
      </footer>
    </div>
  );
}
