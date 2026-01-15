import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ONBOARDING_PATH = "/onboarding";
const DASHBOARD_PATH = "/dashboard";

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/onboarding");

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token) {
    // Never redirect API calls; they must return JSON, not HTML redirects
    // API routes handle their own authentication/authorization
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    const status = (token as any).status as
      | "pending_onboarding"
      | "active"
      | undefined;
    
    console.log("[Middleware] Token status:", status, "for path:", pathname, "email:", token.email);

    // For pending_onboarding users: allow access to login and home page
    // so they can switch to a different account if needed
    // The login page will handle signing them out
    if (status === "pending_onboarding") {
      // Allow login page and home page - login page will handle signout
      if (pathname.startsWith("/login") || pathname === "/") {
        return NextResponse.next();
      }
      // Force other pages to onboarding
      if (pathname !== ONBOARDING_PATH) {
        const url = req.nextUrl.clone();
        url.pathname = ONBOARDING_PATH;
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // For active users: redirect login page to dashboard
    if (pathname.startsWith("/login")) {
      const url = req.nextUrl.clone();
      url.pathname = DASHBOARD_PATH;
      return NextResponse.redirect(url);
    }
    
    // For active users: redirect home page to dashboard
    if (status === "active" && pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = DASHBOARD_PATH;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.ico$).*)"],
};


