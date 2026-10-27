import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // A "V" built from two converging strokes: two people meeting at a point.
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <path d="M6.5 7.5 12 17l5.5-9.5" fill="none" stroke="#f6f4ef" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7.2" r="1.6" fill="#f6f4ef" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-md", className)} aria-label={`${BRAND.name} home`}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{BRAND.name}</span>
    </Link>
  );
}
