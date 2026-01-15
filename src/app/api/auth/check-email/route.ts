import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/airtable";
import { checkRateLimit, loginRateLimiter, getIdentifier } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 attempts per minute per IP
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, loginRateLimiter, 5, 60000);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Te veel pogingen. Probeer het over een minuut opnieuw." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          }
        }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "E-mailadres is verplicht" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
      return NextResponse.json(
        { 
          exists: false,
          error: "Er bestaat nog geen account met dit e-mailadres."
        },
        { status: 404 }
      );
    }

    // Check if user is active (completed onboarding)
    if (existingUser.status !== "active") {
      return NextResponse.json(
        { 
          exists: true,
          active: false,
          error: "Dit account is nog niet geactiveerd. Voltooi eerst de onboarding."
        },
        { status: 403 }
      );
    }

    // User exists and is active
    return NextResponse.json({ 
      exists: true, 
      active: true 
    });

  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het controleren van het e-mailadres" },
      { status: 500 }
    );
  }
}
