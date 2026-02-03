import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ONBOARDING_PATH = "/onboarding";
const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";

/**
 * Middleware for database session strategy
 * 
 * With database sessions, we can't validate the session in middleware (Edge runtime).
 * Instead, we:
 * 1. Check if a session cookie exists (basic filter)
 * 2. Let the actual pages/APIs validate the session via getServerSession()
 * 
 * This is secure because getServerSession() in pages/APIs validates against the database.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for session cookie (NextAuth uses different names based on environment)
  const sessionToken = 
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value;

  const hasSessionCookie = !!sessionToken;

  // Never redirect API calls in middleware
  // API routes handle their own auth via getServerSession()
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public routes - always accessible
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding");

  // Protected routes - require session cookie
  // The actual session validation happens in the page/API via getServerSession()
  if (!hasSessionCookie && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  // If user has a session cookie, redirect home to dashboard
  // The dashboard page will validate the actual session
  // Note: We always allow access to /login because:
  // 1. It handles pending_onboarding users (signs them out so they can login with a different account)
  // 2. Users should be able to switch accounts from onboarding flow
  if (hasSessionCookie && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.ico$).*)"],
};


