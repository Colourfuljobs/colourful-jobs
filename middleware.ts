import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ONBOARDING_PATH = "/onboarding";
const DASHBOARD_PATH = "/dashboard";

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // #region agent log
  console.log("[DEBUG-MW] middleware", {
    pathname,
    hasToken: !!token,
    tokenStatus: (token as any)?.status,
  });
  // #endregion

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
    // If user is logged in and tries to access login page, redirect to dashboard
    if (pathname.startsWith("/login")) {
      const url = req.nextUrl.clone();
      url.pathname = DASHBOARD_PATH;
      return NextResponse.redirect(url);
    }
    
    const status = (token as any).status as
      | "pending_onboarding"
      | "active"
      | undefined;
    if (status === "pending_onboarding" && pathname !== ONBOARDING_PATH) {
      const url = req.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      return NextResponse.redirect(url);
    }
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


