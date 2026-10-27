import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/discover", "/mentor", "/requests", "/saved", "/settings", "/notifications", "/admin", "/onboarding", "/projects/new"];

/**
 * Fast, cookie-presence gate so signed-out visitors are redirected before any
 * rendering. Every page and action still validates the session server-side.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (needsAuth && !req.cookies.get("vt_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
