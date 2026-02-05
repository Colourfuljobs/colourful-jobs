import { NextResponse } from "next/server";
import {
  getExpiredCreditBatches,
  processExpiredCreditBatch,
} from "@/lib/airtable";
import { logEvent } from "@/lib/events";

/**
 * GET /api/cron/expire-credits
 * 
 * Cron job to process expired credit batches
 * - Finds all purchase transactions where expires_at < now AND remaining_credits > 0
 * - Sets remaining_credits to 0
 * - Deducts from wallet balance
 * - Creates expiration transaction for audit trail
 * 
 * This endpoint should be called daily by Vercel Cron
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: Request) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without auth for testing
    const isDev = process.env.NODE_ENV === "development";
    
    if (!isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron] Unauthorized request to expire-credits");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting credit expiration job...");

    // Get all expired batches
    const expiredBatches = await getExpiredCreditBatches();
    
    console.log(`[Cron] Found ${expiredBatches.length} expired credit batches`);

    if (expiredBatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired credits to process",
        processed: 0,
        totalExpired: 0,
      });
    }

    // Process each expired batch
    const results = {
      processed: 0,
      failed: 0,
      totalExpired: 0,
      errors: [] as string[],
    };

    for (const batch of expiredBatches) {
      const result = await processExpiredCreditBatch(batch);
      
      if (result.success) {
        results.processed++;
        results.totalExpired += result.creditsExpired;

        // Log the expiration event
        if (batch.employer_id) {
          await logEvent({
            event_type: "credits_expired",
            employer_id: batch.employer_id,
            source: "api",
            payload: {
              batch_id: batch.id,
              credits_expired: result.creditsExpired,
              expires_at: batch.expires_at,
            },
          });
        }

        console.log(`[Cron] Processed batch ${batch.id}: ${result.creditsExpired} credits expired`);
      } else {
        results.failed++;
        results.errors.push(`Batch ${batch.id}: ${result.error}`);
        console.error(`[Cron] Failed to process batch ${batch.id}:`, result.error);
      }
    }

    console.log(`[Cron] Credit expiration job complete. Processed: ${results.processed}, Failed: ${results.failed}, Total expired: ${results.totalExpired}`);

    return NextResponse.json({
      success: results.failed === 0,
      message: `Processed ${results.processed} batches, ${results.totalExpired} credits expired`,
      processed: results.processed,
      failed: results.failed,
      totalExpired: results.totalExpired,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error: unknown) {
    console.error("[Cron] Error in credit expiration job:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to process expired credits",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
