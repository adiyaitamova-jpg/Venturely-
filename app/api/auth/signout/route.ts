import { destroySession } from "@/lib/auth";
import { assertSameOrigin, handle, json } from "@/lib/http";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  await destroySession();
  return json({ ok: true });
});
