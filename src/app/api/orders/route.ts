import { authOptions } from "@/lib/auth";
import {
  getTransactionsByEmployerId,
  getTransactionsByWalletId,
  getWalletByEmployerId,
  getWalletByUserId,
  getUserByEmail,
  getActiveProductsByType,
  TransactionRecord,
  WalletRecord,
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

    const isIntermediary = user.role_id === "intermediary";

    if (!isIntermediary && !user.employer_id) {
      return NextResponse.json({ error: "No employer linked to user" }, { status: 400 });
    }

    if (isIntermediary && !user.active_employer) {
      return NextResponse.json({ error: "Selecteer eerst een werkgever" }, { status: 400 });
    }

    console.log("[Orders GET] Fetching for", isIntermediary ? "intermediary with active_employer:" : "employer_id:", isIntermediary ? user.active_employer : user.employer_id);

    // Fetch transactions and wallet based on user type
    let allTransactions: TransactionRecord[];
    let wallet: WalletRecord | null;

    if (isIntermediary) {
      // Intermediary: fetch from user-level wallet, filtered by active employer
      wallet = await getWalletByUserId(user.id);
      
      if (wallet) {
        const walletTransactions = await getTransactionsByWalletId(wallet.id);
        // Filter to only show transactions for the active employer
        allTransactions = walletTransactions.filter(
          (tx) => tx.employer_id === user.active_employer
        );
      } else {
        allTransactions = [];
      }
    } else {
      // Regular employer: existing logic
      [allTransactions, wallet] = await Promise.all([
        getTransactionsByEmployerId(user.employer_id!),
        getWalletByEmployerId(user.employer_id!),
      ]);
    }

    // Fetch products for product name mapping
    const [upsells, packages] = await Promise.all([
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
