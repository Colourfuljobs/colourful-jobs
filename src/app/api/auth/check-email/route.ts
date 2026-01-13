import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/airtable";

export async function POST(request: Request) {
  try {
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
