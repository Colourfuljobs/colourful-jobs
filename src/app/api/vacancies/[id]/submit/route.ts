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
  spendCreditsWithFIFO,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent, getClientIP } from "@/lib/events";

// Invoice details type matching frontend
interface InvoiceDetails {
  contact_name: string;
  email: string;
  street: string;
  postal_code: string;
  city: string;
  reference_nr: string;
}

/**
 * POST /api/vacancies/[id]/submit
 * Submits a vacancy for approval
 * - Validates all required fields
 * - Checks credit balance
 * - If sufficient credits: deducts credits and creates spend transaction
 * - If insufficient credits: deducts available credits + creates invoice transaction for the rest
 * - Updates vacancy status to "wacht_op_goedkeuring"
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Parse request body for invoice details
    const body = await request.json().catch(() => ({}));
    const invoiceDetails: InvoiceDetails | null = body.invoice_details || null;

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

    // Fetch vacancy
    const vacancy = await getVacancyById(id);
    if (!vacancy) {
      return NextResponse.json({ error: "Vacature niet gevonden" }, { status: 404 });
    }

    // Verify vacancy belongs to user's employer or managed employers
    if (!vacancy.employer_id || !allowedEmployers.includes(vacancy.employer_id)) {
      return NextResponse.json({ error: "Geen toegang tot deze vacature" }, { status: 403 });
    }

    // Prevent re-submission of already submitted vacancies
    const submittedStatuses = ["wacht_op_goedkeuring", "gepubliceerd", "verlopen", "gedepubliceerd"];
    if (submittedStatuses.includes(vacancy.status)) {
      return NextResponse.json(
        { error: "Deze vacature is al ingediend. Gebruik de wijzig-functie om aanpassingen te maken." },
        { status: 400 }
      );
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

    // Calculate total credits and price needed (package + upsells)
    let totalCredits = packageProduct.credits;
    let totalPrice = packageProduct.price;
    const upsellIds = vacancy.selected_upsells || [];
    let hasVandaagOnline = false;
    let hasFeatured = false;
    const fetchedUpsells: NonNullable<Awaited<ReturnType<typeof getProductById>>>[] = [];
    
    for (const upsellId of upsellIds) {
      const upsell = await getProductById(upsellId);
      if (upsell) {
        fetchedUpsells.push(upsell);
        totalCredits += upsell.credits;
        totalPrice += upsell.price;
        if (upsell.slug === "prod_upsell_same_day") {
          hasVandaagOnline = true;
        }
        if (upsell.slug === "prod_upsell_featured") {
          hasFeatured = true;
        }
      }
    }

    // Get wallet and check balance (use vacancy's employer_id for wallet lookup)
    const wallet = await getWalletByEmployerId(vacancy.employer_id);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet niet gevonden" },
        { status: 400 }
      );
    }

    const availableCredits = wallet.balance;
    const shortage = Math.max(0, totalCredits - availableCredits);
    const hasEnoughCredits = shortage === 0;

    console.log("[Submit] Credit calculation:", {
      totalCredits,
      totalPrice,
      availableCredits,
      shortage,
      hasEnoughCredits,
    });

    // If not enough credits, invoice details are required
    if (!hasEnoughCredits && !invoiceDetails) {
      return NextResponse.json(
        { error: "Factuurgegevens zijn verplicht bij onvoldoende credits" },
        { status: 400 }
      );
    }

    // Validate invoice details if provided
    if (!hasEnoughCredits && invoiceDetails) {
      if (!invoiceDetails.contact_name || !invoiceDetails.email || 
          !invoiceDetails.street || !invoiceDetails.postal_code || !invoiceDetails.city) {
        return NextResponse.json(
          { error: "Vul alle factuurgegevens in" },
          { status: 400 }
        );
      }
    }

    // Validate required fields based on input_type
    const validationErrors = validateVacancyForSubmission(vacancy);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in", fields: validationErrors },
        { status: 400 }
      );
    }

    // Calculate credits to deduct and invoice amount
    const creditsToDeduct = Math.min(availableCredits, totalCredits);
    const creditsForInvoice = shortage;
    
    // Calculate invoice amount proportionally
    const invoiceAmount = totalCredits > 0 
      ? Math.round((creditsForInvoice / totalCredits) * totalPrice)
      : 0;

    // Collect all product IDs (package + upsells)
    const allProductIds = [vacancy.package_id, ...upsellIds];

    // Deduct available credits from wallet using FIFO (if any)
    // This uses credits from the oldest non-expired batches first
    let fifoResult = null;
    if (creditsToDeduct > 0) {
      fifoResult = await spendCreditsWithFIFO(vacancy.employer_id, wallet.id, creditsToDeduct);
      console.log("[Submit] FIFO spend result:", fifoResult);
    }

    // Create a single spend transaction (with optional invoice details for partial payment)
    await createSpendTransaction({
      employer_id: vacancy.employer_id,
      wallet_id: wallet.id,
      user_id: user.id, // Track which user initiated the transaction
      vacancy_id: vacancy.id,
      total_credits: totalCredits, // Total credits the vacancy costs
      total_cost: totalPrice, // Total price in euros
      credits_shortage: shortage, // Credits short (0 if enough)
      invoice_amount: invoiceAmount, // Euro amount to be invoiced
      product_ids: allProductIds,
      context: "vacancy",
      // Include invoice details if there's a shortage
      ...(shortage > 0 && invoiceDetails ? {
        invoice_details_snapshot: JSON.stringify(invoiceDetails),
        invoice_trigger: "on_vacancy_publish" as const,
      } : {}),
    });

    // Create €0 "included" transactions for each upsell included in the package
    // These enable the repeat_mode engine to track when included upsell effects expire
    // Also check if any included upsell is the featured upsell
    const includedUpsellIds = packageProduct.included_upsells || [];
    if (includedUpsellIds.length > 0) {
      console.log("[Submit] Creating included upsell transactions:", includedUpsellIds.length);
      for (const includedUpsellId of includedUpsellIds) {
        const includedUpsell = await getProductById(includedUpsellId);
        if (includedUpsell?.slug === "prod_upsell_featured") {
          hasFeatured = true;
        }
        await createSpendTransaction({
          employer_id: vacancy.employer_id,
          wallet_id: wallet.id,
          user_id: user.id,
          vacancy_id: vacancy.id,
          total_credits: 0,
          total_cost: 0,
          credits_shortage: 0,
          invoice_amount: 0,
          product_ids: [includedUpsellId],
          context: "included",
        });
      }
    }

    // Update vacancy status (and set high_priority if "Vandaag online" upsell is selected)
    // Also set is_featured if any product has sets_featured=true
    // Strip DIY-only fields when submitting as "We do it for you"
    // These fields may have been filled during a previous DIY session and should not
    // be persisted in the final submission to avoid confusion for the review team.
    const updatedVacancy = await updateVacancy(id, {
      status: "wacht_op_goedkeuring",
      "submitted-at": new Date().toISOString(),
      ...(hasVandaagOnline ? { high_priority: true } : {}),
      ...(hasFeatured ? { is_featured: true, "featured-at": new Date().toISOString() } : {}),
      needs_webflow_sync: true,
      // Strip DIY-only fields for "We do it for you" submissions
      // Use null for all fields to safely clear both text and select fields in Airtable
      ...(vacancy.input_type === "we_do_it_for_you" ? {
        title: null,
        intro_txt: null,
        location: null,
        hrs_per_week: null,
        salary: null,
        closing_date: null,
        region_id: null,
        sector_id: null,
        function_type_id: null,
        education_level_id: null,
        field_id: null,
        contact_name: null,
        contact_role: null,
        contact_email: null,
        contact_phone: null,
        contact_photo_id: null,
        gallery: [],
        recommendations: null,
      } : {
        // Strip "We do it for you"-only fields for self-service submissions
        note: null,
      }),
    });

    // Determine if submitted before 15:00 NL time (for "Vandaag online" cutoff)
    const nlHour = Number(
      new Intl.DateTimeFormat("nl-NL", {
        hour: "numeric",
        hour12: false,
        timeZone: "Europe/Amsterdam",
      }).format(new Date())
    );
    const submittedBeforeCutoff = nlHour < 15;

    // Log event
    await logEvent({
      event_type: "vacancy_created",
      actor_user_id: user.id,
      employer_id: vacancy.employer_id || null,
      vacancy_id: vacancy.id,
      source: "web",
      ip_address: getClientIP(request),
      payload: {
        action: "submitted",
        package_id: packageProduct.id,
        package_name: packageProduct.display_name,
        upsell_ids: upsellIds,
        total_credits: totalCredits,
        credits_deducted: creditsToDeduct,
        credits_invoiced: creditsForInvoice,
        invoice_amount: invoiceAmount,
        input_type: vacancy.input_type,
        payment_method: hasEnoughCredits ? "credits" : "partial_invoice",
        ...(hasVandaagOnline ? {
          vandaag_online: true,
          submitted_before_cutoff: submittedBeforeCutoff,
        } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      vacancy: updatedVacancy,
      credits_spent: creditsToDeduct,
      credits_invoiced: creditsForInvoice,
      invoice_amount: invoiceAmount,
      new_balance: availableCredits - creditsToDeduct,
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
  title?: string | null;
  intro_txt?: string | null;
  description?: string | null;
  apply_url?: string | null;
  application_email?: string | null;
  show_apply_form?: boolean;
  location?: string | null;
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
