import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge auth gate. Redirects unauthenticated requests to /login *before* the
 * app shell renders, eliminating the client-side "spinner flash" of AuthGuard.
 *
 * Trust model: this only checks for a session cookie's presence — token
 * validity is still enforced by the backend on every API call. Don't use the
 * cookie value here for authorization.
 *
 * Cookie name comes from BE's AUTH_ACCESS_COOKIE_NAME (apps/backend/.env,
 * default `access_token`). Override with NEXT_PUBLIC_SESSION_COOKIE if the
 * BE side is renamed.
 */
const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE ?? "access_token";

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  // Preserve where the user was heading so we can bounce them back after login.
  loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

/**
 * Match every protected route group. Public routes (landing, auth pages,
 * api routes, static assets, _next, favicon) are intentionally excluded.
 */
export const config = {
  matcher: [
    "/home",
    "/home/:path*",
    "/settings",
    "/settings/:path*",
    "/employees",
    "/employees/:path*",
    "/departments",
    "/departments/:path*",
    "/orgchart",
    "/orgchart/:path*",
    "/timesheet",
    "/timesheet/:path*",
    "/admin",
    "/admin/:path*",
    "/requests",
    "/requests/:path*",
  ],
};
