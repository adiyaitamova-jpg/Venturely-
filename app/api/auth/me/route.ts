import { currentUser } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const user = await currentUser();
  return json({ user: user ? { id: user.id, isAdmin: user.isAdmin } : null, ai: Boolean(process.env.ANTHROPIC_API_KEY) });
});
