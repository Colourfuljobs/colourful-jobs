import { NextRequest, NextResponse } from "next/server";
import { createSession, getUserById } from "@/lib/airtable";
import { logEvent } from "@/lib/events";
import { checkRateLimit, apiRateLimiter, getIdentifier } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

/**
 * Admin Impersonate Endpoint
 * 
 * Allows admins to login as any user directly from Airtable.
 * 
 * Accepts the secret via either:
 * 1. Authorization header: "Bearer YOUR_SECRET" (preferred)
 * 2. Query parameter: ?secret=YOUR_SECRET (legacy, for Airtable button URLs)
 * 
 * Required env var:
 * ADMIN_IMPERSONATE_SECRET - A secret key that must match
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 10 attempts per minute per IP
  const identifier = getIdentifier(request);
  const rateLimitResult = await checkRateLimit(identifier, apiRateLimiter, 10, 60000);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Te veel pogingen. Probeer het later opnieuw." },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  
  // Accept secret from Authorization header (preferred) or query param (legacy)
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ") 
    ? authHeader.slice(7) 
    : searchParams.get("secret");

  // Validate required parameters
  if (!userId || !secret) {
    return NextResponse.json(
      { error: "Missing required parameters: userId and secret" },
      { status: 400 }
    );
  }

  // Validate secret
  const adminSecret = process.env.ADMIN_IMPERSONATE_SECRET;
  if (!adminSecret) {
    console.error("[Admin:Impersonate] ADMIN_IMPERSONATE_SECRET not configured");
    return NextResponse.json(
      { error: "Server not configured for impersonation" },
      { status: 500 }
    );
  }

  if (secret !== adminSecret) {
    console.warn("[Admin:Impersonate] Invalid secret attempted", { userId });
    return NextResponse.json(
      { error: "Invalid secret" },
      { status: 403 }
    );
  }

  // Validate user exists
  const user = await getUserById(userId);
  if (!user) {
    console.warn("[Admin:Impersonate] User not found", { userId });
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  try {
    // Generate session token and expiration (14 days, same as normal sessions)
    const sessionToken = randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);

    // Create session in Airtable
    await createSession(userId, sessionToken, expires);

    console.log("[Admin:Impersonate] Session created for user", { 
      userId, 
      userEmail: user.email,
      expires: expires.toISOString() 
    });

    // Log the impersonation event for audit
    await logEvent({
      event_type: "user_login",
      actor_user_id: userId,
      employer_id: user.employer_id || null,
      source: "admin",
      payload: { impersonation: true },
    });

    // Determine the correct cookie name based on environment
    // On HTTPS (production), NextAuth uses __Secure- prefix
    const isSecure = request.nextUrl.protocol === "https:";
    const cookieName = isSecure 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token";

    // Create redirect response to dashboard
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);

    // Set the session cookie
    response.cookies.set(cookieName, sessionToken, {
      path: "/",
      expires,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[Admin:Impersonate] Failed to create session", { 
      userId, 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// Ensure this route is dynamic (not statically generated)
export const dynamic = "force-dynamic";
