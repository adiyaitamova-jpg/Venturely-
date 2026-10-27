import { cn, initials } from "@/lib/utils";

export type AvatarUser = {
  id: string;
  displayName: string;
  avatarHue: number;
  hasAvatar?: boolean;
  avatarVersion?: number | null;
};

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl",
} as const;

/**
 * Restrained avatar treatment: uploaded photo when present, otherwise a muted
 * monogram tinted by the user's chosen hue (low chroma so it stays editorial).
 */
export function Avatar({ user, size = "md", className }: { user: AvatarUser; size?: keyof typeof SIZES; className?: string }) {
  const bg = `oklch(0.93 0.03 ${user.avatarHue})`;
  const fg = `oklch(0.38 0.06 ${user.avatarHue})`;
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full font-semibold tracking-tight ring-1 ring-ink/5",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {user.hasAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- served from our own validated route
        <img
          src={`/api/avatar/${user.id}${user.avatarVersion ? `?v=${user.avatarVersion}` : ""}`}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className={size === "xl" ? "font-display font-normal" : undefined}>{initials(user.displayName)}</span>
      )}
    </span>
  );
}
