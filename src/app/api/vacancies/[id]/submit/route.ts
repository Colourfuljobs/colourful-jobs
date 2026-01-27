import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getVacancyById,
  updateVacancy,
  getWalletByEmployerId,
  deductCreditsFromWallet,
  createSpendTransaction,
  getProductById,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent, getClientIP } from "@/lib/events";
import { checkSufficientCredits } from "@/lib/credits";

/**
 * POST /api/vacancies/[id]/submit
 * Submits a vacancy for approval
 * - Validates all required fields
 * - Checks credit balance
 * - Deducts credits
 * - Updates vacancy status to "awaiting_approval"
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

    // Verify vacancy is in concept status
    if (vacancy.status !== "concept") {
      return NextResponse.json(
        { error: "Alleen concept vacatures kunnen worden ingediend" },
        { status: 400 }
      );
    }

    // Verify package is selected
    if (!vacancy.package_id) {
      return NextResponse.json(
        { error: "Selecteer eerst een vacaturepakket" },
        { status: 400 }
      );
    }

    // Get package details
    const packageProduct = await getProductById(vacancy.package_id);
    if (!packageProduct) {
      return NextResponse.json(
        { error: "Geselecteerd pakket niet gevonden" },
        { status: 400 }
      );
    }

    // Calculate total credits needed (package + upsells)
    let totalCredits = packageProduct.credits;
    const upsellIds = vacancy.selected_upsells || [];
    
    for (const upsellId of upsellIds) {
      const upsell = await getProductById(upsellId);
      if (upsell) {
        totalCredits += upsell.credits;
      }
    }

    // Get wallet and check balance
    const wallet = await getWalletByEmployerId(user.employer_id);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet niet gevonden" },
        { status: 400 }
      );
    }

    const creditCheck = checkSufficientCredits(totalCredits, wallet.balance);
    if (!creditCheck.sufficient) {
      return NextResponse.json(
        {
          error: "Onvoldoende credits",
          required: creditCheck.required,
          available: creditCheck.available,
          shortage: creditCheck.shortage,
        },
        { status: 400 }
      );
    }

    // Validate required fields based on input_type
    const validationErrors = validateVacancyForSubmission(vacancy);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in", fields: validationErrors },
        { status: 400 }
      );
    }

    // Deduct credits from wallet
    await deductCreditsFromWallet(wallet.id, totalCredits);

    // Create spend transaction
    await createSpendTransaction({
      employer_id: user.employer_id,
      wallet_id: wallet.id,
      vacancy_id: vacancy.id,
      credits_amount: totalCredits,
      context: "vacancy",
    });

    // Update vacancy status
    const updatedVacancy = await updateVacancy(id, {
      status: "awaiting_approval",
      "submitted-at": new Date().toISOString(),
    });

    // Log event
    await logEvent({
      event_type: "vacancy_created",
      actor_user_id: user.id,
      employer_id: user.employer_id,
      vacancy_id: vacancy.id,
      source: "web",
      ip_address: getClientIP(request),
      payload: {
        action: "submitted",
        package_id: packageProduct.id,
        package_name: packageProduct.display_name,
        upsell_ids: upsellIds,
        total_credits: totalCredits,
        input_type: vacancy.input_type,
      },
    });

    return NextResponse.json({
      success: true,
      vacancy: updatedVacancy,
      credits_spent: totalCredits,
      new_balance: wallet.balance - totalCredits,
    });
  } catch (error: unknown) {
    console.error("Error submitting vacancy:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het indienen van de vacature" },
      { status: 500 }
    );
  }
}

/**
 * Validate vacancy has all required fields for submission
 */
function validateVacancyForSubmission(vacancy: {
  input_type?: string;
  title?: string;
  intro_txt?: string;
  description?: string;
  apply_url?: string;
  application_email?: string;
  show_apply_form?: boolean;
  location?: string;
  region_id?: string | null;
  sector_id?: string | null;
  function_type_id?: string | null;
}): string[] {
  const errors: string[] = [];

  // Self-service requires more fields
  if (vacancy.input_type === "self_service") {
    if (!vacancy.title?.trim()) errors.push("title");
    if (!vacancy.intro_txt?.trim()) errors.push("intro_txt");
    if (!vacancy.description?.trim()) errors.push("description");
    if (!vacancy.location?.trim()) errors.push("location");
    if (!vacancy.region_id) errors.push("region");
    if (!vacancy.sector_id) errors.push("sector");
    if (!vacancy.function_type_id) errors.push("function_type");
    
    // Application method
    if (!vacancy.show_apply_form && !vacancy.apply_url?.trim()) {
      errors.push("apply_url");
    }
    if (vacancy.show_apply_form && !vacancy.application_email?.trim()) {
      errors.push("application_email");
    }
  } else {
    // We do it for you - minimal validation
    if (!vacancy.description?.trim()) errors.push("description");
    
    // Application method
    if (!vacancy.show_apply_form && !vacancy.apply_url?.trim()) {
      errors.push("apply_url");
    }
    if (vacancy.show_apply_form && !vacancy.application_email?.trim()) {
      errors.push("application_email");
    }
  }

  return errors;
}
