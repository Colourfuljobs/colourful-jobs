import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getVacanciesByEmployerId,
  createVacancy,
  VacancyStatus,
  VacancyInputType,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent } from "@/lib/events";

/**
 * GET /api/vacancies
 * Fetches vacancies for the current user's employer
 * Query params:
 * - status: filter by status (comma-separated for multiple)
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get user
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    // Determine which employer(s) to fetch vacancies for
    let employerId: string | null = null;
    if (user.role_id === "intermediary") {
      // For intermediaries, use active_employer if set
      if (!user.active_employer) {
        // No active employer selected - return empty list or all managed employers' vacancies
        // For now, return empty list (they need to select an employer first)
        return NextResponse.json({ vacancies: [] });
      }
      employerId = user.active_employer;
    } else {
      // For regular employers, use employer_id
      if (!user.employer_id) {
        return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 400 });
      }
      employerId = user.employer_id;
    }

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    
    let statusFilter: VacancyStatus | VacancyStatus[] | undefined;
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim()) as VacancyStatus[];
      statusFilter = statuses.length === 1 ? statuses[0] : statuses;
    }

    // Fetch vacancies
    const vacancies = await getVacanciesByEmployerId(employerId, {
      status: statusFilter,
    });

    return NextResponse.json({ vacancies });
  } catch (error: unknown) {
    console.error("Error fetching vacancies:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van vacatures" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vacancies
 * Creates a new vacancy as concept
 * Body:
 * - title?: string
 * - input_type?: "self_service" | "we_do_it_for_you"
 * - package_id?: string
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get user
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    // Determine employer_id based on role
    let employerId: string | null = null;
    if (user.role_id === "intermediary") {
      // For intermediaries, use active_employer
      if (!user.active_employer) {
        return NextResponse.json(
          { error: "Selecteer eerst een werkgever" },
          { status: 400 }
        );
      }
      employerId = user.active_employer;
    } else {
      // For regular employers, use employer_id
      if (!user.employer_id) {
        return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 400 });
      }
      employerId = user.employer_id;
    }

    // Parse request body
    const body = await request.json();
    const { title, input_type, package_id } = body as {
      title?: string;
      input_type?: VacancyInputType;
      package_id?: string;
    };

    // Create vacancy
    const vacancy = await createVacancy({
      employer_id: employerId,
      user_id: user.id,
      title,
      input_type,
      package_id,
    });

    // Log event
    await logEvent({
      event_type: "vacancy_created",
      actor_user_id: user.id,
      employer_id: employerId,
      vacancy_id: vacancy.id,
      source: "web",
      payload: {
        input_type: vacancy.input_type,
        package_id: vacancy.package_id,
        role_id: user.role_id,
      },
    });

    return NextResponse.json({ vacancy }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating vacancy:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het aanmaken van de vacature" },
      { status: 500 }
    );
  }
}
