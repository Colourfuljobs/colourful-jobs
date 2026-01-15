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

  // Public routes - always accessible
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/onboarding");

  // Protected routes - require session cookie
  // The actual session validation happens in the page/API via getServerSession()
  if (!hasSessionCookie && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  // Never redirect API calls in middleware
  // API routes handle their own auth via getServerSession()
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // If user has a session cookie, redirect login to dashboard
  // The dashboard page will validate the actual session
  if (hasSessionCookie && pathname.startsWith("/login")) {
    // Check if this is a callback from magic link (has callbackUrl or token params)
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    const token = req.nextUrl.searchParams.get("token");
    
    // Allow login page if it's processing auth callback
    if (callbackUrl || token) {
      return NextResponse.next();
    }
    
    const url = req.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.ico$).*)"],
};


