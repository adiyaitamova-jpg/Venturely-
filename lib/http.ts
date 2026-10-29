import { NextResponse, type NextRequest } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Rejects cross-site writes: browsers send Origin on fetch POST/PUT, and it must match this host. */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) throw new HttpError(403, "forbidden", "Cross-site request blocked.");
  if (!(req.headers.get("content-type") || "").includes("application/json")) throw new HttpError(415, "invalid_argument", "Expected JSON.");
}

export async function readJson<T>(req: NextRequest, maxBytes: number): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "invalid_argument", "Request too large.");
  try { return JSON.parse(text) as T; } catch { throw new HttpError(400, "invalid_argument", "Invalid JSON."); }
}

export function clientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function handle(fn: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
      console.error(err);
      return json({ error: "Something went wrong.", code: "unavailable" }, 500);
    }
  };
}
