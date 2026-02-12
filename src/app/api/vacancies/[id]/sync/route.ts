import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, getVacancyById, updateVacancy } from "@/lib/airtable";
import { triggerWebflowSync } from "@/lib/webflow-sync";
import { logEvent } from "@/lib/events";

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

    // Get user and verify ownership
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    // Get allowed employer IDs based on role
    const allowedEmployers: string[] = [];
    if (user.role_id === "intermediary") {
      // Intermediaries can access vacancies from all managed employers
      allowedEmployers.push(...(user.managed_employers || []));
    } else {
      // Regular users can only access their employer's vacancies
      if (!user.employer_id) {
        return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 403 });
      }
      allowedEmployers.push(user.employer_id);
    }

    const vacancy = await getVacancyById(id);
    if (!vacancy || !vacancy.employer_id || !allowedEmployers.includes(vacancy.employer_id)) {
      return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
    }

    // Alleen syncen als de vacature al eerder is ingediend
    const submittedStatuses = ["wacht_op_goedkeuring", "gepubliceerd", "verlopen", "gedepubliceerd"];
    if (!submittedStatuses.includes(vacancy.status)) {
      return NextResponse.json({ error: "Vacature is nog niet ingediend" }, { status: 400 });
    }

    // 1. Zet het vangnet-veld
    await updateVacancy(id, { needs_webflow_sync: true });

    // 2. Trigger directe sync via webhook
    await triggerWebflowSync(id);

    // 3. Log event
    await logEvent({
      event_type: "vacancy_updated",
      actor_user_id: user.id,
      employer_id: vacancy.employer_id || null,
      vacancy_id: id,
      source: "web",
      payload: { action: "webflow_sync_requested" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error triggering sync:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het synchroniseren" },
      { status: 500 }
    );
  }
}
