import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getVacancyById,
  updateVacancy,
  getTransactionsByVacancyId,
  vacancyStatusEnum,
  vacancyInputTypeEnum,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent } from "@/lib/events";
import { z } from "zod";

const optionalString = z.string().max(5000).optional().nullable();
const optionalShortString = z.string().max(500).optional().nullable();

const vacancyPatchSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  status: vacancyStatusEnum.optional(),
  input_type: vacancyInputTypeEnum.optional(),

  intro_txt: optionalString,
  description: z.string().max(50000).optional().nullable(),

  location: optionalShortString,
  hrs_per_week: optionalShortString,
  salary: optionalShortString,

  education_level_id: optionalShortString,
  field_id: optionalShortString,
  function_type_id: optionalShortString,
  region_id: optionalShortString,
  sector_id: optionalShortString,

  package_id: optionalShortString,
  selected_upsells: z.array(z.string()).optional(),

  apply_url: z.string().max(1000).optional().nullable(),
  application_email: optionalShortString,
  show_apply_form: z.boolean().optional(),

  contact_name: optionalShortString,
  contact_role: optionalShortString,
  contact_email: optionalShortString,
  contact_phone: optionalShortString,
  contact_photo_id: optionalShortString,

  recommendations: z.string().max(10000).optional().nullable(),
  note: optionalString,

  header_image: optionalShortString,
  gallery: z.array(z.string()).optional(),

  closing_date: z.string().max(30).optional().nullable().or(z.literal("")),

  needs_webflow_sync: z.boolean().optional(),
  needs_webflow_archive: z.boolean().optional(),
  high_priority: z.boolean().optional(),
  is_featured: z.boolean().optional(),
}).strip();

/**
 * GET /api/vacancies/[id]
 * Fetches a single vacancy by ID
 * Query params:
 * - includeTransactions: "true" to include spend/boost transactions for this vacancy
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeTransactions = searchParams.get("includeTransactions") === "true";

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

    // Get allowed employer IDs based on role
    const allowedEmployers: string[] = [];
    if (user.role_id === "intermediary") {
      // Intermediaries can access vacancies from all managed employers
      allowedEmployers.push(...(user.managed_employers || []));
    } else {
      // Regular users can only access their employer's vacancies
      if (!user.employer_id) {
        return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 400 });
      }
      allowedEmployers.push(user.employer_id);
    }

    // Fetch vacancy (and optionally transactions in parallel)
    const [vacancy, transactions] = await Promise.all([
      getVacancyById(id),
      includeTransactions ? getTransactionsByVacancyId(id) : Promise.resolve(undefined),
    ]);

    if (!vacancy) {
      return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
    }

    // Verify user has access to this vacancy's employer
    if (!vacancy.employer_id || !allowedEmployers.includes(vacancy.employer_id)) {
      return NextResponse.json({ error: "Geen toegang tot deze vacature" }, { status: 403 });
    }

    return NextResponse.json({
      vacancy,
      ...(transactions !== undefined && { transactions }),
    });
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

    // Get user
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    // Get allowed employer IDs based on role
    const allowedEmployers: string[] = [];
    if (user.role_id === "intermediary") {
      // Intermediaries can access vacancies from all managed employers
      allowedEmployers.push(...(user.managed_employers || []));
    } else {
      // Regular users can only access their employer's vacancies
      if (!user.employer_id) {
        return NextResponse.json({ error: "Geen werkgever gekoppeld" }, { status: 400 });
      }
      allowedEmployers.push(user.employer_id);
    }

    // Fetch existing vacancy
    const existingVacancy = await getVacancyById(id);
    if (!existingVacancy) {
      return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
    }

    // Verify user has access to this vacancy's employer
    if (!existingVacancy.employer_id || !allowedEmployers.includes(existingVacancy.employer_id)) {
      return NextResponse.json({ error: "Geen toegang tot deze vacature" }, { status: 403 });
    }

    // Parse and validate request body
    const rawBody = await request.json();
    const parsed = vacancyPatchSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ongeldige invoer", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    // Remove empty date fields (Airtable doesn't accept empty strings for date fields)
    if (updates.closing_date === "" || updates.closing_date === null) {
      delete updates.closing_date;
    }
    
    // Remove linked record fields if they're null, empty string, or empty array
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
    ];
    
    for (const field of linkedRecordFields) {
      const value = updates[field];
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        delete updates[field];
      }
    }

    // Update vacancy
    const vacancy = await updateVacancy(id, updates);

    // Log event
    await logEvent({
      event_type: "vacancy_updated",
      actor_user_id: user.id,
      employer_id: existingVacancy.employer_id || null,
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
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het updaten van de vacature" },
      { status: 500 }
    );
  }
}
