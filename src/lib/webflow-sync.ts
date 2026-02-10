const WEBHOOK_URL = process.env.N8N_WEBFLOW_SYNC_WEBHOOK_URL;

/**
 * Trigger een Webflow sync voor een vacature via n8n webhook.
 * Fire-and-forget: als de webhook faalt, staat needs_webflow_sync
 * nog op true en vangt de Airtable automation het op.
 */
export async function triggerWebflowSync(vacancyId: string): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn("N8N_WEBFLOW_SYNC_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vacancy_id: vacancyId }),
    });
  } catch (error) {
    // Niet fataal — Airtable automation is het vangnet
    console.error("Failed to trigger Webflow sync webhook:", error);
  }
}
