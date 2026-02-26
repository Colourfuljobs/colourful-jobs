import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getVacancyById,
  updateVacancy,
  getWalletByEmployerId,
  createSpendTransaction,
  getProductById,
  spendCreditsWithFIFO,
  getActiveProductsByType,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent, getClientIP } from "@/lib/events";
import { getPackageBaseDuration } from "@/lib/vacancy-duration";
import { triggerWebflowSync } from "@/lib/webflow-sync";

/**
 * POST /api/vacancies/[id]/boost
 * Boosts a published, expired, or depublished vacancy with additional upsells
 * Body: { upsell_ids: string[], new_closing_date?: string }
 * - Validates vacancy ownership and status
 * - Validates upsells have "boost-option" availability
 * - If new_closing_date provided: validates it's within 365 days from publication
 * - Checks credit balance (requires sufficient credits)
 * - Deducts credits via FIFO
 * - Creates spend transaction with context "boost"
 * - Appends new upsell IDs to vacancy selected_upsells
 * - Updates closing_date if new_closing_date provided
 * - Republishes vacancy if status was "verlopen" or "gedepubliceerd"
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const { upsell_ids, new_closing_date } = body as {
      upsell_ids: string[];
      new_closing_date?: string;
    };

    if (
      (!upsell_ids || !Array.isArray(upsell_ids) || upsell_ids.length === 0) &&
      !new_closing_date
    ) {
      return NextResponse.json(
        { error: "Selecteer minimaal één boost optie of een nieuwe sluitingsdatum" },
        { status: 400 }
      );
    }

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

    // Get allowed employer IDs based on role
    const allowedEmployers: string[] = [];
    if (user.role_id === "intermediary") {
      // Intermediaries can access vacancies from all managed employers
      allowedEmployers.push(...(user.managed_employers || []));
    } else {
      // Regular users can only access their employer's vacancies
      if (!user.employer_id) {
        return NextResponse.json(
          { error: "Geen werkgever gekoppeld" },
          { status: 400 }
        );
      }
      allowedEmployers.push(user.employer_id);
    }

    // Fetch vacancy
    const vacancy = await getVacancyById(id);
    if (!vacancy) {
      return NextResponse.json(
        { error: "Vacature niet gevonden" },
        { status: 404 }
      );
    }

    // Verify vacancy belongs to user's employer or managed employers
    if (!vacancy.employer_id || !allowedEmployers.includes(vacancy.employer_id)) {
      return NextResponse.json(
        { error: "Geen toegang tot deze vacature" },
        { status: 403 }
      );
    }

    // Verify vacancy is in a boostable status
    const boostableStatuses = ["gepubliceerd", "verlopen", "gedepubliceerd"];
    if (!boostableStatuses.includes(vacancy.status)) {
      return NextResponse.json(
        {
          error:
            "Alleen gepubliceerde, verlopen of gedepubliceerde vacatures kunnen worden geboost",
        },
        { status: 400 }
      );
    }

    // Validate new_closing_date if provided
    let validatedClosingDate: string | undefined;
    if (new_closing_date) {
      const newDate = new Date(new_closing_date);
      newDate.setHours(0, 0, 0, 0);

      if (isNaN(newDate.getTime())) {
        return NextResponse.json(
          { error: "Ongeldige datum formaat" },
          { status: 400 }
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (newDate < today) {
        return NextResponse.json(
          { error: "De nieuwe sluitingsdatum moet in de toekomst liggen" },
          { status: 400 }
        );
      }

      // Validate against 365-day maximum from FIRST publication date
      const publishedAt = vacancy["first-published-at"] || vacancy["last-published-at"];
      if (publishedAt) {
        const pubDate = new Date(publishedAt);
        pubDate.setHours(0, 0, 0, 0);
        const maxDate = new Date(pubDate);
        maxDate.setDate(maxDate.getDate() + 365);

        if (newDate > maxDate) {
          return NextResponse.json(
            {
              error:
                "De nieuwe sluitingsdatum mag maximaal 365 dagen na de publicatiedatum liggen",
            },
            { status: 400 }
          );
        }
      }

      // Validate this isn't a Premium package (365 days base, no extension possible)
      if (vacancy.package_id) {
        try {
          const packages = await getActiveProductsByType("vacancy_package");
          const pkg = packages.find((p) => p.id === vacancy.package_id);
          if (pkg) {
            const baseDuration = getPackageBaseDuration(pkg);
            if (baseDuration >= 365) {
              return NextResponse.json(
                {
                  error:
                    "Looptijdverlenging is niet beschikbaar voor Premium vacatures",
                },
                { status: 400 }
              );
            }
          }
        } catch {
          // Non-critical, continue
          console.warn("[Boost] Could not validate package duration");
        }
      }

      validatedClosingDate = new_closing_date;
    }

    // Fetch and validate all selected upsells
    const upsellsToProcess = upsell_ids || [];
    let totalCredits = 0;
    let totalPrice = 0;
    let hasFeatured = false;
    const validUpsells: {
      id: string;
      display_name: string;
      credits: number;
      price: number;
    }[] = [];

    for (const upsellId of upsellsToProcess) {
      const upsell = await getProductById(upsellId);
      if (!upsell) {
        return NextResponse.json(
          { error: `Upsell product niet gevonden: ${upsellId}` },
          { status: 400 }
        );
      }

      // Validate this is a boost-eligible upsell
      if (!upsell.availability?.includes("boost-option")) {
        return NextResponse.json(
          {
            error: `Product "${upsell.display_name}" is niet beschikbaar als boost optie`,
          },
          { status: 400 }
        );
      }

      totalCredits += upsell.credits;
      totalPrice += upsell.price;
      if (upsell.slug === "prod_upsell_featured") {
        hasFeatured = true;
      }
      validUpsells.push({
        id: upsell.id,
        display_name: upsell.display_name,
        credits: upsell.credits,
        price: upsell.price,
      });
    }

    // Get wallet and check balance (use vacancy's employer_id)
    const wallet = await getWalletByEmployerId(vacancy.employer_id);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet niet gevonden" },
        { status: 400 }
      );
    }

    const availableCredits = wallet.balance;

    // Boost requires sufficient credits (no invoice option)
    if (availableCredits < totalCredits) {
      return NextResponse.json(
        {
          error: "Niet genoeg credits beschikbaar",
          shortage: totalCredits - availableCredits,
        },
        { status: 400 }
      );
    }

    console.log("[Boost] Credit calculation:", {
      totalCredits,
      totalPrice,
      availableCredits,
      upsellCount: upsellsToProcess.length,
      new_closing_date: validatedClosingDate || null,
    });

    // Deduct credits via FIFO
    if (totalCredits > 0) {
      const fifoResult = await spendCreditsWithFIFO(
        vacancy.employer_id,
        wallet.id,
        totalCredits
      );
      console.log("[Boost] FIFO spend result:", fifoResult);
    }

    // Create spend transaction with context "boost"
    if (totalCredits > 0) {
      await createSpendTransaction({
        employer_id: vacancy.employer_id,
        wallet_id: wallet.id,
        user_id: user.id,
        vacancy_id: vacancy.id,
        total_credits: totalCredits,
        total_cost: totalPrice,
        credits_shortage: 0, // Boost always requires full credits
        invoice_amount: 0,
        product_ids: upsellsToProcess,
        context: "boost",
      });
    }

    // Build vacancy update object
    const vacancyUpdate: Record<string, unknown> = {};

    // Append new upsell IDs to existing selected_upsells
    if (upsellsToProcess.length > 0) {
      const existingUpsells = vacancy.selected_upsells || [];
      vacancyUpdate.selected_upsells = [...existingUpsells, ...upsellsToProcess];
    }

    // Update closing_date if provided
    if (validatedClosingDate) {
      vacancyUpdate.closing_date = validatedClosingDate;
    }

    // Handle status changes for verlopen and gedepubliceerd vacancies
    const previousStatus = vacancy.status;
    let statusChanged = false;

    if (
      vacancy.status === "verlopen" ||
      vacancy.status === "gedepubliceerd"
    ) {
      // Republish the vacancy and update last-published-at to track republication moment
      vacancyUpdate.status = "gepubliceerd";
      vacancyUpdate["last-published-at"] = new Date().toISOString();
      statusChanged = true;
    }

    // Set is_featured if any boost upsell has sets_featured=true
    if (hasFeatured) {
      vacancyUpdate.is_featured = true;
      vacancyUpdate["featured-at"] = new Date().toISOString();
    }

    // Mark for Webflow sync
    vacancyUpdate.needs_webflow_sync = true;

    // Update vacancy
    const updatedVacancy = await updateVacancy(id, vacancyUpdate);

    // Trigger Webflow sync webhook
    await triggerWebflowSync(id);

    // Log event
    await logEvent({
      event_type: "vacancy_boost",
      actor_user_id: user.id,
      employer_id: vacancy.employer_id || null,
      vacancy_id: vacancy.id,
      source: "web",
      ip_address: getClientIP(request),
      payload: {
        upsell_ids: upsellsToProcess,
        upsell_names: validUpsells.map((u) => u.display_name),
        total_credits: totalCredits,
        total_price: totalPrice,
        new_balance: availableCredits - totalCredits,
        ...(validatedClosingDate && {
          new_closing_date: validatedClosingDate,
          previous_closing_date: vacancy.closing_date || null,
        }),
        ...(statusChanged && {
          status_change: {
            from: previousStatus,
            to: "gepubliceerd",
          },
        }),
      },
    });

    return NextResponse.json({
      success: true,
      vacancy: updatedVacancy,
      credits_spent: totalCredits,
      new_balance: availableCredits - totalCredits,
    });
  } catch (error: unknown) {
    console.error("Error boosting vacancy:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het boosten van de vacature" },
      { status: 500 }
    );
  }
}
