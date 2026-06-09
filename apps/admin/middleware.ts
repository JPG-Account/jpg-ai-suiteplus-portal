// Route guard — unauth requests to admin pages get redirected to /sign-in.
// /api/* routes do their own auth via withSuperAdmin (returns 401 JSON).
// V0.9-Crawl-A: also enforces double-submit CSRF on state-changing API verbs.
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/auth/cookie-name";

const PUBLIC_PATHS = new Set(["/sign-in", "/set-password"]);
const PUBLIC_API_PREFIXES = [
  "/api/auth/sign-in",
  "/api/auth/sign-out",
  "/api/auth/set-password",
  "/api/csrf",
  "/api/config/",
  "/api/health",
  "/api/preview/draft", // portal pulls draft bundle via shared secret
];

const CSRF_COOKIE = "suite_plus_csrf";
const CSRF_HEADER = "x-csrf-token";
const CSRF_EXEMPT_API_PREFIXES = ["/api/auth/sign-in", "/api/auth/set-password", "/api/config/"];
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) CSRF guard for state-changing API requests (before public/auth checks).
  if (pathname.startsWith("/api/") && STATE_CHANGING.has(req.method)) {
    const exempt = CSRF_EXEMPT_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (!exempt) {
      const headerVal = req.headers.get(CSRF_HEADER);
      const cookieVal = req.cookies.get(CSRF_COOKIE)?.value;
      if (!headerVal || !cookieVal || headerVal !== cookieVal) {
        return NextResponse.json({ error: "csrf_invalid" }, { status: 403 });
      }
    }
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // 2) Session presence (cheap front-line filter; routes re-verify).
  const hasCookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!hasCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
