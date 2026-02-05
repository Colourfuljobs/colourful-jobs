import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getWalletByEmployerId,
  getProductById,
  addCreditsToWallet,
  createPurchaseTransaction,
  getEmployerById,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { getErrorMessage } from "@/lib/utils";
import { z } from "zod";

// Validation schema for checkout request
const checkoutRequestSchema = z.object({
  product_id: z.string().min(1, "Product ID is verplicht"),
  context: z.enum(["dashboard", "vacancy", "boost", "renew", "transactions"]),
  invoice_details: z.object({
    contact_name: z.string().min(1, "Contactpersoon is verplicht"),
    email: z.string().email("Ongeldig e-mailadres"),
    street: z.string().min(1, "Straat is verplicht"),
    postal_code: z.string().min(1, "Postcode is verplicht"),
    city: z.string().min(1, "Stad is verplicht"),
    reference_nr: z.string().optional(),
  }),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

/**
 * POST /api/checkout
 * Process a credit bundle purchase
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get user and verify they have an employer
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    if (!user.employer_id) {
      return NextResponse.json(
        { error: "Geen werkgever gekoppeld aan account" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = checkoutRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { product_id, context, invoice_details } = parseResult.data;

    // Get the product and verify it's a credit bundle
    const product = await getProductById(product_id);
    if (!product) {
      return NextResponse.json({ error: "Product niet gevonden" }, { status: 404 });
    }

    if (!product.is_active) {
      return NextResponse.json(
        { error: "Dit product is niet beschikbaar" },
        { status: 400 }
      );
    }

    if (product.type !== "credit_bundle") {
      return NextResponse.json(
        { error: "Alleen credit bundels kunnen worden gekocht via deze checkout" },
        { status: 400 }
      );
    }

    // Get the employer's wallet
    const wallet = await getWalletByEmployerId(user.employer_id);
    if (!wallet) {
      return NextResponse.json(
        { error: "Geen wallet gevonden voor deze werkgever" },
        { status: 400 }
      );
    }

    // Get employer for additional context
    const employer = await getEmployerById(user.employer_id);

    // Create invoice details snapshot (JSON string)
    const invoiceDetailsSnapshot = JSON.stringify({
      ...invoice_details,
      company_name: employer?.company_name || employer?.display_name || "",
      kvk: employer?.kvk || "",
      purchased_at: new Date().toISOString(),
    });

    // Create the transaction with expiration date
    const transaction = await createPurchaseTransaction({
      employer_id: user.employer_id,
      wallet_id: wallet.id,
      user_id: user.id,
      product_id: product.id,
      credits_amount: product.credits,
      money_amount: product.price,
      context,
      invoice_details_snapshot: invoiceDetailsSnapshot,
      validity_months: product.validity_months, // From product config
    });

    // Add credits to wallet (credits are added immediately, payment via invoice)
    const updatedWallet = await addCreditsToWallet(wallet.id, product.credits);

    // Log the event
    const ipAddress = getClientIP(request);
    await logEvent({
      event_type: "credits_purchased",
      actor_user_id: user.id,
      employer_id: user.employer_id,
      source: "web",
      ip_address: ipAddress,
      payload: {
        product_id: product.id,
        product_name: product.display_name,
        credits_amount: product.credits,
        money_amount: product.price,
        context,
        transaction_id: transaction.id,
      },
    });

    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      credits_purchased: product.credits,
      new_balance: updatedWallet.balance,
      message: `${product.credits} credits zijn toegevoegd aan je account`,
    });
  } catch (error: unknown) {
    console.error("Checkout error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij de checkout" },
      { status: 500 }
    );
  }
}
