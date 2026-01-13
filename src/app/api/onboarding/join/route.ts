import { authOptions } from "@/lib/auth";
import { 
  getEmployerById, 
  getUserByEmail,
  updateUser 
} from "@/lib/airtable";
import { doDomainsMatch } from "@/lib/validation";
import { logEvent, getClientIP } from "@/lib/events";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

/**
 * POST /api/onboarding/join
 * Validate email domain against employer's website domain
 * Start the join existing employer flow
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, employer_id } = body;

    if (!email) {
      return NextResponse.json(
        { error: "E-mailadres is verplicht" },
        { status: 400 }
      );
    }

    if (!employer_id) {
      return NextResponse.json(
        { error: "Employer ID is verplicht" },
        { status: 400 }
      );
    }

    // Get the employer to check website_url
    const employer = await getEmployerById(employer_id);
    if (!employer) {
      return NextResponse.json(
        { error: "Werkgever niet gevonden" },
        { status: 404 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser && existingUser.status === "active") {
      return NextResponse.json(
        { error: "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan." },
        { status: 409 }
      );
    }

    // Validate domain match
    if (!employer.website_url) {
      return NextResponse.json(
        { 
          valid: false, 
          error: "Dit werkgeversaccount heeft geen website-URL geconfigureerd. Neem contact op met Colourful jobs." 
        },
        { status: 400 }
      );
    }

    const domainMatches = doDomainsMatch(email, employer.website_url);
    
    if (!domainMatches) {
      return NextResponse.json({
        valid: false,
        error: "De domeinnaam van je e-mailadres komt niet overeen met dit werkgeversaccount. Neem contact op met een contactpersoon binnen het bedrijf of met Colourful jobs.",
      });
    }

    // Domain matches - return success
    return NextResponse.json({
      valid: true,
      employer: {
        id: employer.id,
        company_name: employer.company_name,
        display_name: employer.display_name,
      },
    });
  } catch (error) {
    console.error("Join validation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Er ging iets mis bij de validatie";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/onboarding/join
 * Complete the join flow after email verification
 * Link user to existing employer
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employer_id } = body;
    const clientIP = getClientIP(request);

    if (!employer_id) {
      return NextResponse.json(
        { error: "Employer ID is verplicht" },
        { status: 400 }
      );
    }

    // Verify the employer exists
    const employer = await getEmployerById(employer_id);
    if (!employer) {
      return NextResponse.json(
        { error: "Werkgever niet gevonden" },
        { status: 404 }
      );
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email);
    
    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      );
    }

    // User's first_name, last_name, role were already saved when user was created
    // Now just link to employer and set status to active
    const updatedUser = await updateUser(user.id, {
      employer_id,
      status: "active",
    });

    // Log the user_joined_employer event
    await logEvent({
      event_type: "user_joined_employer",
      actor_user_id: user.id,
      employer_id: employer_id,
      source: "web",
      ip_address: clientIP,
      payload: {
        email: session.user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: employer.company_name,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      employer: {
        id: employer.id,
        company_name: employer.company_name,
        display_name: employer.display_name,
      },
    });
  } catch (error) {
    console.error("Join completion error:", error);
    const errorMessage = error instanceof Error ? error.message : "Er ging iets mis bij het voltooien van de registratie";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
