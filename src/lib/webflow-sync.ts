const VACANCY_WEBHOOK_URL = process.env.N8N_WEBFLOW_SYNC_WEBHOOK_URL;
const EMPLOYER_WEBHOOK_URL = process.env.N8N_EMPLOYER_WEBFLOW_SYNC_WEBHOOK_URL;

/**
 * Trigger een Webflow sync voor een vacature via n8n webhook.
 * Fire-and-forget: als de webhook faalt, staat needs_webflow_sync
 * nog op true en vangt de n8n vangnet-schedule het op.
 */
export async function triggerWebflowSync(vacancyId: string): Promise<void> {
  if (!VACANCY_WEBHOOK_URL) {
    console.warn("N8N_WEBFLOW_SYNC_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    await fetch(VACANCY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vacancy_id: vacancyId }),
    });
  } catch (error) {
    console.error("Failed to trigger Webflow sync webhook:", error);
  }
}

/**
 * Trigger een Webflow sync voor een employer via n8n webhook.
 * Fire-and-forget: als de webhook faalt, staat needs_webflow_sync
 * nog op true en vangt de n8n vangnet-schedule het op.
 */
export async function triggerEmployerWebflowSync(employerId: string): Promise<void> {
  if (!EMPLOYER_WEBHOOK_URL) {
    console.warn("N8N_EMPLOYER_WEBFLOW_SYNC_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    await fetch(EMPLOYER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employer_id: employerId }),
    });
  } catch (error) {
    console.error("Failed to trigger employer Webflow sync webhook:", error);
  }
}
