import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getVacancyById,
  updateVacancy,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent, getClientIP } from "@/lib/events";

/**
 * POST /api/vacancies/[id]/publish
 * Republishes a gedepubliceerd vacancy (no credits needed).
 * - Validates vacancy ownership
 * - Checks vacancy is in "gedepubliceerd" status
 * - Updates status to "gepubliceerd"
 * - Sets last-published-at to current timestamp
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get user and employer
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      );
    }
    if (!user.employer_id) {
      return NextResponse.json(
        { error: "Geen werkgever gekoppeld" },
        { status: 400 }
      );
    }

    // Fetch vacancy
    const vacancy = await getVacancyById(id);
    if (!vacancy) {
      return NextResponse.json(
        { error: "Vacature niet gevonden" },
        { status: 404 }
      );
    }

    // Verify vacancy belongs to user's employer
    if (vacancy.employer_id !== user.employer_id) {
      return NextResponse.json(
        { error: "Geen toegang tot deze vacature" },
        { status: 403 }
      );
    }

    // Only gedepubliceerd vacancies can be manually republished
    if (vacancy.status !== "gedepubliceerd") {
      return NextResponse.json(
        {
          error:
            "Alleen gedepubliceerde vacatures kunnen opnieuw worden gepubliceerd",
        },
        { status: 400 }
      );
    }

    // Check that closing_date is still in the future (otherwise they need to extend via boost)
    if (vacancy.closing_date) {
      const closingDate = new Date(vacancy.closing_date);
      closingDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (closingDate <= today) {
        return NextResponse.json(
          {
            error:
              "De sluitingsdatum van deze vacature is verlopen. Gebruik de boost-optie om de looptijd te verlengen.",
          },
          { status: 400 }
        );
      }
    }

    // Republish the vacancy
    const updatedVacancy = await updateVacancy(id, {
      status: "gepubliceerd",
      "last-published-at": new Date().toISOString(),
    });

    // Log event
    await logEvent({
      event_type: "vacancy_publish",
      actor_user_id: user.id,
      employer_id: user.employer_id,
      vacancy_id: vacancy.id,
      source: "web",
      ip_address: getClientIP(request),
      payload: {
        action: "republish",
        previous_status: "gedepubliceerd",
        new_status: "gepubliceerd",
      },
    });

    return NextResponse.json({
      success: true,
      vacancy: updatedVacancy,
    });
  } catch (error: unknown) {
    console.error("Error publishing vacancy:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het publiceren van de vacature" },
      { status: 500 }
    );
  }
}
