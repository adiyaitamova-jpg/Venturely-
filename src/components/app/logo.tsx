import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // "Ti" monogram: the team (T) and the individual (i) side by side.
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <path d="M5.5 7.5h9M10 7.5V17.5M17.5 11v6.5" fill="none" stroke="#f6f4ef" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="7.4" r="1.45" fill="#f6f4ef" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-md", className)} aria-label={`${BRAND.name} home`}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{BRAND.name}</span>
    </Link>
  );
}
