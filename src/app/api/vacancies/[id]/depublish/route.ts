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
import { triggerWebflowSync } from "@/lib/webflow-sync";

/**
 * POST /api/vacancies/[id]/depublish
 * Takes a published vacancy offline (depublish).
 * - Validates vacancy ownership
 * - Checks vacancy is in "gepubliceerd" status
 * - Updates status to "gedepubliceerd"
 * - Sets depublished-at to current timestamp
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

    // Only gepubliceerd vacancies can be depublished
    if (vacancy.status !== "gepubliceerd") {
      return NextResponse.json(
        {
          error:
            "Alleen gepubliceerde vacatures kunnen offline worden gehaald",
        },
        { status: 400 }
      );
    }

    // Depublish the vacancy
    const updatedVacancy = await updateVacancy(id, {
      status: "gedepubliceerd",
      "depublished-at": new Date().toISOString(),
      needs_webflow_sync: true,
    });

    // Trigger Webflow sync
    await triggerWebflowSync(id);

    // Log event
    await logEvent({
      event_type: "vacancy_depublish",
      actor_user_id: user.id,
      employer_id: user.employer_id,
      vacancy_id: vacancy.id,
      source: "web",
      ip_address: getClientIP(request),
      payload: {
        action: "depublish",
        previous_status: "gepubliceerd",
        new_status: "gedepubliceerd",
      },
    });

    return NextResponse.json({
      success: true,
      vacancy: updatedVacancy,
    });
  } catch (error: unknown) {
    console.error("Error depublishing vacancy:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het offline halen van de vacature" },
      { status: 500 }
    );
  }
}
