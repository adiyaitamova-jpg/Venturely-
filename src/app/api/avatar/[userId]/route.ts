import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current-user";
import { canViewUser } from "@/server/services/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (userId.length > 64) return new Response(null, { status: 404 });
  const viewer = await getCurrentUser();
  if (!(await canViewUser(viewer?.id ?? null, userId))) return new Response(null, { status: 404 });
  const profile = await db.profile.findUnique({ where: { userId }, select: { avatarData: true, avatarMime: true } });
  if (!profile?.avatarData || !profile.avatarMime) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(profile.avatarData), {
    headers: {
      "Content-Type": profile.avatarMime,
      "Cache-Control": "private, max-age=86400",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
