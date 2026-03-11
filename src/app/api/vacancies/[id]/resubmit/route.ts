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
 * POST /api/vacancies/[id]/resubmit
 * Re-submits a needs_adjustment vacancy for approval (no credits needed).
 * - Validates vacancy ownership
 * - Checks vacancy is in "needs_adjustment" status
 * - Saves vacancy data, clears rejection_reason
 * - Updates status to "wacht_op_goedkeuring"
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    const allowedEmployers: string[] = [];
    if (user.role_id === "intermediary") {
      allowedEmployers.push(...(user.managed_employers || []));
    } else {
      if (!user.employer_id) {
        return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 400 });
      }
      allowedEmployers.push(user.employer_id);
    }

    const vacancy = await getVacancyById(id);
    if (!vacancy) {
      return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
    }

    if (!vacancy.employer_id || !allowedEmployers.includes(vacancy.employer_id)) {
      return NextResponse.json({ error: "Geen toegang tot deze vacature" }, { status: 403 });
    }

    if (vacancy.status !== "needs_adjustment") {
      return NextResponse.json(
        { error: "Alleen vacatures met status 'aanpassing nodig' kunnen opnieuw worden ingestuurd" },
        { status: 400 }
      );
    }

    const updatedVacancy = await updateVacancy(id, {
      status: "wacht_op_goedkeuring",
    });

    await logEvent({
      event_type: "vacancy_updated",
      actor_user_id: user.id,
      employer_id: vacancy.employer_id || null,
      vacancy_id: vacancy.id,
      source: "web",
      ip_address: getClientIP(request),
      payload: {
        action: "resubmit",
        previous_status: "needs_adjustment",
        new_status: "wacht_op_goedkeuring",
      },
    });

    return NextResponse.json({
      success: true,
      vacancy: updatedVacancy,
    });
  } catch (error: unknown) {
    console.error("Error resubmitting vacancy:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het opnieuw insturen van de vacature" },
      { status: 500 }
    );
  }
}
