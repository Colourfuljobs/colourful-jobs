import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/airtable";
import { checkRateLimit, loginRateLimiter, getIdentifier } from "@/lib/rate-limit";
import { z } from "zod";

// Email validation schema
const emailSchema = z.string().email();

export async function POST(request: Request) {
  let email: string | undefined;
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

    const body = await request.json();
    email = body.email;

    if (!email) {
      return NextResponse.json(
        { error: "E-mailadres is verplicht" },
        { status: 400 }
      );
    }

    // Validate email format early
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: "Voer een geldig e-mailadres in (bijv. naam@bedrijf.nl)" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
      console.log(`[check-email] User not found for email: ${email}`);
      return NextResponse.json(
        { 
          exists: false,
          error: "Er bestaat nog geen account met dit e-mailadres."
        },
        { status: 404 }
      );
    }

    console.log(`[check-email] User found: ${existingUser.id}, status: ${existingUser.status}`);

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
    console.error("[check-email] Error checking email:", error);
    console.error("[check-email] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email,
    });
    return NextResponse.json(
      { error: "Er ging iets mis bij het controleren van het e-mailadres" },
      { status: 500 }
    );
  }
}
