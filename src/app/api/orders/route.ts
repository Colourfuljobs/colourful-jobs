import { authOptions } from "@/lib/auth";
import {
  getTransactionsByEmployerId,
  getWalletByEmployerId,
  getUserByEmail,
  getActiveProductsByType,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database to get employer_id
    const user = await getUserByEmail(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.employer_id) {
      return NextResponse.json({ error: "No employer linked to user" }, { status: 400 });
    }

    console.log("[Orders GET] Fetching for employer_id:", user.employer_id);

    // Fetch transactions, wallet, and products in parallel
    const [allTransactions, wallet, upsells, packages] = await Promise.all([
      getTransactionsByEmployerId(user.employer_id),
      getWalletByEmployerId(user.employer_id),
      getActiveProductsByType("upsell"),
      getActiveProductsByType("vacancy_package"),
    ]);

    // Filter out "included" transactions (€0 package-included upsells, not visible in orders)
    const transactions = allTransactions.filter(
      (tx) => tx.context !== "included"
    );

    console.log("[Orders GET] Found transactions:", transactions.length, "(excl. included)");
    console.log("[Orders GET] Wallet:", wallet);

    // Build product name map for display in the orders table
    const productNames: Record<string, string> = {};
    for (const product of [...upsells, ...packages]) {
      productNames[product.id] = product.display_name;
    }

    // Build credits overview from wallet
    const credits = {
      available: wallet?.balance ?? 0,
      total_purchased: wallet?.total_purchased ?? 0,
      total_spent: wallet?.total_spent ?? 0,
    };

    return NextResponse.json({
      transactions,
      credits,
      productNames,
    });
  } catch (error: unknown) {
    console.error("[Orders GET] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
