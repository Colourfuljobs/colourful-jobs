import Airtable from "airtable";

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

const base = new Airtable({ apiKey }).base(baseId || "");

const EVENTS_TABLE = process.env.AIRTABLE_EVENTS_TABLE || "Events";

// All available event types
export type EventType =
  | "user_created"
  | "user_updated"
  | "user_login"
  | "user_logout"
  | "user_invited"
  | "user_removed"
  | "user_email_pending"
  | "user_email_verified"
  | "employer_created"
  | "employer_updated"
  | "wallet_created"
  | "vacancy_created"
  | "vacancy_updated"
  | "vacancy_publish"
  | "vacancy_depublish"
  | "vacancy_boost"
  | "vacancy_duplicate"
  | "media_uploaded"
  | "media_deleted"
  | "onboarding_started"
  | "onboarding_completed";

// Source of the event
export type EventSource = "web" | "api" | "admin" | "system" | "automation";

// Event status for processing queue
export type EventStatus = "new" | "processing" | "done" | "failed";

export interface LogEventParams {
  event_type: EventType;
  actor_user_id?: string | null;      // The user who performed the action
  target_user_id?: string | null;     // The user affected by the action (for multi-user scenarios)
  employer_id?: string | null;        // The employer related to this event
  vacancy_id?: string | null;         // The vacancy related to this event (for vacancy events)
  payload?: Record<string, any>;      // Additional JSON data
  source?: EventSource;               // Where the action originated
  ip_address?: string | null;         // For security audit trail
  session_id?: string | null;         // For grouping actions per session
}

export interface EventRecord {
  id: string;
  event_type: EventType;
  actor_user?: string[];
  target_user?: string[];
  employer?: string[];
  vacancy?: string[];
  payload_json?: string;
  status: EventStatus;
  source?: EventSource;
  ip_address?: string;
  session_id?: string;
  "created-at": string;
}

/**
 * Log an event to the Events table in Airtable
 * This function is fire-and-forget by default - it won't throw errors to avoid
 * disrupting the main flow. Errors are logged to console.
 */
export async function logEvent(params: LogEventParams): Promise<EventRecord | null> {
  if (!baseId || !apiKey) {
    console.warn("Airtable not configured - skipping event logging");
    return null;
  }

  const timestamp = new Date().toISOString();
  const airtableFields: Record<string, any> = {
    event_type: params.event_type,
    status: "new" as EventStatus,
    "created-at": timestamp,
    "processed-at": timestamp,
  };

  // Linked records need to be arrays
  if (params.actor_user_id) {
    airtableFields.actor_user = [params.actor_user_id];
  }
  if (params.target_user_id) {
    airtableFields.target_user = [params.target_user_id];
  }
  if (params.employer_id) {
    airtableFields.employer = [params.employer_id];
  }
  if (params.vacancy_id) {
    airtableFields.vacancy = [params.vacancy_id];
  }

  // Optional fields
  if (params.payload) {
    airtableFields.payload_json = JSON.stringify(params.payload);
  }
  if (params.source) {
    airtableFields.source = params.source;
  }
  if (params.ip_address) {
    airtableFields.ip_address = params.ip_address;
  }
  if (params.session_id) {
    airtableFields.session_id = params.session_id;
  }

  try {
    const record = await base(EVENTS_TABLE).create(airtableFields);

    // Update the record to set the id field to the Airtable record ID
    await base(EVENTS_TABLE).update(record.id, { id: record.id });

    return {
      id: record.id,
      event_type: params.event_type,
      status: "new",
      "created-at": airtableFields["created-at"],
      ...record.fields,
    } as EventRecord;
  } catch (error: any) {
    // Log but don't throw - event logging should not break the main flow
    console.error("Error logging event to Airtable:", {
      event_type: params.event_type,
      error: error.message,
    });
    return null;
  }
}

/**
 * Helper to extract IP address from request headers
 */
export function getClientIP(request: Request): string | null {
  // Check various headers that might contain the client IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return null;
}
