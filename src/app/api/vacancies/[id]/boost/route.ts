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
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { logEvent, getClientIP } from "@/lib/events";

/**
 * POST /api/vacancies/[id]/boost
 * Boosts a published or expired vacancy with additional upsells
 * Body: { upsell_ids: string[] }
 * - Validates vacancy ownership and status
 * - Validates upsells have "boost-option" availability
 * - Checks credit balance (requires sufficient credits)
 * - Deducts credits via FIFO
 * - Creates spend transaction with context "boost"
 * - Appends new upsell IDs to vacancy selected_upsells
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const { upsell_ids } = body as { upsell_ids: string[] };

    if (!upsell_ids || !Array.isArray(upsell_ids) || upsell_ids.length === 0) {
      return NextResponse.json(
        { error: "Selecteer minimaal één boost optie" },
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

    // Verify vacancy is in a boostable status
    if (vacancy.status !== "gepubliceerd" && vacancy.status !== "verlopen") {
      return NextResponse.json(
        { error: "Alleen gepubliceerde of verlopen vacatures kunnen worden geboost" },
        { status: 400 }
      );
    }

    // Fetch and validate all selected upsells
    let totalCredits = 0;
    let totalPrice = 0;
    const validUpsells: { id: string; display_name: string; credits: number; price: number }[] = [];

    for (const upsellId of upsell_ids) {
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
          { error: `Product "${upsell.display_name}" is niet beschikbaar als boost optie` },
          { status: 400 }
        );
      }

      totalCredits += upsell.credits;
      totalPrice += upsell.price;
      validUpsells.push({
        id: upsell.id,
        display_name: upsell.display_name,
        credits: upsell.credits,
        price: upsell.price,
      });
    }

    // Get wallet and check balance
    const wallet = await getWalletByEmployerId(user.employer_id);
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
        { error: "Niet genoeg credits beschikbaar", shortage: totalCredits - availableCredits },
        { status: 400 }
      );
    }

    console.log("[Boost] Credit calculation:", {
      totalCredits,
      totalPrice,
      availableCredits,
      upsellCount: upsell_ids.length,
    });

    // Deduct credits via FIFO
    if (totalCredits > 0) {
      const fifoResult = await spendCreditsWithFIFO(user.employer_id, wallet.id, totalCredits);
      console.log("[Boost] FIFO spend result:", fifoResult);
    }

    // Create spend transaction with context "boost"
    await createSpendTransaction({
      employer_id: user.employer_id,
      wallet_id: wallet.id,
      user_id: user.id,
      vacancy_id: vacancy.id,
      total_credits: totalCredits,
      total_cost: totalPrice,
      credits_shortage: 0, // Boost always requires full credits
      invoice_amount: 0,
      product_ids: upsell_ids,
      context: "boost",
    });

    // Append new upsell IDs to existing selected_upsells
    const existingUpsells = vacancy.selected_upsells || [];
    const updatedUpsells = [...existingUpsells, ...upsell_ids];

    // Update vacancy with new upsells
    const updatedVacancy = await updateVacancy(id, {
      selected_upsells: updatedUpsells,
    });

    // Log event
    await logEvent({
      event_type: "vacancy_boost",
      actor_user_id: user.id,
      employer_id: user.employer_id,
      vacancy_id: vacancy.id,
      source: "web",
      ip_address: getClientIP(request),
      payload: {
        upsell_ids,
        upsell_names: validUpsells.map((u) => u.display_name),
        total_credits: totalCredits,
        total_price: totalPrice,
        new_balance: availableCredits - totalCredits,
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
