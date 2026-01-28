import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getVacancyById,
  updateVacancy,
  VacancyRecord,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent } from "@/lib/events";

/**
 * GET /api/vacancies/[id]
 * Fetches a single vacancy by ID
 */
export async function GET(
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
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }
    if (!user.employer_id) {
      return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 400 });
    }

    // Fetch vacancy
    const vacancy = await getVacancyById(id);
    if (!vacancy) {
      return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
    }

    // Verify vacancy belongs to user's employer
    if (vacancy.employer_id !== user.employer_id) {
      return NextResponse.json({ error: "Geen toegang tot deze vacature" }, { status: 403 });
    }

    return NextResponse.json({ vacancy });
  } catch (error: unknown) {
    console.error("Error fetching vacancy:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van de vacature" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/vacancies/[id]
 * Updates a vacancy
 * Body: Partial<VacancyRecord>
 */
export async function PATCH(
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
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }
    if (!user.employer_id) {
      return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 400 });
    }

    // Fetch existing vacancy
    const existingVacancy = await getVacancyById(id);
    if (!existingVacancy) {
      return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
    }

    // Verify vacancy belongs to user's employer
    if (existingVacancy.employer_id !== user.employer_id) {
      return NextResponse.json({ error: "Geen toegang tot deze vacature" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const updates = body as Partial<VacancyRecord>;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.employer_id;
    delete updates.credits_spent;
    delete updates.credit_transactions;
    delete updates.events;
    
    // Remove linked record fields if they're not valid arrays with record IDs
    // Airtable linked record fields must be arrays of valid record IDs
    const linkedRecordFields = [
      'header_image',
      'gallery',
      'package_id', 
      'region_id', 
      'function_type_id', 
      'education_level_id', 
      'field_id', 
      'sector_id',
      'contact_photo_id',
      'selected_upsells',
      'users',
    ];
    
    for (const field of linkedRecordFields) {
      const value = updates[field as keyof typeof updates];
      // Remove if null, undefined, empty string, or empty array
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        delete updates[field as keyof typeof updates];
      }
    }
    
    // Also remove timestamp fields that are read-only or managed by the system
    delete updates["created-at"];
    delete updates["updated-at"];
    delete updates["last-status_changed-at"];
    
    // Remove empty date fields (Airtable doesn't accept empty strings for date fields)
    if (updates.closing_date === '' || updates.closing_date === null) {
      delete updates.closing_date;
    }

    // Update vacancy
    const vacancy = await updateVacancy(id, updates);

    // Log event
    await logEvent({
      event_type: "vacancy_updated",
      actor_user_id: user.id,
      employer_id: user.employer_id,
      vacancy_id: vacancy.id,
      source: "web",
      payload: {
        updated_fields: Object.keys(updates),
      },
    });

    return NextResponse.json({ vacancy });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error("Error updating vacancy:", errorMessage);
    // Log more details for debugging
    console.error("Error details:", error);
    return NextResponse.json(
      { error: `Er ging iets mis bij het updaten van de vacature: ${errorMessage}` },
      { status: 500 }
    );
  }
}
