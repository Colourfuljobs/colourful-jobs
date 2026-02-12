import Airtable from "airtable";
import { z } from "zod";
import { getErrorMessage, hasStatusCode } from "./utils";

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

if (!baseId || !apiKey) {
  console.warn(
    "Airtable environment variables are not fully configured. Set AIRTABLE_BASE_ID and AIRTABLE_API_KEY."
  );
}

const base = new Airtable({ apiKey }).base(baseId || "");

/**
 * Escape a string for use in Airtable filterByFormula
 * Prevents formula injection by escaping special characters
 */
export function escapeAirtableString(value: string): string {
  // Escape backslashes first, then single quotes (Airtable uses single quotes in formulas)
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export const userRecordSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  employer_id: z.string().nullable().optional(),
  status: z.enum(["pending_onboarding", "active", "invited", "deleted"]).default("pending_onboarding"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.string().optional(),
  // Intermediary role fields
  role_id: z.string().nullable().optional(), // Lookup from role → Roles.id
  managed_employers: z.array(z.string()).optional(), // Array of employer IDs for intermediaries
  active_employer: z.string().nullable().optional(), // Currently active employer ID for intermediaries
  // Invitation fields
  invite_token: z.string().nullable().optional(),
  invite_expires: z.string().nullable().optional(),
  invited_by: z.string().nullable().optional(), // User ID who sent the invitation
});

export const employerRecordSchema = z.object({
  id: z.string(),
  company_name: z.string().optional(),
  display_name: z.string().optional(),
  kvk: z.string().optional(),
  phone: z.string().optional(),
  website_url: z.string().optional(),
  "reference-nr": z.string().optional(),
  invoice_contact_name: z.string().optional(),
  invoice_email: z.string().optional(),
  invoice_street: z.string().optional(),
  "invoice_postal-code": z.string().optional(),
  invoice_city: z.string().optional(),
  sector: z.array(z.string()).optional(), // Linked record to Sectors table
  location: z.string().optional(),
  short_description: z.string().optional(),
  logo: z.array(z.string()).optional(), // Linked record to Media Assets
  header_image: z.array(z.string()).optional(), // Linked record to Media Assets
  gallery: z.array(z.string()).optional(), // Linked records to Media Assets
  faq: z.array(z.string()).optional(), // Linked records to FAQ table (order matters for Webflow)
  video_url: z.string().optional(), // YouTube or Vimeo URL for company page
  status: z.enum(["draft", "active"]).default("draft"),
  role: z.array(z.string()).optional(), // Linked record to Roles table
  onboarding_dismissed: z.boolean().optional(), // Whether the onboarding checklist has been dismissed
});

export const mediaAssetRecordSchema = z.object({
  id: z.string(),
  employer_id: z.string().nullable().optional(), // Linked record to Employers
  type: z.enum(["logo", "sfeerbeeld"]),
  file: z.array(z.any()).optional(), // Airtable attachment
  alt_text: z.union([z.string(), z.any()]).optional(), // Can be string or lookup field
  file_size: z.number().optional(),
  show_on_company_page: z.boolean().default(false),
  is_deleted: z.boolean().default(false),
  "created-at": z.string().optional(),
});

export const faqRecordSchema = z.object({
  id: z.string(),
  employer_id: z.string().nullable().optional(), // Linked record to Employers
  question: z.string(),
  answer: z.string(),
  order: z.number().default(0),
  created_at: z.string().optional(),
});

export const walletRecordSchema = z.object({
  id: z.string(),
  owner_employer: z.string().nullable().optional(), // Linked record to Employers
  owner_user: z.string().nullable().optional(), // Linked record to Users
  owner_type: z.enum(["employer", "user"]).default("employer"),
  balance: z.number().int().default(0),
  total_purchased: z.number().int().default(0),
  total_spent: z.number().int().default(0),
  "created-at": z.string().optional(),
  "last-updated": z.string().optional(),
});

// Airtable attachment object schema
const airtableAttachmentSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
});

export const transactionRecordSchema = z.object({
  id: z.string(),
  employer_id: z.string().nullable().optional(), // Linked record to Employers
  wallet_id: z.string().nullable().optional(), // Linked record to Wallets
  vacancy_id: z.string().nullable().optional(), // Linked record to Vacancies
  user_id: z.string().nullable().optional(), // Linked record to Users
  product_ids: z.array(z.string()).optional(), // Linked records to Products (package + upsells)
  type: z.enum(["purchase", "spend", "refund", "adjustment", "expiration"]),
  reference_type: z.enum(["vacancy", "order", "admin", "system"]).nullable().optional(),
  context: z.enum(["dashboard", "vacancy", "boost", "renew", "transactions", "included"]).nullable().optional(),
  status: z.enum(["paid", "failed", "refunded", "open"]),
  // Legacy field for purchases - total price in euros
  money_amount: z.number().nullable().optional(),
  // New spend transaction fields
  total_cost: z.number().nullable().optional(), // Total price in euros
  total_credits: z.number().int().nullable().optional(), // Total credits the vacancy costs
  credits_shortage: z.number().int().nullable().optional(), // Credits short (0 if enough)
  credits_invoiced: z.number().nullable().optional(), // Euro amount being invoiced for shortage
  credits_amount: z.number().int(), // For purchases: credits purchased, for legacy spend: credits deducted
  vacancy_name: z.string().nullable().optional(), // Lookup field from Vacancies
  invoice: z.array(airtableAttachmentSchema).nullable().optional(), // Attachment field
  invoice_details_snapshot: z.string().nullable().optional(), // JSON string with invoice details at time of purchase
  invoice_trigger: z.enum(["on_vacancy_publish"]).nullable().optional(), // When to send invoice (null = no invoice needed)
  // Credit expiration fields (for purchase transactions)
  expires_at: z.string().nullable().optional(), // When credits from this purchase expire
  remaining_credits: z.number().int().nullable().optional(), // Credits remaining from this purchase batch
  "created-at": z.string().optional(),
});

export const productRecordSchema = z.object({
  id: z.string(),
  slug: z.string().optional(), // Custom product identifier from Airtable "id" column (e.g. "prod_upsell_same_day")
  display_name: z.string(),
  description: z.string().nullable().optional(), // Long text description
  type: z.enum(["vacancy_package", "credit_bundle", "upsell"]),
  credits: z.number().int(),
  base_price: z.number().nullable().optional(), // Reference price (for showing discount)
  price: z.number(), // Actual selling price excl. VAT
  discount_percentage: z.number().nullable().optional(), // Calculated formula field
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  features: z.array(z.string()).optional(), // Linked records to Features
  included_upsells: z.array(z.string()).optional(), // Linked records to Products (upsells included in this package)
  target_roles: z.array(z.string()).optional(), // Linked records to Roles - empty = visible for all roles
  availability: z.array(z.enum(["add-vacancy", "boost-option"])).optional().default([]), // Multiple select: where this product is available
  validity_months: z.number().int().nullable().optional(), // Months until credits expire (for credit_bundle type)
  credit_expiry_warning_days: z.number().int().nullable().optional(), // Days before expiry to show warning (for credit_bundle type)
  billing_cycle: z.enum(["one_time", "yearly"]).nullable().optional(), // Billing cycle for credit bundles
  repeat_mode: z.enum(["once", "unlimited", "renewable", "until_max"]).nullable().optional(), // Controls repeat purchase behavior per vacancy
  duration_days: z.number().int().nullable().optional(), // Base duration in days: for vacancy_package = online duration, for upsell with repeat_mode=renewable = effect duration
  max_value: z.number().int().nullable().optional(), // Only for repeat_mode=until_max: maximum cumulative value (e.g. 365 days)
});

export const featurePackageCategoryEnum = z.enum([
  "always_included",
  "extra_boost",
  "spotlight",
]);

export const featureActionTagEnum = z.enum([
  "cj_daily_alert",
  "cj_social_post",
  "cj_google_campaigns",
  "cj_same_day_online",
]);

export const featureRecordSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  is_active: z.boolean().default(true),
  action_tags: z.string().nullable().optional(), // More permissive - accept any string
  sort_order: z.number().int().default(0),
  products: z.array(z.string()).optional(), // Linked to Products
  package_category: z.string().nullable().optional(), // More permissive - accept any string
});

// ============================================
// VACANCY SCHEMAS
// ============================================

export const vacancyStatusEnum = z.enum([
  "concept",
  "incompleet",
  "wacht_op_goedkeuring",
  "gepubliceerd",
  "verlopen",
  "gedepubliceerd",
]);

// Map Airtable status values to application status values
// Airtable stores status as lowercase snake_case (concept, awaiting_approval, published, etc.)
// but the application uses Dutch snake_case values
const airtableToAppStatusMap: Record<string, string> = {
  // Airtable values → App values
  "concept": "concept",
  "awaiting_approval": "wacht_op_goedkeuring",
  "published": "gepubliceerd",
  "expired": "verlopen",
  "unpublished": "gedepubliceerd",
  "needs_adjustment": "incompleet",
};

// Reverse map: application status (Dutch) to Airtable status (English)
const appToAirtableStatusMap: Record<string, string> = {
  "concept": "concept",
  "incompleet": "needs_adjustment",
  "wacht_op_goedkeuring": "awaiting_approval",
  "gepubliceerd": "published",
  "verlopen": "expired",
  "gedepubliceerd": "unpublished",
};

function mapVacancyStatusFromAirtable(status: string | undefined): string {
  if (!status) return "concept";
  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, "_");
  return airtableToAppStatusMap[normalizedStatus] || airtableToAppStatusMap[status.toLowerCase()] || "concept";
}

function mapVacancyStatusToAirtable(status: string | undefined): string {
  if (!status) return "concept";
  return appToAirtableStatusMap[status] || status;
}

export const vacancyInputTypeEnum = z.enum(["self_service", "we_do_it_for_you"]);

export const vacancyEmploymentTypeEnum = z.enum([
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Other",
]);

export const vacancyRecordSchema = z.object({
  id: z.string(),
  employer_id: z.string().nullable().optional(), // Linked to Employers
  title: z.string().nullable().optional(),
  status: vacancyStatusEnum.default("concept"),
  input_type: vacancyInputTypeEnum.default("self_service"),
  
  // Content
  intro_txt: z.string().nullable().optional(),
  description: z.string().nullable().optional(), // Rich text (HTML)
  
  // Location & job details
  location: z.string().nullable().optional(),
  employment_type: vacancyEmploymentTypeEnum.nullable().optional(),
  hrs_per_week: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  
  // Linked lookup tables (sorted alphabetically)
  education_level_id: z.string().nullable().optional(), // Linked to EducationLevels
  field_id: z.string().nullable().optional(), // Linked to Fields (vakgebied)
  function_type_id: z.string().nullable().optional(), // Linked to FunctionTypes
  region_id: z.string().nullable().optional(), // Linked to Regions
  sector_id: z.string().nullable().optional(), // Linked to Sectors
  
  // Package & upsells
  package_id: z.string().nullable().optional(), // Linked to Products
  selected_upsells: z.array(z.string()).optional(), // Linked to Products (multiple)
  
  // Application
  apply_url: z.string().nullable().optional(),
  application_email: z.string().nullable().optional(),
  show_apply_form: z.boolean().default(false),
  
  // Contact person
  contact_name: z.string().nullable().optional(),
  contact_role: z.string().nullable().optional(),
  contact_company: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  contact_photo_id: z.string().nullable().optional(), // Linked to Media Assets
  
  // Social proof
  recommendations: z.string().nullable().optional(), // JSON string array
  
  // Notes
  note: z.string().nullable().optional(), // Internal notes for Colourful jobs team
  
  // Media
  header_image: z.string().nullable().optional(), // Linked to Media Assets (single)
  gallery: z.array(z.string()).optional(), // Linked to Media Assets (multiple)
  
  // Credits & transactions
  credits_spent: z.number().int().optional(), // Rollup field - actual credits deducted from wallet
  money_invoiced: z.number().optional(), // Rollup field - euro amount to be invoiced
  credit_transactions: z.array(z.string()).optional(), // Linked to Transactions
  
  // Users & events
  users: z.array(z.string()).optional(), // Linked to Users (creator)
  events: z.array(z.string()).optional(), // Linked to Events
  
  // Webflow
  public_url: z.string().nullable().optional(), // URL of the published vacancy on the Webflow website
  needs_webflow_sync: z.boolean().default(false), // Set to true when changes need to be synced to Webflow

  // Priority
  high_priority: z.boolean().default(false), // Set when "Zelfde dag online" upsell is purchased

  // Timestamps
  "created-at": z.string().optional(),
  "updated-at": z.string().optional(),
  "submitted-at": z.string().optional(),
  "first-published-at": z.string().optional(),
  "last-published-at": z.string().optional(),
  "depublished-at": z.string().optional(),
  "last-status_changed-at": z.string().optional(),
  closing_date: z.string().nullable().optional(),
});

// ============================================
// LOOKUP TABLE SCHEMAS
// ============================================

export const lookupRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// Type aliases for clarity
export const educationLevelRecordSchema = lookupRecordSchema;
export const fieldRecordSchema = lookupRecordSchema; // Vakgebied
export const functionTypeRecordSchema = lookupRecordSchema;
export const regionRecordSchema = lookupRecordSchema;
export const sectorRecordSchema = lookupRecordSchema;

export type UserRecord = z.infer<typeof userRecordSchema>;
type EmployerRecord = z.infer<typeof employerRecordSchema>;
type WalletRecord = z.infer<typeof walletRecordSchema>;
export type TransactionRecord = z.infer<typeof transactionRecordSchema>;
export type MediaAssetRecord = z.infer<typeof mediaAssetRecordSchema>;
export type FAQRecord = z.infer<typeof faqRecordSchema>;
export type ProductRecord = z.infer<typeof productRecordSchema>;
export type FeatureRecord = z.infer<typeof featureRecordSchema>;
export type FeaturePackageCategory = z.infer<typeof featurePackageCategoryEnum>;
export type VacancyRecord = z.infer<typeof vacancyRecordSchema>;
export type VacancyStatus = z.infer<typeof vacancyStatusEnum>;
export type VacancyInputType = z.infer<typeof vacancyInputTypeEnum>;
export type VacancyEmploymentType = z.infer<typeof vacancyEmploymentTypeEnum>;
export type LookupRecord = z.infer<typeof lookupRecordSchema>;

const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || "Users";
const EMPLOYERS_TABLE = process.env.AIRTABLE_EMPLOYERS_TABLE || "Employers";
const WALLETS_TABLE = process.env.AIRTABLE_WALLETS_TABLE || "Wallets";
const ROLES_TABLE = process.env.AIRTABLE_ROLES_TABLE || "Roles";
const TRANSACTIONS_TABLE = process.env.AIRTABLE_TRANSACTIONS_TABLE || "Transactions";
const MEDIA_ASSETS_TABLE = process.env.AIRTABLE_MEDIA_ASSETS_TABLE || "Media Assets";
const FAQ_TABLE = process.env.AIRTABLE_FAQ_TABLE || "FAQ";
const PRODUCTS_TABLE = process.env.AIRTABLE_PRODUCTS_TABLE || "Products";
const FEATURES_TABLE = process.env.AIRTABLE_FEATURES_TABLE || "Features";
const VACANCIES_TABLE = process.env.AIRTABLE_VACANCIES_TABLE || "Vacancies";
// Lookup tables (sorted alphabetically by name)
const EDUCATION_LEVELS_TABLE = process.env.AIRTABLE_EDUCATION_LEVELS_TABLE || "EducationLevels";
const FIELDS_TABLE = process.env.AIRTABLE_FIELDS_TABLE || "Fields";
const FUNCTION_TYPES_TABLE = process.env.AIRTABLE_FUNCTION_TYPES_TABLE || "FunctionTypes";
const REGIONS_TABLE = process.env.AIRTABLE_REGIONS_TABLE || "Regions";
const SECTORS_TABLE = process.env.AIRTABLE_SECTORS_TABLE || "Sectors";

// Cache for the employer role ID (so we don't query Airtable every time)
let cachedEmployerRoleId: string | null = null;

/**
 * Get the "employer" role ID from the Roles table
 * Caches the result to avoid repeated API calls
 */
async function getEmployerRoleId(): Promise<string | null> {
  // Return cached value if available
  if (cachedEmployerRoleId) {
    return cachedEmployerRoleId;
  }

  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const records = await base(ROLES_TABLE)
      .select({
        filterByFormula: `LOWER({id}) = 'employer'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records[0]) {
      cachedEmployerRoleId = records[0].id;
      return cachedEmployerRoleId;
    }

    console.warn("No 'employer' role found in Roles table. Employers will be created without a role.");
    return null;
  } catch (error: unknown) {
    console.error("Error fetching employer role:", getErrorMessage(error));
    return null;
  }
}

/**
 * Helper to extract linked/lookup fields from Airtable user record fields.
 * Airtable Link and Lookup fields return arrays, but our schema expects
 * single values (strings) or specific array shapes.
 */
function extractUserFields(fields: Record<string, unknown>) {
  const employer_id = Array.isArray(fields.employer_id)
    ? fields.employer_id[0] || null
    : fields.employer_id || null;
  const invited_by = Array.isArray(fields.invited_by)
    ? fields.invited_by[0] || null
    : fields.invited_by || null;
  const active_employer = Array.isArray(fields.active_employer)
    ? fields.active_employer[0] || null
    : fields.active_employer || null;
  const managed_employers = Array.isArray(fields.managed_employers)
    ? fields.managed_employers
    : [];
  // role is a Link field → returns array, extract first value
  const role = Array.isArray(fields.role)
    ? fields.role[0] || undefined
    : fields.role || undefined;
  // role_id is a Lookup field → returns array, extract first value
  const role_id = Array.isArray(fields.role_id)
    ? fields.role_id[0] || null
    : fields.role_id || null;

  return { employer_id, invited_by, active_employer, managed_employers, role, role_id };
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    if (!baseId || !apiKey) return null;

    const records = await base(USERS_TABLE)
      .select({
        filterByFormula: `{email} = '${escapeAirtableString(email)}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (!records[0]) return null;

    const fields = records[0].fields;
    const extracted = extractUserFields(fields as Record<string, unknown>);

    return userRecordSchema.parse({
      id: records[0].id,
      ...fields,
      ...extracted,
    });
  } catch (error) {
    console.error("Error fetching user by email:", getErrorMessage(error));
    return null;
  }
}

export async function createUser(fields: {
  email: string;
  employer_id?: string | null;
  status?: UserRecord["status"];
  first_name?: string;
  last_name?: string;
  role?: string;
  // Invitation fields
  invite_token?: string | null;
  invite_expires?: string | null;
  invited_by?: string | null;
}): Promise<UserRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    email: fields.email,
    status: fields.status ?? "pending_onboarding",
    "created-at": new Date().toISOString(),
  };

  if (fields.employer_id) {
    // Airtable Link fields require an array of record IDs
    airtableFields.employer_id = [fields.employer_id];
  }

  if (fields.first_name) airtableFields.first_name = fields.first_name;
  if (fields.last_name) airtableFields.last_name = fields.last_name;
  if (fields.role) {
    airtableFields.role = fields.role;
  } else {
    // Automatically assign employer role if no role is provided (regular onboarding)
    const employerRoleId = await getEmployerRoleId();
    if (employerRoleId) {
      airtableFields.role = [employerRoleId];
    }
  }

  // Invitation fields
  if (fields.invite_token) airtableFields.invite_token = fields.invite_token;
  if (fields.invite_expires) airtableFields.invite_expires = fields.invite_expires;
  if (fields.invited_by) {
    // Airtable Link fields require an array of record IDs
    airtableFields.invited_by = [fields.invited_by];
  }

  try {
    const record = await base(USERS_TABLE).create(airtableFields);

    // Update the record to set the id field to the Airtable record ID
    await base(USERS_TABLE).update(record.id, { id: record.id });

    const resultFields = record.fields;
    const extracted = extractUserFields(resultFields as Record<string, unknown>);

    return userRecordSchema.parse({
      id: record.id,
      ...resultFields,
      ...extracted,
    });
  } catch (error: unknown) {
    console.error("Error creating user in Airtable:", {
      table: USERS_TABLE,
      fields: airtableFields,
      error: getErrorMessage(error),
      statusCode: hasStatusCode(error) ? error.statusCode : undefined,
    });
    throw new Error(`Failed to create user: ${getErrorMessage(error)}`);
  }
}

export async function createEmployer(fields: Partial<EmployerRecord>): Promise<EmployerRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  // Get the employer role ID (cached after first call)
  const employerRoleId = await getEmployerRoleId();

  const airtableFields: Record<string, any> = {
    status: fields.status ?? "draft",
    // Automatically link to "employer" role from Roles table
    ...(employerRoleId && { role: fields.role ?? [employerRoleId] }),
    "created-at": new Date().toISOString(),
  };

  // Map all possible fields
  if (fields.company_name !== undefined) airtableFields.company_name = fields.company_name;
  if (fields.display_name !== undefined) airtableFields.display_name = fields.display_name;
  if (fields.kvk !== undefined) airtableFields.kvk = fields.kvk;
  if (fields.phone !== undefined) airtableFields.phone = fields.phone;
  if (fields.website_url !== undefined) airtableFields.website_url = fields.website_url;
  if (fields["reference-nr"] !== undefined) airtableFields["reference-nr"] = fields["reference-nr"];
  if (fields.invoice_contact_name !== undefined) airtableFields.invoice_contact_name = fields.invoice_contact_name;
  if (fields.invoice_email !== undefined) airtableFields.invoice_email = fields.invoice_email;
  if (fields.invoice_street !== undefined) airtableFields.invoice_street = fields.invoice_street;
  if (fields["invoice_postal-code"] !== undefined) airtableFields["invoice_postal-code"] = fields["invoice_postal-code"];
  if (fields.invoice_city !== undefined) airtableFields.invoice_city = fields.invoice_city;
  if (fields.sector !== undefined) airtableFields.sector = fields.sector;
  if (fields.location !== undefined) airtableFields.location = fields.location;
  if (fields.short_description !== undefined) airtableFields.short_description = fields.short_description;
  // Linked records to Media Assets (require arrays of record IDs)
  if (fields.logo !== undefined) airtableFields.logo = fields.logo;
  if (fields.header_image !== undefined) airtableFields.header_image = fields.header_image;
  if (fields.gallery !== undefined) airtableFields.gallery = fields.gallery;
  if (fields.video_url !== undefined) airtableFields.video_url = fields.video_url;

  try {
    const record = await base(EMPLOYERS_TABLE).create(airtableFields);

    // Update the record to set the employer_id field to the Airtable record ID
    await base(EMPLOYERS_TABLE).update(record.id, { employer_id: record.id });

    return employerRecordSchema.parse({
      id: record.id,
      ...record.fields,
    });
  } catch (error: unknown) {
    console.error("Error creating employer in Airtable:", {
      table: EMPLOYERS_TABLE,
      fields: airtableFields,
      error: getErrorMessage(error),
      statusCode: hasStatusCode(error) ? error.statusCode : undefined,
    });
    throw new Error(`Failed to create employer: ${getErrorMessage(error)}`);
  }
}

export async function updateEmployer(
  id: string,
  fields: Partial<EmployerRecord>
): Promise<EmployerRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    // Always update the updated-at timestamp
    "updated-at": new Date().toISOString(),
  };
  
  // Map all possible fields
  if (fields.company_name !== undefined) airtableFields.company_name = fields.company_name;
  if (fields.display_name !== undefined) airtableFields.display_name = fields.display_name;
  if (fields.kvk !== undefined) airtableFields.kvk = fields.kvk;
  if (fields.phone !== undefined) airtableFields.phone = fields.phone;
  if (fields.website_url !== undefined) airtableFields.website_url = fields.website_url;
  if (fields["reference-nr"] !== undefined) airtableFields["reference-nr"] = fields["reference-nr"];
  if (fields.invoice_contact_name !== undefined) airtableFields.invoice_contact_name = fields.invoice_contact_name;
  if (fields.invoice_email !== undefined) airtableFields.invoice_email = fields.invoice_email;
  if (fields.invoice_street !== undefined) airtableFields.invoice_street = fields.invoice_street;
  if (fields["invoice_postal-code"] !== undefined) airtableFields["invoice_postal-code"] = fields["invoice_postal-code"];
  if (fields.invoice_city !== undefined) airtableFields.invoice_city = fields.invoice_city;
  if (fields.sector !== undefined) airtableFields.sector = fields.sector;
  if (fields.location !== undefined) airtableFields.location = fields.location;
  if (fields.short_description !== undefined) airtableFields.short_description = fields.short_description;
  // Linked records (require arrays of record IDs)
  if (fields.logo !== undefined) airtableFields.logo = fields.logo;
  if (fields.header_image !== undefined) airtableFields.header_image = fields.header_image;
  if (fields.gallery !== undefined) airtableFields.gallery = fields.gallery;
  if (fields.faq !== undefined) airtableFields.faq = fields.faq; // FAQ order matters for Webflow
  if (fields.video_url !== undefined) airtableFields.video_url = fields.video_url;
  if (fields.status !== undefined) airtableFields.status = fields.status;
  if (fields.onboarding_dismissed !== undefined) airtableFields.onboarding_dismissed = fields.onboarding_dismissed;

  const record = await base(EMPLOYERS_TABLE).update(id, airtableFields);

  return employerRecordSchema.parse({
    id: record.id,
    ...record.fields,
  });
}

export async function updateUser(
  id: string,
  fields: Partial<UserRecord>
): Promise<UserRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    // Always update the updated-at timestamp
    "updated-at": new Date().toISOString(),
  };
  if (fields.first_name !== undefined) airtableFields.first_name = fields.first_name;
  if (fields.last_name !== undefined) airtableFields.last_name = fields.last_name;
  if (fields.email !== undefined) airtableFields.email = fields.email;
  if (fields.status !== undefined) airtableFields.status = fields.status;
  if (fields.role !== undefined) airtableFields.role = fields.role;
  // Support linking user to existing employer (for join flow)
  if (fields.employer_id !== undefined) {
    // Airtable Link fields require an array of record IDs
    airtableFields.employer_id = fields.employer_id ? [fields.employer_id] : null;
  }
  // Invitation fields
  if (fields.invite_token !== undefined) airtableFields.invite_token = fields.invite_token;
  if (fields.invite_expires !== undefined) airtableFields.invite_expires = fields.invite_expires;
  if (fields.invited_by !== undefined) {
    // Airtable Link fields require an array of record IDs
    airtableFields.invited_by = fields.invited_by ? [fields.invited_by] : null;
  }

  const record = await base(USERS_TABLE).update(id, airtableFields);

  const fields_result = record.fields;
  const extracted = extractUserFields(fields_result as Record<string, unknown>);

  return userRecordSchema.parse({
    id: record.id,
    ...fields_result,
    ...extracted,
  });
}

export async function getEmployerByKVK(kvkNumber: string): Promise<EmployerRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const records = await base(EMPLOYERS_TABLE)
      .select({
        filterByFormula: `{kvk} = '${escapeAirtableString(kvkNumber)}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (!records[0]) return null;

    return employerRecordSchema.parse({
      id: records[0].id,
      ...records[0].fields,
    });
  } catch (error: unknown) {
    console.error("Error getting employer by KVK:", getErrorMessage(error));
    return null;
  }
}

/**
 * Get employer by Airtable record ID
 * Used for joining existing employer flow
 */
export async function getEmployerById(id: string): Promise<EmployerRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const record = await base(EMPLOYERS_TABLE).find(id);

    if (!record) return null;

    const fields = record.fields;
    
    // Extract linked record IDs (Airtable returns arrays for linked records)
    const logo = Array.isArray(fields.logo) ? fields.logo : [];
    const header_image = Array.isArray(fields.header_image) ? fields.header_image : [];
    const gallery = Array.isArray(fields.gallery) ? fields.gallery : [];
    const sector = Array.isArray(fields.sector) ? fields.sector : [];

    return employerRecordSchema.parse({
      id: record.id,
      ...fields,
      logo,
      header_image,
      gallery,
      sector,
    });
  } catch (error: unknown) {
    console.error("Error getting employer by ID:", getErrorMessage(error));
    return null;
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(USERS_TABLE).destroy(id);
  } catch (error: unknown) {
    console.error("Error deleting user from Airtable:", getErrorMessage(error));
    throw new Error(`Failed to delete user: ${getErrorMessage(error)}`);
  }
}

export async function deleteEmployer(id: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(EMPLOYERS_TABLE).destroy(id);
  } catch (error: unknown) {
    console.error("Error deleting employer from Airtable:", getErrorMessage(error));
    throw new Error(`Failed to delete employer: ${getErrorMessage(error)}`);
  }
}

/**
 * Create a new wallet for an employer
 * Called automatically when a new employer is created during onboarding
 */
export async function createWallet(employerId: string): Promise<WalletRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    owner_type: "employer",
    owner_employer: [employerId], // Linked record requires array
    balance: 0,
    "created-at": new Date().toISOString(),
    "last-updated": new Date().toISOString(),
  };

  try {
    const record = await base(WALLETS_TABLE).create(airtableFields);

    // Update the record to set the id field to the Airtable record ID
    await base(WALLETS_TABLE).update(record.id, { id: record.id });

    const fields = record.fields;
    // Extract linked record ID from array
    const owner_employer = Array.isArray(fields.owner_employer)
      ? fields.owner_employer[0] || null
      : fields.owner_employer || null;

    return walletRecordSchema.parse({
      id: record.id,
      ...fields,
      owner_employer,
    });
  } catch (error: unknown) {
    console.error("Error creating wallet in Airtable:", {
      table: WALLETS_TABLE,
      fields: airtableFields,
      error: getErrorMessage(error),
      statusCode: hasStatusCode(error) ? error.statusCode : undefined,
    });
    throw new Error(`Failed to create wallet: ${getErrorMessage(error)}`);
  }
}

/**
 * Get wallet by employer ID
 * Returns the wallet associated with the given employer, or null if not found
 */
export async function getWalletByEmployerId(employerId: string): Promise<WalletRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const records = await base(WALLETS_TABLE)
      .select({
        filterByFormula: `FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({owner_employer}))`,
        maxRecords: 1,
      })
      .firstPage();

    if (!records[0]) return null;

    const fields = records[0].fields;
    // Extract linked record ID from array
    const owner_employer = Array.isArray(fields.owner_employer)
      ? fields.owner_employer[0] || null
      : fields.owner_employer || null;
    const owner_user = Array.isArray(fields.owner_user)
      ? fields.owner_user[0] || null
      : fields.owner_user || null;

    return walletRecordSchema.parse({
      id: records[0].id,
      ...fields,
      owner_employer,
      owner_user,
    });
  } catch (error: unknown) {
    console.error("Error getting wallet by employer ID:", getErrorMessage(error));
    return null;
  }
}

/**
 * Delete a wallet by employer ID
 * Used to clean up wallets when an employer is deleted (e.g., during onboarding restart)
 */
export async function deleteWalletByEmployerId(employerId: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    const wallet = await getWalletByEmployerId(employerId);
    if (wallet) {
      await base(WALLETS_TABLE).destroy(wallet.id);
    }
  } catch (error: unknown) {
    console.error("Error deleting wallet by employer ID:", getErrorMessage(error));
    throw new Error(`Failed to delete wallet: ${getErrorMessage(error)}`);
  }
}

// ============================================
// INTERMEDIARY WALLET FUNCTIONS
// ============================================

/**
 * Get wallet for an intermediary user (by user ID)
 * Intermediaries have user-level wallets instead of employer-level wallets
 */
export async function getWalletByUserId(userId: string): Promise<WalletRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const records = await base(WALLETS_TABLE)
      .select({
        filterByFormula: `FIND('${escapeAirtableString(userId)}', ARRAYJOIN({owner_user}))`,
        maxRecords: 1,
      })
      .firstPage();

    if (!records[0]) return null;

    const fields = records[0].fields;
    const owner_employer = Array.isArray(fields.owner_employer)
      ? fields.owner_employer[0] || null
      : fields.owner_employer || null;
    const owner_user = Array.isArray(fields.owner_user)
      ? fields.owner_user[0] || null
      : fields.owner_user || null;

    return walletRecordSchema.parse({
      id: records[0].id,
      ...fields,
      owner_employer,
      owner_user,
    });
  } catch (error: unknown) {
    console.error("Error getting wallet by user ID:", getErrorMessage(error));
    return null;
  }
}

/**
 * Create a wallet for an intermediary user
 */
export async function createUserWallet(userId: string): Promise<WalletRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    const records = await base(WALLETS_TABLE).create([
      {
        fields: {
          owner_user: [userId],
          owner_type: "user",
          balance: 0,
          total_purchased: 0,
          total_spent: 0,
          "created-at": new Date().toISOString(),
          "last-updated": new Date().toISOString(),
        },
      },
    ]);

    const fields = records[0].fields;
    const owner_user = Array.isArray(fields.owner_user)
      ? fields.owner_user[0] || null
      : fields.owner_user || null;

    return walletRecordSchema.parse({
      id: records[0].id,
      ...fields,
      owner_user,
      owner_employer: null,
    });
  } catch (error: unknown) {
    console.error("Error creating user wallet:", getErrorMessage(error));
    throw new Error(`Failed to create user wallet: ${getErrorMessage(error)}`);
  }
}

/**
 * Get wallet for a user - handles both employer users and intermediary users
 * For intermediaries (role_id = "intermediary"): returns user-level wallet
 * For employers: returns employer-level wallet
 */
export async function getWalletForUser(user: UserRecord): Promise<WalletRecord | null> {
  if (user.role_id === "intermediary") {
    return getWalletByUserId(user.id);
  }
  if (user.employer_id) {
    return getWalletByEmployerId(user.employer_id);
  }
  return null;
}

/**
 * Get all employers managed by an intermediary
 * Returns employer records for the IDs in managed_employers
 */
export async function getManagedEmployers(userId: string): Promise<EmployerRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const user = await getUserById(userId);
    if (!user || !user.managed_employers || user.managed_employers.length === 0) {
      return [];
    }

    // Fetch each employer by ID
    const employers: EmployerRecord[] = [];
    for (const employerId of user.managed_employers) {
      const employer = await getEmployerById(employerId);
      if (employer) {
        employers.push(employer);
      }
    }

    return employers;
  } catch (error: unknown) {
    console.error("Error getting managed employers:", getErrorMessage(error));
    return [];
  }
}

/**
 * Set the active employer for an intermediary user
 * Updates the active_employer field in the Users table
 */
export async function setActiveEmployer(userId: string, employerId: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(USERS_TABLE).update(userId, {
      active_employer: [employerId],
    });
  } catch (error: unknown) {
    console.error("Error setting active employer:", getErrorMessage(error));
    throw new Error(`Failed to set active employer: ${getErrorMessage(error)}`);
  }
}

/**
 * Get all transactions for a wallet
 * Used for intermediaries who have user-level wallets
 */
export async function getTransactionsByWalletId(walletId: string): Promise<TransactionRecord[]> {
  if (!baseId || !apiKey) {
    console.log("[Transactions] Airtable not configured");
    return [];
  }

  try {
    const records = await base(TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `FIND('${escapeAirtableString(walletId)}', ARRAYJOIN({wallet_id}))`,
        sort: [{ field: "created-at", direction: "desc" }],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      const employer_id = Array.isArray(fields.employer_id)
        ? fields.employer_id[0] || null
        : fields.employer_id || null;
      const wallet_id = Array.isArray(fields.wallet_id)
        ? fields.wallet_id[0] || null
        : fields.wallet_id || null;
      const vacancy_id = Array.isArray(fields.vacancy_id)
        ? fields.vacancy_id[0] || null
        : fields.vacancy_id || null;
      const user_id = Array.isArray(fields.user_id)
        ? fields.user_id[0] || null
        : fields.user_id || null;
      const product_ids = Array.isArray(fields.product_ids) ? fields.product_ids : [];
      const invoice = Array.isArray(fields.invoice) ? fields.invoice : null;

      return transactionRecordSchema.parse({
        id: record.id,
        ...fields,
        employer_id,
        wallet_id,
        vacancy_id,
        user_id,
        product_ids,
        invoice,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting transactions by wallet ID:", getErrorMessage(error));
    return [];
  }
}

/**
 * Get all transactions for an employer
 * Returns transactions sorted by created-at date (newest first)
 */
export async function getTransactionsByEmployerId(employerId: string): Promise<TransactionRecord[]> {
  if (!baseId || !apiKey) {
    console.log("[Transactions] Airtable not configured");
    return [];
  }

  try {
    console.log("[Transactions] Fetching for employer:", employerId);
    console.log("[Transactions] Using table:", TRANSACTIONS_TABLE);
    
    const records = await base(TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({employer}))`,
        sort: [{ field: "created-at", direction: "desc" }],
      })
      .all();
    
    console.log("[Transactions] Raw records found:", records.length);
    if (records.length > 0) {
      console.log("[Transactions] First record fields:", Object.keys(records[0].fields));
    }

    return records.map((record) => {
      const fields = record.fields;
      
      // Extract linked record IDs from arrays
      const employer_id = Array.isArray(fields.employer)
        ? fields.employer[0] || null
        : fields.employer || null;
      const wallet_id = Array.isArray(fields.wallet)
        ? fields.wallet[0] || null
        : fields.wallet || null;
      const user_id = Array.isArray(fields.user)
        ? fields.user[0] || null
        : fields.user || null;
      const vacancy_id = Array.isArray(fields.vacancy)
        ? fields.vacancy[0] || null
        : fields.vacancy || null;
      const product_ids = Array.isArray(fields.product_id)
        ? fields.product_id
        : [];
      // vacancy_name is a lookup field, so it comes back as an array
      const vacancy_name = Array.isArray(fields.vacancy_name)
        ? fields.vacancy_name[0] || null
        : fields.vacancy_name || null;

      return transactionRecordSchema.parse({
        id: record.id,
        employer_id,
        wallet_id,
        vacancy_id,
        user_id,
        product_ids,
        type: fields.type,
        reference_type: fields.reference_type || null,
        context: (fields.context as string) || null,
        status: fields.status,
        money_amount: fields.money_amount || null,
        total_cost: fields.total_cost || null,
        total_credits: fields.total_credits || null,
        credits_shortage: fields.credits_shortage || null,
        credits_invoiced: fields.credits_invoiced || null,
        // For spend transactions use total_credits, for purchases use credits_amount (legacy)
        credits_amount: fields.total_credits || fields.credits_amount || 0,
        vacancy_name,
        invoice: fields.invoice || null,
        invoice_details_snapshot: (fields.invoice_details_snapshot as string) || null,
        invoice_trigger: (fields.invoice_trigger as "on_vacancy_publish") || null,
        expires_at: (fields.expires_at as string) || null,
        remaining_credits: (fields.remaining_credits as number) || null,
        "created-at": fields["created-at"] as string | undefined,
      });
    });
  } catch (error: unknown) {
    console.error("[Transactions] Error:", getErrorMessage(error));
    console.error("[Transactions] Full error:", error);
    return [];
  }
}

/**
 * Get spend transactions for a specific vacancy (used for repeat_mode filtering)
 * Returns only spend/boost transactions linked to this vacancy, sorted by created-at desc
 */
export async function getTransactionsByVacancyId(vacancyId: string): Promise<TransactionRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const records = await base(TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `AND(FIND('${escapeAirtableString(vacancyId)}', ARRAYJOIN({vacancy})), OR({context} = 'vacancy', {context} = 'boost', {context} = 'included'))`,
        sort: [{ field: "created-at", direction: "desc" }],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;

      const employer_id = Array.isArray(fields.employer)
        ? fields.employer[0] || null
        : fields.employer || null;
      const wallet_id = Array.isArray(fields.wallet)
        ? fields.wallet[0] || null
        : fields.wallet || null;
      const user_id = Array.isArray(fields.user)
        ? fields.user[0] || null
        : fields.user || null;
      const vacancy_id = Array.isArray(fields.vacancy)
        ? fields.vacancy[0] || null
        : fields.vacancy || null;
      const product_ids = Array.isArray(fields.product_id)
        ? fields.product_id
        : [];
      const vacancy_name = Array.isArray(fields.vacancy_name)
        ? fields.vacancy_name[0] || null
        : fields.vacancy_name || null;

      return transactionRecordSchema.parse({
        id: record.id,
        employer_id,
        wallet_id,
        vacancy_id,
        user_id,
        product_ids,
        type: fields.type,
        reference_type: fields.reference_type || null,
        status: fields.status,
        money_amount: fields.money_amount || null,
        total_cost: fields.total_cost || null,
        total_credits: fields.total_credits || null,
        credits_shortage: fields.credits_shortage || null,
        credits_invoiced: fields.credits_invoiced || null,
        credits_amount: fields.total_credits || fields.credits_amount || 0,
        vacancy_name,
        invoice: fields.invoice || null,
        invoice_details_snapshot: (fields.invoice_details_snapshot as string) || null,
        invoice_trigger: (fields.invoice_trigger as "on_vacancy_publish") || null,
        expires_at: (fields.expires_at as string) || null,
        remaining_credits: (fields.remaining_credits as number) || null,
        "created-at": fields["created-at"] as string | undefined,
      });
    });
  } catch (error: unknown) {
    console.error("[Transactions] Error fetching by vacancy:", getErrorMessage(error));
    return [];
  }
}

// ============================================
// MEDIA ASSETS FUNCTIONS
// ============================================

/**
 * Get a media asset by ID
 * Returns the media asset or null if not found
 */
export async function getMediaAssetById(id: string): Promise<MediaAssetRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const record = await base(MEDIA_ASSETS_TABLE).find(id);

    if (!record) return null;

    const fields = record.fields;
    const employer_id = Array.isArray(fields.employer)
      ? fields.employer[0] || null
      : fields.employer || null;

    // Handle alt_text which can be a string, array (lookup), or undefined
    let alt_text = "";
    if (typeof fields.alt_text === "string") {
      alt_text = fields.alt_text;
    } else if (Array.isArray(fields.alt_text) && fields.alt_text.length > 0) {
      alt_text = String(fields.alt_text[0]);
    }

    return mediaAssetRecordSchema.parse({
      id: record.id,
      employer_id,
      type: fields.type,
      file: fields.file || [],
      alt_text,
      file_size: fields.file_size || 0,
      show_on_company_page: fields.show_on_company_page || false,
      is_deleted: fields.is_deleted || false,
      "created-at": fields["created-at"] as string | undefined,
    });
  } catch (error: unknown) {
    console.error("Error getting media asset by ID:", getErrorMessage(error));
    return null;
  }
}

/**
 * Get multiple media assets by IDs
 * Returns the media assets in the same order as the input IDs array
 */
export async function getMediaAssetsByIds(ids: string[]): Promise<MediaAssetRecord[]> {
  if (!baseId || !apiKey || ids.length === 0) {
    return [];
  }

  try {
    const results: MediaAssetRecord[] = [];
    
    // Fetch each record individually (Airtable doesn't have a batch find)
    for (const id of ids) {
      const asset = await getMediaAssetById(id);
      if (asset && !asset.is_deleted) {
        results.push(asset);
      }
    }
    
    return results;
  } catch (error: unknown) {
    console.error("Error getting media assets by IDs:", getErrorMessage(error));
    return [];
  }
}

/**
 * Get all media assets for an employer
 * Returns media assets sorted by created-at date (newest first)
 * Optionally filter by type and exclude deleted assets
 */
export async function getMediaAssetsByEmployerId(
  employerId: string,
  options?: { type?: MediaAssetRecord["type"]; includeDeleted?: boolean }
): Promise<MediaAssetRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    let filterFormula = `FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({employer}))`;
    
    // Add type filter if specified
    if (options?.type) {
      filterFormula = `AND(${filterFormula}, {type} = '${options.type}')`;
    }
    
    // Exclude deleted assets by default
    if (!options?.includeDeleted) {
      filterFormula = `AND(${filterFormula}, NOT({is_deleted}))`;
    }

    const records = await base(MEDIA_ASSETS_TABLE)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: "created-at", direction: "desc" }],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      
      // Extract linked record ID from array
      const employer_id = Array.isArray(fields.employer)
        ? fields.employer[0] || null
        : fields.employer || null;

      // Handle alt_text which can be a string, array (lookup), or undefined
      let alt_text = "";
      if (typeof fields.alt_text === "string") {
        alt_text = fields.alt_text;
      } else if (Array.isArray(fields.alt_text) && fields.alt_text.length > 0) {
        alt_text = String(fields.alt_text[0]);
      }

      return mediaAssetRecordSchema.parse({
        id: record.id,
        employer_id,
        type: fields.type,
        file: fields.file || [],
        alt_text,
        file_size: fields.file_size || 0,
        show_on_company_page: fields.show_on_company_page || false,
        is_deleted: fields.is_deleted || false,
        "created-at": fields["created-at"] as string | undefined,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting media assets by employer ID:", getErrorMessage(error));
    return [];
  }
}

/**
 * Create a new media asset
 */
export async function createMediaAsset(fields: {
  employer_id: string;
  type: MediaAssetRecord["type"];
  file?: any[];
  alt_text?: string;
  file_size?: number;
  show_on_company_page?: boolean;
}): Promise<MediaAssetRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    employer: [fields.employer_id], // Linked record requires array
    type: fields.type,
    is_deleted: false,
    "created-at": new Date().toISOString(),
  };

  if (fields.file) airtableFields.file = fields.file;
  // Only send alt_text if it's a non-empty string
  if (fields.alt_text && typeof fields.alt_text === "string" && fields.alt_text.trim().length > 0) {
    airtableFields.alt_text = fields.alt_text.trim();
  }
  if (fields.file_size !== undefined) airtableFields.file_size = fields.file_size;
  if (fields.show_on_company_page !== undefined) airtableFields.show_on_company_page = fields.show_on_company_page;

  try {
    const record = await base(MEDIA_ASSETS_TABLE).create(airtableFields);

    const recordFields = record.fields;
    const employer_id = Array.isArray(recordFields.employer)
      ? recordFields.employer[0] || null
      : recordFields.employer || null;

    return mediaAssetRecordSchema.parse({
      id: record.id,
      employer_id,
      type: recordFields.type,
      file: recordFields.file || [],
      alt_text: recordFields.alt_text || "",
      file_size: recordFields.file_size || 0,
      show_on_company_page: recordFields.show_on_company_page || false,
      is_deleted: recordFields.is_deleted || false,
      "created-at": recordFields["created-at"] as string | undefined,
    });
  } catch (error: unknown) {
    console.error("Error creating media asset:", getErrorMessage(error));
    throw new Error(`Failed to create media asset: ${getErrorMessage(error)}`);
  }
}

/**
 * Update a media asset
 */
export async function updateMediaAsset(
  id: string,
  fields: Partial<Omit<MediaAssetRecord, "id" | "employer_id">>
): Promise<MediaAssetRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {};

  if (fields.type !== undefined) airtableFields.type = fields.type;
  if (fields.file !== undefined) airtableFields.file = fields.file;
  if (fields.alt_text !== undefined) airtableFields.alt_text = fields.alt_text;
  if (fields.file_size !== undefined) airtableFields.file_size = fields.file_size;
  if (fields.show_on_company_page !== undefined) airtableFields.show_on_company_page = fields.show_on_company_page;
  if (fields.is_deleted !== undefined) airtableFields.is_deleted = fields.is_deleted;

  const record = await base(MEDIA_ASSETS_TABLE).update(id, airtableFields);

  const recordFields = record.fields;
  const employer_id = Array.isArray(recordFields.employer)
    ? recordFields.employer[0] || null
    : recordFields.employer || null;

  return mediaAssetRecordSchema.parse({
    id: record.id,
    employer_id,
    type: recordFields.type,
    file: recordFields.file || [],
    alt_text: recordFields.alt_text || "",
    file_size: recordFields.file_size || 0,
    show_on_company_page: recordFields.show_on_company_page || false,
    is_deleted: recordFields.is_deleted || false,
    "created-at": recordFields["created-at"] as string | undefined,
  });
}

/**
 * Soft delete a media asset (sets is_deleted to true)
 */
export async function deleteMediaAsset(id: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  await updateMediaAsset(id, { is_deleted: true });
}

// ============================================
// FAQ FUNCTIONS
// ============================================

/**
 * Get all FAQ items for an employer
 * Returns FAQ items sorted by order field
 */
export async function getFAQByEmployerId(employerId: string): Promise<FAQRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const records = await base(FAQ_TABLE)
      .select({
        filterByFormula: `FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({employer}))`,
        sort: [{ field: "order", direction: "asc" }],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      
      // Extract linked record ID from array
      const employer_id = Array.isArray(fields.employer)
        ? fields.employer[0] || null
        : fields.employer || null;

      return faqRecordSchema.parse({
        id: record.id,
        employer_id,
        question: fields.question || "",
        answer: fields.answer || "",
        order: fields.order || 0,
        created_at: fields.created_at as string | undefined,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting FAQ by employer ID:", getErrorMessage(error));
    return [];
  }
}

/**
 * Create a new FAQ item
 */
export async function createFAQ(fields: {
  employer_id: string;
  question: string;
  answer: string;
  order?: number;
}): Promise<FAQRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    employer: [fields.employer_id], // Linked record requires array
    question: fields.question,
    answer: fields.answer,
    order: fields.order ?? 0,
    created_at: new Date().toISOString(),
  };

  try {
    const record = await base(FAQ_TABLE).create(airtableFields);

    const recordFields = record.fields;
    const employer_id = Array.isArray(recordFields.employer)
      ? recordFields.employer[0] || null
      : recordFields.employer || null;

    return faqRecordSchema.parse({
      id: record.id,
      employer_id,
      question: recordFields.question || "",
      answer: recordFields.answer || "",
      order: recordFields.order || 0,
      created_at: recordFields.created_at as string | undefined,
    });
  } catch (error: unknown) {
    console.error("Error creating FAQ:", getErrorMessage(error));
    throw new Error(`Failed to create FAQ: ${getErrorMessage(error)}`);
  }
}

/**
 * Update a FAQ item
 */
export async function updateFAQ(
  id: string,
  fields: Partial<Omit<FAQRecord, "id" | "employer_id">>
): Promise<FAQRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {};

  if (fields.question !== undefined) airtableFields.question = fields.question;
  if (fields.answer !== undefined) airtableFields.answer = fields.answer;
  if (fields.order !== undefined) airtableFields.order = fields.order;

  const record = await base(FAQ_TABLE).update(id, airtableFields);

  const recordFields = record.fields;
  const employer_id = Array.isArray(recordFields.employer)
    ? recordFields.employer[0] || null
    : recordFields.employer || null;

  return faqRecordSchema.parse({
    id: record.id,
    employer_id,
    question: recordFields.question || "",
    answer: recordFields.answer || "",
    order: recordFields.order || 0,
    created_at: recordFields.created_at as string | undefined,
  });
}

/**
 * Delete a FAQ item permanently
 */
export async function deleteFAQ(id: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(FAQ_TABLE).destroy(id);
  } catch (error: unknown) {
    console.error("Error deleting FAQ:", getErrorMessage(error));
    throw new Error(`Failed to delete FAQ: ${getErrorMessage(error)}`);
  }
}

// ============================================
// TEAM FUNCTIONS
// ============================================

/**
 * Get a user by their Airtable record ID
 */
export async function getUserById(id: string): Promise<UserRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const record = await base(USERS_TABLE).find(id);

    if (!record) return null;

    const fields = record.fields;
    const extracted = extractUserFields(fields as Record<string, unknown>);

    return userRecordSchema.parse({
      id: record.id,
      ...fields,
      ...extracted,
    });
  } catch (error: unknown) {
    console.error("Error getting user by ID:", getErrorMessage(error));
    return null;
  }
}

/**
 * Get all users (team members) for an employer
 * Returns both active users and pending invitations (status = "invited")
 */
export async function getUsersByEmployerId(employerId: string): Promise<UserRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const records = await base(USERS_TABLE)
      .select({
        filterByFormula: `FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({employer_id}))`,
        sort: [{ field: "created-at", direction: "desc" }],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      const extracted = extractUserFields(fields as Record<string, unknown>);

      return userRecordSchema.parse({
        id: record.id,
        ...fields,
        ...extracted,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting users by employer ID:", getErrorMessage(error));
    return [];
  }
}

/**
 * Get a user by their invitation token
 * Used to validate invitation links
 */
export async function getUserByInviteToken(token: string): Promise<UserRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const records = await base(USERS_TABLE)
      .select({
        filterByFormula: `{invite_token} = '${escapeAirtableString(token)}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (!records[0]) return null;

    const fields = records[0].fields;
    const extracted = extractUserFields(fields as Record<string, unknown>);

    return userRecordSchema.parse({
      id: records[0].id,
      ...fields,
      ...extracted,
    });
  } catch (error: unknown) {
    console.error("Error getting user by invite token:", getErrorMessage(error));
    return null;
  }
}

/**
 * Unlink a user from their employer (for team member removal)
 * Sets employer_id to null but keeps the user account
 */
export async function unlinkUserFromEmployer(userId: string): Promise<UserRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const record = await base(USERS_TABLE).update(userId, {
    employer_id: [],
    status: "deleted",
    "updated-at": new Date().toISOString(),
  });

  const fields = record.fields;
  const extracted = extractUserFields(fields as Record<string, unknown>);

  return userRecordSchema.parse({
    id: record.id,
    ...fields,
    ...extracted,
  });
}

// ============================================
// PRODUCTS FUNCTIONS
// ============================================

/**
 * Get active products by type
 * Returns products sorted by sort_order
 */
export async function getActiveProductsByType(
  type: ProductRecord["type"]
): Promise<ProductRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const records = await base(PRODUCTS_TABLE)
      .select({
        filterByFormula: `AND({type} = '${type}', {is_active} = TRUE())`,
        sort: [{ field: "sort_order", direction: "asc" }],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      
      // Extract linked record IDs from arrays
      const features = Array.isArray(fields.features) ? fields.features : [];
      const included_upsells = Array.isArray(fields.included_upsells) ? fields.included_upsells : [];
      const target_roles = Array.isArray(fields.target_roles) ? fields.target_roles : [];

      const availability = Array.isArray(fields.availability) ? fields.availability : [];

      return productRecordSchema.parse({
        id: record.id,
        slug: fields.id || undefined, // Custom "id" column from Airtable
        display_name: fields.display_name || "",
        description: fields.description || null,
        type: fields.type,
        credits: fields.credits || 0,
        base_price: fields.base_price || null,
        price: fields.price || 0,
        discount_percentage: fields.discount_percentage || null,
        is_active: fields.is_active || false,
        sort_order: fields.sort_order || 0,
        features,
        included_upsells,
        target_roles,
        availability,
        validity_months: fields.validity_months || null,
        credit_expiry_warning_days: fields.credit_expiry_warning_days || null,
        billing_cycle: fields.billing_cycle || null,
        repeat_mode: fields.repeat_mode || null,
        duration_days: fields.duration_days || null,
        max_value: fields.max_value || null,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting products by type:", getErrorMessage(error));
    return [];
  }
}

/**
 * Get active products by type with role filtering
 * Returns products visible to the specified role
 * - If target_roles is empty: product is visible to all roles
 * - If target_roles has values: product is only visible if the role is included
 */
export async function getActiveProductsByTypeAndRole(
  type: ProductRecord["type"],
  roleId: string
): Promise<ProductRecord[]> {
  const allProducts = await getActiveProductsByType(type);
  
  return allProducts.filter(product => {
    // Empty target_roles = visible for everyone
    if (!product.target_roles || product.target_roles.length === 0) return true;
    // Otherwise: check if the user's role is in target_roles
    return product.target_roles.includes(roleId);
  });
}

/**
 * Get a product by ID
 */
export async function getProductById(id: string): Promise<ProductRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const record = await base(PRODUCTS_TABLE).find(id);

    if (!record) return null;

    const fields = record.fields;
    const features = Array.isArray(fields.features) ? fields.features : [];
    const included_upsells = Array.isArray(fields.included_upsells) ? fields.included_upsells : [];
    const target_roles = Array.isArray(fields.target_roles) ? fields.target_roles : [];

    const availability = Array.isArray(fields.availability) ? fields.availability : [];

    return productRecordSchema.parse({
      id: record.id,
      slug: fields.id || undefined, // Custom "id" column from Airtable
      display_name: fields.display_name || "",
      description: fields.description || null,
      type: fields.type,
      credits: fields.credits || 0,
      base_price: fields.base_price || null,
      price: fields.price || 0,
      discount_percentage: fields.discount_percentage || null,
      is_active: fields.is_active || false,
      sort_order: fields.sort_order || 0,
      features,
      included_upsells,
      target_roles,
      availability,
      validity_months: fields.validity_months || null,
      credit_expiry_warning_days: fields.credit_expiry_warning_days || null,
      billing_cycle: fields.billing_cycle || null,
      repeat_mode: fields.repeat_mode || null,
      duration_days: fields.duration_days || null,
      max_value: fields.max_value || null,
    });
  } catch (error: unknown) {
    console.error("Error getting product by ID:", getErrorMessage(error));
    return null;
  }
}

// ============================================
// FEATURES FUNCTIONS
// ============================================

/**
 * Get features by their IDs
 * Returns features sorted by package_category then sort_order
 */
export async function getFeaturesByIds(ids: string[]): Promise<FeatureRecord[]> {
  if (!baseId || !apiKey || ids.length === 0) {
    return [];
  }

  try {
    // Build OR formula for multiple IDs
    const idFormulas = ids.map((id) => `RECORD_ID() = '${id}'`);
    const filterFormula = `AND(OR(${idFormulas.join(",")}), {is_active} = TRUE())`;

    const records = await base(FEATURES_TABLE)
      .select({
        filterByFormula: filterFormula,
        sort: [
          { field: "sort_order", direction: "asc" },
        ],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      const products = Array.isArray(fields.products) ? fields.products : [];

      return featureRecordSchema.parse({
        id: record.id,
        display_name: fields.display_name || "",
        is_active: fields.is_active ?? true,
        action_tags: fields.action_tags || null,
        sort_order: fields.sort_order || 0,
        products,
        package_category: fields.package_category || null,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting features by IDs:", getErrorMessage(error));
    return [];
  }
}

/**
 * Get all active features
 * Returns features sorted by package_category then sort_order
 */
export async function getAllActiveFeatures(): Promise<FeatureRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const records = await base(FEATURES_TABLE)
      .select({
        filterByFormula: `{is_active} = TRUE()`,
        sort: [
          { field: "sort_order", direction: "asc" },
        ],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      const products = Array.isArray(fields.products) ? fields.products : [];

      return featureRecordSchema.parse({
        id: record.id,
        display_name: fields.display_name || "",
        is_active: fields.is_active ?? true,
        action_tags: fields.action_tags || null,
        sort_order: fields.sort_order || 0,
        products,
        package_category: fields.package_category || null,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting all features:", getErrorMessage(error));
    return [];
  }
}

// ============================================
// WALLET UPDATE FUNCTIONS
// ============================================

/**
 * Update wallet balance after a credit purchase
 * Adds credits to balance and total_purchased
 */
export async function addCreditsToWallet(
  walletId: string,
  creditsAmount: number
): Promise<WalletRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  // First get current wallet to calculate new balance
  const currentWallet = await base(WALLETS_TABLE).find(walletId);
  if (!currentWallet) {
    throw new Error("Wallet not found");
  }

  const currentBalance = (currentWallet.fields.balance as number) || 0;
  const currentTotalPurchased = (currentWallet.fields.total_purchased as number) || 0;

  const record = await base(WALLETS_TABLE).update(walletId, {
    balance: currentBalance + creditsAmount,
    total_purchased: currentTotalPurchased + creditsAmount,
    "last-updated": new Date().toISOString(),
  });

  const fields = record.fields;
  const owner_employer = Array.isArray(fields.owner_employer)
    ? fields.owner_employer[0] || null
    : fields.owner_employer || null;
  const owner_user = Array.isArray(fields.owner_user)
    ? fields.owner_user[0] || null
    : fields.owner_user || null;

  return walletRecordSchema.parse({
    id: record.id,
    ...fields,
    owner_employer,
    owner_user,
  });
}

// ============================================
// TRANSACTION CREATE FUNCTION
// ============================================

/**
 * Create a new transaction for credit purchase
 * Includes expiration date calculation based on product's validity_months
 */
export async function createPurchaseTransaction(fields: {
  employer_id?: string | null; // Optional for intermediary purchases
  wallet_id: string;
  user_id: string;
  product_id: string;
  credits_amount: number;
  money_amount: number;
  context: TransactionRecord["context"];
  invoice_details_snapshot: string; // JSON string
  validity_months?: number | null; // Months until credits expire (from product)
}): Promise<TransactionRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  // Calculate expiration date based on months
  const createdAt = new Date();
  const monthsToExpire = fields.validity_months ?? 12; // Default to 1 year (12 months)
  const expiresAt = new Date(createdAt);
  expiresAt.setMonth(expiresAt.getMonth() + monthsToExpire);

  const airtableFields: Record<string, any> = {
    ...(fields.employer_id && { employer: [fields.employer_id] }), // Only add employer if present
    wallet: [fields.wallet_id], // Linked record requires array
    user: [fields.user_id], // Linked record to Users - requires array
    product_id: [fields.product_id], // Linked record to Products - requires array
    type: "purchase",
    status: "open",
    total_credits: fields.credits_amount, // Use total_credits field (credits_amount doesn't exist in Airtable)
    total_cost: fields.money_amount, // Use total_cost field (money_amount doesn't exist in Airtable)
    context: fields.context,
    invoice_details_snapshot: fields.invoice_details_snapshot,
    reference_type: "order",
    "created-at": createdAt.toISOString(),
    // Credit expiration fields
    expires_at: expiresAt.toISOString(),
    remaining_credits: fields.credits_amount, // Start with full amount
  };

  try {
    const record = await base(TRANSACTIONS_TABLE).create(airtableFields);
    
    // Update the record to set the id field with the record ID
    await base(TRANSACTIONS_TABLE).update(record.id, { id: record.id });

    const recordFields = record.fields;
    const employer_id = Array.isArray(recordFields.employer)
      ? recordFields.employer[0] || null
      : recordFields.employer || null;
    const wallet_id = Array.isArray(recordFields.wallet)
      ? recordFields.wallet[0] || null
      : recordFields.wallet || null;
    const user_id = Array.isArray(recordFields.user)
      ? recordFields.user[0] || null
      : recordFields.user || null;
    const product_ids = Array.isArray(recordFields.product_id)
      ? recordFields.product_id
      : [];

    return transactionRecordSchema.parse({
      id: record.id,
      employer_id,
      wallet_id,
      user_id,
      product_ids,
      vacancy_id: null,
      type: recordFields.type,
      reference_type: recordFields.reference_type || null,
      context: (recordFields.context as string) || null,
      status: recordFields.status,
      money_amount: recordFields.total_cost || null, // Read from total_cost field
      total_cost: recordFields.total_cost || null,
      total_credits: recordFields.total_credits || null,
      credits_shortage: null,
      credits_invoiced: null,
      credits_amount: recordFields.total_credits || 0, // Read from total_credits field
      vacancy_name: null,
      invoice: recordFields.invoice || null,
      invoice_details_snapshot: (recordFields.invoice_details_snapshot as string) || null,
      invoice_trigger: null, // Purchase transactions don't need invoice trigger
      expires_at: (recordFields.expires_at as string) || null,
      remaining_credits: (recordFields.remaining_credits as number) || null,
      "created-at": recordFields["created-at"] as string | undefined,
    });
  } catch (error: unknown) {
    console.error("Error creating purchase transaction:", getErrorMessage(error));
    throw new Error(`Failed to create transaction: ${getErrorMessage(error)}`);
  }
}

// ============================================
// VACANCY FUNCTIONS
// ============================================

/**
 * Helper to extract linked record fields from Airtable vacancy record
 */
function parseVacancyFields(record: any): VacancyRecord {
  const fields = record.fields;
  
  // Extract linked record IDs (Airtable returns arrays)
  const employer_id = Array.isArray(fields.employer)
    ? fields.employer[0] || null
    : fields.employer || null;
  const education_level_id = Array.isArray(fields.education_level)
    ? fields.education_level[0] || null
    : fields.education_level || null;
  const field_id = Array.isArray(fields.field)
    ? fields.field[0] || null
    : fields.field || null;
  const function_type_id = Array.isArray(fields.function_type)
    ? fields.function_type[0] || null
    : fields.function_type || null;
  const region_id = Array.isArray(fields.region)
    ? fields.region[0] || null
    : fields.region || null;
  const sector_id = Array.isArray(fields.sector)
    ? fields.sector[0] || null
    : fields.sector || null;
  const package_id = Array.isArray(fields.package)
    ? fields.package[0] || null
    : fields.package || null;
  const contact_photo_id = Array.isArray(fields.contact_photo)
    ? fields.contact_photo[0] || null
    : fields.contact_photo || null;
  const selected_upsells = Array.isArray(fields.selected_upsells) 
    ? fields.selected_upsells 
    : [];
  const header_image = Array.isArray(fields.header_image) 
    ? fields.header_image[0] || null 
    : null;
  const gallery = Array.isArray(fields.gallery) 
    ? fields.gallery 
    : [];
  const credit_transactions = Array.isArray(fields.credit_transactions) 
    ? fields.credit_transactions 
    : [];
  const users = Array.isArray(fields.users) 
    ? fields.users 
    : [];
  const events = Array.isArray(fields.events) 
    ? fields.events 
    : [];
  // credits_spent is a Rollup field - actual credits deducted from wallet
  // With the new single-transaction model, this should be a single value
  // But we still handle array/string formats for backwards compatibility
  let credits_spent: number = 0;
  if (Array.isArray(fields.credits_spent)) {
    credits_spent = Number(fields.credits_spent[0]) || 0;
  } else if (typeof fields.credits_spent === 'string' && fields.credits_spent.includes(',')) {
    const firstValue = fields.credits_spent.split(',')[0];
    credits_spent = Number(firstValue.trim()) || 0;
  } else if (typeof fields.credits_spent === 'string') {
    credits_spent = Number(fields.credits_spent) || 0;
  } else if (typeof fields.credits_spent === 'number') {
    credits_spent = fields.credits_spent;
  }

  // money_invoiced is a Rollup field - euro amount to be invoiced
  // Can come as number, string with euro symbol "€425,00", or array
  let money_invoiced: number = 0;
  if (Array.isArray(fields.money_invoiced)) {
    money_invoiced = Number(fields.money_invoiced[0]) || 0;
  } else if (typeof fields.money_invoiced === 'string') {
    // Remove euro symbol, spaces, and convert comma to dot for parsing
    const cleanedValue = fields.money_invoiced
      .replace(/[€\s]/g, '')
      .replace(',', '.');
    money_invoiced = Number(cleanedValue) || 0;
  } else if (typeof fields.money_invoiced === 'number') {
    money_invoiced = fields.money_invoiced;
  }

  return vacancyRecordSchema.parse({
    id: record.id,
    employer_id,
    title: fields.title || "",
    status: mapVacancyStatusFromAirtable(fields.status as string),
    input_type: fields.input_type || "self_service",
    intro_txt: fields.intro_txt || "",
    description: fields.description || "",
    location: fields.location || "",
    employment_type: fields.employment_type || undefined,
    hrs_per_week: fields.hrs_per_week || undefined,
    salary: fields.salary || "",
    education_level_id,
    field_id,
    function_type_id,
    region_id,
    sector_id,
    package_id,
    selected_upsells,
    apply_url: fields.apply_url || "",
    application_email: fields.application_email || "",
    show_apply_form: fields.show_apply_form || false,
    contact_name: fields.contact_name || "",
    contact_role: fields.contact_role || "",
    contact_company: fields.contact_company || "",
    contact_email: fields.contact_email || "",
    contact_phone: fields.contact_phone || "",
    contact_photo_id,
    recommendations: fields.recommendations || "",
    note: fields.note as string | undefined,
    header_image,
    gallery,
    credits_spent,
    money_invoiced,
    credit_transactions,
    users,
    events,
    public_url: fields.public_url as string | undefined,
    needs_webflow_sync: fields.needs_webflow_sync as boolean | undefined,
    high_priority: fields.high_priority as boolean | undefined,
    "created-at": fields["created-at"] as string | undefined,
    "updated-at": fields["updated-at"] as string | undefined,
    "submitted-at": fields["submitted-at"] as string | undefined,
    "first-published-at": fields["first-published-at"] as string | undefined,
    "last-published-at": fields["last-published-at"] as string | undefined,
    "depublished-at": fields["depublished-at"] as string | undefined,
    "last-status_changed-at": fields["last-status_changed-at"] as string | undefined,
    closing_date: fields.closing_date as string | undefined,
  });
}

/**
 * Get a vacancy by ID
 */
export async function getVacancyById(id: string): Promise<VacancyRecord | null> {
  if (!baseId || !apiKey) {
    return null;
  }

  try {
    const record = await base(VACANCIES_TABLE).find(id);
    if (!record) return null;
    return parseVacancyFields(record);
  } catch (error: unknown) {
    console.error("Error getting vacancy by ID:", getErrorMessage(error));
    return null;
  }
}

/**
 * Get all vacancies for an employer
 * Returns vacancies sorted by created-at (newest first)
 */
export async function getVacanciesByEmployerId(
  employerId: string,
  options?: { status?: VacancyStatus | VacancyStatus[] }
): Promise<VacancyRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    let filterFormula = `FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({employer}))`;
    
    // Add status filter if specified
    if (options?.status) {
      if (Array.isArray(options.status)) {
        const statusFilters = options.status.map(s => `{status} = '${s}'`).join(", ");
        filterFormula = `AND(${filterFormula}, OR(${statusFilters}))`;
      } else {
        filterFormula = `AND(${filterFormula}, {status} = '${options.status}')`;
      }
    }

    const records = await base(VACANCIES_TABLE)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: "created-at", direction: "desc" }],
      })
      .all();

    return records.map(parseVacancyFields);
  } catch (error: unknown) {
    console.error("Error getting vacancies by employer ID:", getErrorMessage(error));
    return [];
  }
}

/**
 * Create a new vacancy (as concept)
 */
export async function createVacancy(fields: {
  employer_id: string;
  user_id: string;
  title?: string;
  input_type?: VacancyInputType;
  package_id?: string;
}): Promise<VacancyRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    employer: [fields.employer_id], // Linked record requires array
    users: [fields.user_id], // Linked record requires array
    status: mapVacancyStatusToAirtable("concept"),
    input_type: fields.input_type || "self_service",
    "created-at": new Date().toISOString(),
    "updated-at": new Date().toISOString(),
  };

  if (fields.title) airtableFields.title = fields.title;
  if (fields.package_id) airtableFields.package = [fields.package_id];

  try {
    const record = await base(VACANCIES_TABLE).create(airtableFields);
    
    // Update the record to set the id field to the Record ID
    const updatedRecord = await base(VACANCIES_TABLE).update(record.id, {
      id: record.id,
    });
    
    return parseVacancyFields(updatedRecord);
  } catch (error: unknown) {
    console.error("Error creating vacancy:", getErrorMessage(error));
    throw new Error(`Failed to create vacancy: ${getErrorMessage(error)}`);
  }
}

/**
 * Update a vacancy
 */
export async function updateVacancy(
  id: string,
  fields: Partial<Omit<VacancyRecord, "id" | "employer_id" | "credits_spent" | "credit_transactions" | "events">>
): Promise<VacancyRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    "updated-at": new Date().toISOString(),
  };

  // Map fields to Airtable field names
  if (fields.title !== undefined) airtableFields.title = fields.title;
  if (fields.status !== undefined) {
    airtableFields.status = mapVacancyStatusToAirtable(fields.status);
    airtableFields["last-status_changed-at"] = new Date().toISOString();
  }
  if (fields.input_type !== undefined) airtableFields.input_type = fields.input_type;
  if (fields.intro_txt !== undefined) airtableFields.intro_txt = fields.intro_txt;
  if (fields.description !== undefined) airtableFields.description = fields.description;
  if (fields.location !== undefined) airtableFields.location = fields.location;
  if (fields.employment_type !== undefined) airtableFields.employment_type = fields.employment_type;
  if (fields.hrs_per_week !== undefined) airtableFields.hrs_per_week = fields.hrs_per_week;
  if (fields.salary !== undefined) airtableFields.salary = fields.salary;
  if (fields.closing_date !== undefined) airtableFields.closing_date = fields.closing_date;
  
  // Linked lookup fields
  if (fields.education_level_id !== undefined) {
    airtableFields.education_level = fields.education_level_id ? [fields.education_level_id] : [];
  }
  if (fields.field_id !== undefined) {
    airtableFields.field = fields.field_id ? [fields.field_id] : [];
  }
  if (fields.function_type_id !== undefined) {
    airtableFields.function_type = fields.function_type_id ? [fields.function_type_id] : [];
  }
  if (fields.region_id !== undefined) {
    airtableFields.region = fields.region_id ? [fields.region_id] : [];
  }
  if (fields.sector_id !== undefined) {
    airtableFields.sector = fields.sector_id ? [fields.sector_id] : [];
  }
  
  // Package & upsells
  if (fields.package_id !== undefined) {
    airtableFields.package = fields.package_id ? [fields.package_id] : [];
  }
  if (fields.selected_upsells !== undefined) {
    airtableFields.selected_upsells = fields.selected_upsells || [];
  }
  
  // Application
  if (fields.apply_url !== undefined) airtableFields.apply_url = fields.apply_url;
  if (fields.application_email !== undefined) airtableFields.application_email = fields.application_email;
  if (fields.show_apply_form !== undefined) airtableFields.show_apply_form = fields.show_apply_form;
  
  // Contact
  if (fields.contact_name !== undefined) airtableFields.contact_name = fields.contact_name;
  if (fields.contact_role !== undefined) airtableFields.contact_role = fields.contact_role;
  if (fields.contact_company !== undefined) airtableFields.contact_company = fields.contact_company;
  if (fields.contact_email !== undefined) airtableFields.contact_email = fields.contact_email;
  if (fields.contact_phone !== undefined) airtableFields.contact_phone = fields.contact_phone;
  if (fields.contact_photo_id !== undefined) {
    airtableFields.contact_photo = fields.contact_photo_id ? [fields.contact_photo_id] : [];
  }
  
  // Social proof
  if (fields.recommendations !== undefined) airtableFields.recommendations = fields.recommendations;
  
  // Notes
  if (fields.note !== undefined) airtableFields.note = fields.note;
  
  // Media
  if (fields.header_image !== undefined) {
    airtableFields.header_image = fields.header_image ? [fields.header_image] : [];
  }
  if (fields.gallery !== undefined) airtableFields.gallery = fields.gallery;
  
  // Users
  if (fields.users !== undefined) airtableFields.users = fields.users;
  
  // Priority
  if (fields.high_priority !== undefined) airtableFields.high_priority = fields.high_priority;

  // Webflow sync
  if (fields.needs_webflow_sync !== undefined) airtableFields.needs_webflow_sync = fields.needs_webflow_sync;

  // Special timestamps
  if (fields["submitted-at"] !== undefined) airtableFields["submitted-at"] = fields["submitted-at"];
  if (fields["first-published-at"] !== undefined) airtableFields["first-published-at"] = fields["first-published-at"];
  if (fields["last-published-at"] !== undefined) airtableFields["last-published-at"] = fields["last-published-at"];
  if (fields["depublished-at"] !== undefined) airtableFields["depublished-at"] = fields["depublished-at"];

  try {
    const record = await base(VACANCIES_TABLE).update(id, airtableFields);
    return parseVacancyFields(record);
  } catch (error: unknown) {
    console.error("Error updating vacancy:", getErrorMessage(error));
    throw new Error(`Failed to update vacancy: ${getErrorMessage(error)}`);
  }
}

/**
 * Delete a vacancy permanently
 */
export async function deleteVacancy(id: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(VACANCIES_TABLE).destroy(id);
  } catch (error: unknown) {
    console.error("Error deleting vacancy:", getErrorMessage(error));
    throw new Error(`Failed to delete vacancy: ${getErrorMessage(error)}`);
  }
}

// ============================================
// LOOKUP TABLE FUNCTIONS
// ============================================

/**
 * Generic function to get all records from a lookup table
 * Returns records sorted alphabetically by name
 */
async function getLookupRecords(tableName: string): Promise<LookupRecord[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const records = await base(tableName)
      .select({
        sort: [{ field: "name", direction: "asc" }],
      })
      .all();

    return records.map((record) => 
      lookupRecordSchema.parse({
        id: record.id,
        name: record.fields.name || "",
      })
    );
  } catch (error: unknown) {
    console.error(`Error getting records from ${tableName}:`, getErrorMessage(error));
    return [];
  }
}

/**
 * Get all education levels (sorted alphabetically)
 */
export async function getEducationLevels(): Promise<LookupRecord[]> {
  return getLookupRecords(EDUCATION_LEVELS_TABLE);
}

/**
 * Get all fields/vakgebieden (sorted alphabetically)
 */
export async function getFields(): Promise<LookupRecord[]> {
  return getLookupRecords(FIELDS_TABLE);
}

/**
 * Get all function types (sorted alphabetically)
 */
export async function getFunctionTypes(): Promise<LookupRecord[]> {
  return getLookupRecords(FUNCTION_TYPES_TABLE);
}

/**
 * Get all regions (sorted alphabetically)
 */
export async function getRegions(): Promise<LookupRecord[]> {
  return getLookupRecords(REGIONS_TABLE);
}

/**
 * Get all sectors (sorted alphabetically)
 */
export async function getSectors(): Promise<LookupRecord[]> {
  return getLookupRecords(SECTORS_TABLE);
}

/**
 * Get a sector by its record ID
 */
export async function getSectorById(id: string): Promise<LookupRecord | null> {
  if (!baseId || !apiKey || !id) {
    return null;
  }

  try {
    const record = await base(SECTORS_TABLE).find(id);
    if (!record) return null;

    return lookupRecordSchema.parse({
      id: record.id,
      name: record.fields.name || "",
    });
  } catch (error: unknown) {
    console.error("Error getting sector by ID:", getErrorMessage(error));
    return null;
  }
}

/**
 * Get all lookup values at once
 * Useful for forms that need all dropdowns
 */
export async function getAllLookups(): Promise<{
  educationLevels: LookupRecord[];
  fields: LookupRecord[];
  functionTypes: LookupRecord[];
  regions: LookupRecord[];
  sectors: LookupRecord[];
}> {
  const [educationLevels, fields, functionTypes, regions, sectors] = await Promise.all([
    getEducationLevels(),
    getFields(),
    getFunctionTypes(),
    getRegions(),
    getSectors(),
  ]);

  return {
    educationLevels,
    fields,
    functionTypes,
    regions,
    sectors,
  };
}

// ============================================
// WALLET SPEND FUNCTION (for vacancy submission)
// ============================================

/**
 * Deduct credits from wallet balance
 * Used when submitting a vacancy
 */
export async function deductCreditsFromWallet(
  walletId: string,
  creditsAmount: number
): Promise<WalletRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  // First get current wallet to calculate new balance
  const currentWallet = await base(WALLETS_TABLE).find(walletId);
  if (!currentWallet) {
    throw new Error("Wallet not found");
  }

  const currentBalance = (currentWallet.fields.balance as number) || 0;
  const currentTotalSpent = (currentWallet.fields.total_spent as number) || 0;

  if (currentBalance < creditsAmount) {
    throw new Error("Insufficient credits");
  }

  const record = await base(WALLETS_TABLE).update(walletId, {
    balance: currentBalance - creditsAmount,
    total_spent: currentTotalSpent + creditsAmount,
    "last-updated": new Date().toISOString(),
  });

  const fields = record.fields;
  const owner_employer = Array.isArray(fields.owner_employer)
    ? fields.owner_employer[0] || null
    : fields.owner_employer || null;
  const owner_user = Array.isArray(fields.owner_user)
    ? fields.owner_user[0] || null
    : fields.owner_user || null;

  return walletRecordSchema.parse({
    id: record.id,
    ...fields,
    owner_employer,
    owner_user,
  });
}

/**
 * Create a spend transaction for vacancy submission
 * Can include invoice details for partial payment (credits + invoice)
 */
export async function createSpendTransaction(fields: {
  employer_id: string;
  wallet_id: string;
  user_id: string; // User who initiated the transaction
  vacancy_id: string;
  total_credits: number; // Total credits the vacancy costs
  total_cost: number; // Total price in euros
  credits_shortage: number; // Credits short (0 if enough)
  invoice_amount: number; // Euro amount to be invoiced (0 if enough credits)
  product_ids: string[]; // Package ID + upsell IDs
  context?: TransactionRecord["context"];
  // Optional invoice fields for partial payment (when credits are insufficient)
  invoice_details_snapshot?: string;
  invoice_trigger?: "on_vacancy_publish";
}): Promise<TransactionRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  // Determine status: "paid" if fully paid with credits, "open" if invoice needed
  const hasInvoice = fields.credits_shortage > 0;
  const status = hasInvoice ? "open" : "paid";

  const airtableFields: Record<string, any> = {
    employer: [fields.employer_id],
    wallet: [fields.wallet_id],
    user: [fields.user_id], // Linked record to Users
    vacancy: [fields.vacancy_id],
    product_id: fields.product_ids, // Linked record to Products
    type: "spend",
    status,
    total_credits: fields.total_credits,
    total_cost: fields.total_cost,
    credits_shortage: fields.credits_shortage,
    credits_invoiced: hasInvoice ? fields.invoice_amount : null, // Euro amount being invoiced
    reference_type: "vacancy",
    context: fields.context || "vacancy",
    "created-at": new Date().toISOString(),
  };

  // Add invoice fields if partial payment (credits insufficient)
  if (hasInvoice) {
    airtableFields.invoice_details_snapshot = fields.invoice_details_snapshot;
    airtableFields.invoice_trigger = fields.invoice_trigger || "on_vacancy_publish";
  }

  try {
    const record = await base(TRANSACTIONS_TABLE).create(airtableFields);
    
    // Update the record to set the id field with the record ID
    await base(TRANSACTIONS_TABLE).update(record.id, { id: record.id });

    const recordFields = record.fields;
    const employer_id = Array.isArray(recordFields.employer)
      ? recordFields.employer[0] || null
      : recordFields.employer || null;
    const wallet_id = Array.isArray(recordFields.wallet)
      ? recordFields.wallet[0] || null
      : recordFields.wallet || null;
    const user_id = Array.isArray(recordFields.user)
      ? recordFields.user[0] || null
      : recordFields.user || null;
    const vacancy_id = Array.isArray(recordFields.vacancy)
      ? recordFields.vacancy[0] || null
      : recordFields.vacancy || null;
    // vacancy_name is a lookup field, so it comes back as an array
    const vacancy_name = Array.isArray(recordFields.vacancy_name)
      ? recordFields.vacancy_name[0] || null
      : recordFields.vacancy_name || null;

    return transactionRecordSchema.parse({
      id: record.id,
      employer_id,
      wallet_id,
      vacancy_id,
      user_id,
      product_ids: fields.product_ids,
      type: recordFields.type,
      reference_type: recordFields.reference_type || null,
      context: (recordFields.context as string) || null,
      status: recordFields.status,
      money_amount: null,
      total_cost: recordFields.total_cost || null,
      total_credits: recordFields.total_credits || null,
      credits_shortage: recordFields.credits_shortage || null,
      credits_invoiced: recordFields.credits_invoiced || null,
      credits_amount: recordFields.total_credits || 0, // Use total_credits as credits_amount for schema compatibility
      vacancy_name,
      invoice: null,
      invoice_details_snapshot: (recordFields.invoice_details_snapshot as string) || null,
      invoice_trigger: (recordFields.invoice_trigger as "on_vacancy_publish") || null,
      "created-at": recordFields["created-at"] as string | undefined,
    });
  } catch (error: unknown) {
    console.error("Error creating spend transaction:", getErrorMessage(error));
    throw new Error(`Failed to create spend transaction: ${getErrorMessage(error)}`);
  }
}

/**
 * @deprecated Use createSpendTransaction with money_amount and invoice_details_snapshot instead.
 * This function creates a separate invoice transaction, but the new approach combines
 * spend and invoice into a single transaction for cleaner data.
 * 
 * Create an invoice transaction for vacancy submission when credits are insufficient
 * This transaction will trigger an invoice to be sent when the vacancy is published
 */
export async function createInvoiceTransaction(fields: {
  employer_id: string;
  wallet_id: string;
  vacancy_id: string;
  credits_amount: number;
  money_amount: number;
  product_ids: string[]; // Package ID + upsell IDs
  invoice_details_snapshot: string;
  context?: TransactionRecord["context"];
}): Promise<TransactionRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    employer: [fields.employer_id],
    wallet: [fields.wallet_id],
    vacancy: [fields.vacancy_id],
    product_id: fields.product_ids, // Linked record to Products
    type: "spend",
    status: "open", // Open = not yet paid, invoice needs to be sent
    credits_amount: fields.credits_amount,
    money_amount: fields.money_amount,
    reference_type: "vacancy",
    context: fields.context || "vacancy",
    invoice_details_snapshot: fields.invoice_details_snapshot,
    invoice_trigger: "on_vacancy_publish",
    "created-at": new Date().toISOString(),
  };

  try {
    const record = await base(TRANSACTIONS_TABLE).create(airtableFields);
    
    // Update the record to set the id field with the record ID
    await base(TRANSACTIONS_TABLE).update(record.id, { id: record.id });

    const recordFields = record.fields;
    const employer_id = Array.isArray(recordFields.employer)
      ? recordFields.employer[0] || null
      : recordFields.employer || null;
    const wallet_id = Array.isArray(recordFields.wallet)
      ? recordFields.wallet[0] || null
      : recordFields.wallet || null;
    const vacancy_id = Array.isArray(recordFields.vacancy)
      ? recordFields.vacancy[0] || null
      : recordFields.vacancy || null;
    // vacancy_name is a lookup field, so it comes back as an array
    const vacancy_name = Array.isArray(recordFields.vacancy_name)
      ? recordFields.vacancy_name[0] || null
      : recordFields.vacancy_name || null;

    return transactionRecordSchema.parse({
      id: record.id,
      employer_id,
      wallet_id,
      vacancy_id,
      user_id: null,
      product_ids: fields.product_ids,
      type: recordFields.type,
      reference_type: recordFields.reference_type || null,
      context: (recordFields.context as string) || null,
      status: recordFields.status,
      money_amount: recordFields.money_amount || null,
      total_cost: null,
      total_credits: recordFields.credits_amount || null,
      credits_shortage: recordFields.credits_amount || null,
      credits_invoiced: recordFields.credits_amount || null,
      credits_amount: recordFields.credits_amount || 0,
      vacancy_name,
      invoice: null,
      invoice_details_snapshot: (recordFields.invoice_details_snapshot as string) || null,
      invoice_trigger: (recordFields.invoice_trigger as "on_vacancy_publish") || null,
      "created-at": recordFields["created-at"] as string | undefined,
    });
  } catch (error: unknown) {
    console.error("Error creating invoice transaction:", getErrorMessage(error));
    throw new Error(`Failed to create invoice transaction: ${getErrorMessage(error)}`);
  }
}

// ============================================
// Sessions
// ============================================

const SESSIONS_TABLE = "Sessions";

export interface SessionRecord {
  sessionToken: string;
  userId: string;
  expires: Date;
}

/**
 * Create a new session for a user
 * Used for direct login after invitation acceptance
 */
export async function createSession(
  userId: string,
  sessionToken: string,
  expires: Date
): Promise<SessionRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    const record = await base(SESSIONS_TABLE).create({
      sessionToken,
      userId: [userId], // Link to Users requires array
      expires: expires.toISOString(),
      "created-at": new Date().toISOString(),
    });

    // Extract userId from linked record array
    const userIdValue = Array.isArray(record.fields.userId)
      ? record.fields.userId[0]
      : record.fields.userId;

    return {
      sessionToken: record.fields.sessionToken as string,
      userId: userIdValue as string,
      expires: new Date(record.fields.expires as string),
    };
  } catch (error: unknown) {
    console.error("Error creating session:", getErrorMessage(error));
    throw new Error(`Failed to create session: ${getErrorMessage(error)}`);
  }
}

// ============================================
// CREDIT EXPIRATION & FIFO FUNCTIONS
// ============================================

/**
 * Credit batch type for FIFO operations
 */
export interface CreditBatch {
  id: string;
  employer_id: string | null;
  wallet_id: string | null;
  remaining_credits: number;
  expires_at: string;
  "created-at"?: string;
}

/**
 * Get all active (non-expired) credit batches for an employer
 * Returns purchase transactions sorted by expires_at ASC (FIFO - oldest first)
 * Only returns batches with remaining_credits > 0 and expires_at > now
 */
export async function getActiveCreditBatches(employerId: string): Promise<CreditBatch[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const now = new Date().toISOString();
    
    // Find purchase transactions with remaining credits that haven't expired
    const records = await base(TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `AND(
          FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({employer})),
          {type} = 'purchase',
          {remaining_credits} > 0,
          IS_AFTER({expires_at}, '${now}')
        )`,
        sort: [{ field: "expires_at", direction: "asc" }], // FIFO: oldest expires first
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      const employer_id = Array.isArray(fields.employer)
        ? fields.employer[0] || null
        : fields.employer || null;
      const wallet_id = Array.isArray(fields.wallet)
        ? fields.wallet[0] || null
        : fields.wallet || null;

      return {
        id: record.id,
        employer_id: employer_id as string | null,
        wallet_id: wallet_id as string | null,
        remaining_credits: (fields.remaining_credits as number) || 0,
        expires_at: fields.expires_at as string,
        "created-at": fields["created-at"] as string | undefined,
      };
    });
  } catch (error: unknown) {
    console.error("Error getting active credit batches:", getErrorMessage(error));
    return [];
  }
}

/**
 * Get credits that are expiring soon for an employer
 * Returns the total credits expiring and the earliest expiration date
 * 
 * @param employerId - The employer's ID
 * @param withinDays - Number of days to look ahead (default 30)
 * @returns Object with total expiring credits, days until earliest expiry, and earliest date
 */
export async function getExpiringCredits(
  employerId: string,
  withinDays: number = 30
): Promise<{
  total: number;
  days_until: number | null;
  earliest_date: string | null;
}> {
  if (!baseId || !apiKey) {
    return { total: 0, days_until: null, earliest_date: null };
  }

  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);
    
    const nowISO = now.toISOString();
    const futureDateISO = futureDate.toISOString();
    
    // Find purchase transactions that:
    // - Belong to this employer
    // - Are purchase type
    // - Have remaining credits > 0
    // - Expire after now but before the future date (within X days)
    const records = await base(TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `AND(
          FIND('${escapeAirtableString(employerId)}', ARRAYJOIN({employer})),
          {type} = 'purchase',
          {remaining_credits} > 0,
          IS_AFTER({expires_at}, '${nowISO}'),
          IS_BEFORE({expires_at}, '${futureDateISO}')
        )`,
        sort: [{ field: "expires_at", direction: "asc" }],
      })
      .all();

    if (records.length === 0) {
      return { total: 0, days_until: null, earliest_date: null };
    }

    // Calculate total expiring credits
    let total = 0;
    for (const record of records) {
      total += (record.fields.remaining_credits as number) || 0;
    }

    // Get earliest expiration date
    const earliestExpiresAt = records[0].fields.expires_at as string;
    const earliestDate = new Date(earliestExpiresAt);
    const daysUntil = Math.ceil((earliestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      total,
      days_until: daysUntil,
      earliest_date: earliestExpiresAt,
    };
  } catch (error: unknown) {
    console.error("Error getting expiring credits:", getErrorMessage(error));
    return { total: 0, days_until: null, earliest_date: null };
  }
}

/**
 * Get the credit expiry warning days setting
 * Returns the first credit_expiry_warning_days found from active credit bundles
 * Falls back to 30 days if not configured
 */
export async function getCreditExpiryWarningDays(): Promise<number> {
  if (!baseId || !apiKey) {
    return 30; // Default fallback
  }

  try {
    const products = await getActiveProductsByType("credit_bundle");
    
    // Find the first product with credit_expiry_warning_days set
    for (const product of products) {
      if (product.credit_expiry_warning_days && product.credit_expiry_warning_days > 0) {
        return product.credit_expiry_warning_days;
      }
    }
    
    return 30; // Default fallback
  } catch (error: unknown) {
    console.error("Error getting credit expiry warning days:", getErrorMessage(error));
    return 30;
  }
}

/**
 * Update remaining_credits on a transaction
 * Used when spending credits from a batch
 */
export async function updateTransactionRemainingCredits(
  transactionId: string,
  newRemainingCredits: number
): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(TRANSACTIONS_TABLE).update(transactionId, {
      remaining_credits: newRemainingCredits,
    });
  } catch (error: unknown) {
    console.error("Error updating transaction remaining credits:", getErrorMessage(error));
    throw new Error(`Failed to update remaining credits: ${getErrorMessage(error)}`);
  }
}

/**
 * Spend credits using FIFO (First In, First Out)
 * Deducts credits from the oldest non-expired batches first
 * Also updates the wallet balance
 * 
 * @param employerId - The employer's ID
 * @param walletId - The wallet's ID
 * @param amount - Number of credits to spend
 * @returns Object with details about which batches were used
 */
export async function spendCreditsWithFIFO(
  employerId: string,
  walletId: string,
  amount: number
): Promise<{
  totalSpent: number;
  batchesUsed: { id: string; creditsUsed: number }[];
}> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  // Get active credit batches sorted by expiration (FIFO)
  const batches = await getActiveCreditBatches(employerId);
  
  // Calculate total available from FIFO batches
  const totalAvailableFromBatches = batches.reduce((sum, batch) => sum + batch.remaining_credits, 0);
  
  // Fallback: if no FIFO batches exist (e.g. credits purchased before FIFO was implemented),
  // deduct directly from wallet balance instead
  if (totalAvailableFromBatches === 0) {
    console.log(`[FIFO] No active credit batches found for employer ${employerId}. Falling back to wallet-only deduction.`);
    await deductCreditsFromWallet(walletId, amount);
    return {
      totalSpent: amount,
      batchesUsed: [],
    };
  }

  // If some batches exist but not enough, deduct what we can from batches
  // and the rest directly from wallet (handles partial FIFO coverage)
  if (totalAvailableFromBatches < amount) {
    console.log(`[FIFO] Partial batch coverage: ${totalAvailableFromBatches} from batches, ${amount - totalAvailableFromBatches} from wallet balance directly.`);
  }

  let remaining = Math.min(amount, totalAvailableFromBatches);
  const batchesUsed: { id: string; creditsUsed: number }[] = [];

  // Deduct from batches in FIFO order
  for (const batch of batches) {
    if (remaining <= 0) break;

    const creditsToDeduct = Math.min(remaining, batch.remaining_credits);
    const newRemaining = batch.remaining_credits - creditsToDeduct;

    // Update the batch
    await updateTransactionRemainingCredits(batch.id, newRemaining);

    batchesUsed.push({
      id: batch.id,
      creditsUsed: creditsToDeduct,
    });

    remaining -= creditsToDeduct;
  }

  // Update wallet balance (deducts the full amount, which is the source of truth)
  await deductCreditsFromWallet(walletId, amount);

  return {
    totalSpent: amount,
    batchesUsed,
  };
}

/**
 * Get all expired credit batches that still have remaining credits
 * Used by the cron job to process expired credits
 */
export async function getExpiredCreditBatches(): Promise<CreditBatch[]> {
  if (!baseId || !apiKey) {
    return [];
  }

  try {
    const now = new Date().toISOString();
    
    // Find purchase transactions that have expired but still have remaining credits
    const records = await base(TRANSACTIONS_TABLE)
      .select({
        filterByFormula: `AND(
          {type} = 'purchase',
          {remaining_credits} > 0,
          IS_BEFORE({expires_at}, '${now}')
        )`,
        sort: [{ field: "expires_at", direction: "asc" }],
      })
      .all();

    return records.map((record) => {
      const fields = record.fields;
      const employer_id = Array.isArray(fields.employer)
        ? fields.employer[0] || null
        : fields.employer || null;
      const wallet_id = Array.isArray(fields.wallet)
        ? fields.wallet[0] || null
        : fields.wallet || null;

      return {
        id: record.id,
        employer_id: employer_id as string | null,
        wallet_id: wallet_id as string | null,
        remaining_credits: (fields.remaining_credits as number) || 0,
        expires_at: fields.expires_at as string,
        "created-at": fields["created-at"] as string | undefined,
      };
    });
  } catch (error: unknown) {
    console.error("Error getting expired credit batches:", getErrorMessage(error));
    return [];
  }
}

/**
 * Process a single expired credit batch
 * - Sets remaining_credits to 0
 * - Deducts from wallet balance
 * - Creates an expiration transaction for audit
 */
export async function processExpiredCreditBatch(batch: CreditBatch): Promise<{
  success: boolean;
  creditsExpired: number;
  error?: string;
}> {
  if (!baseId || !apiKey) {
    return { success: false, creditsExpired: 0, error: "Airtable not configured" };
  }

  if (!batch.wallet_id || !batch.employer_id) {
    return { success: false, creditsExpired: 0, error: "Missing wallet or employer ID" };
  }

  const creditsToExpire = batch.remaining_credits;

  try {
    // 1. Set remaining_credits to 0 on the original purchase transaction
    await updateTransactionRemainingCredits(batch.id, 0);

    // 2. Deduct expired credits from wallet balance
    // First get current wallet balance
    const wallet = await base(WALLETS_TABLE).find(batch.wallet_id);
    if (!wallet) {
      return { success: false, creditsExpired: 0, error: "Wallet not found" };
    }

    const currentBalance = (wallet.fields.balance as number) || 0;
    const newBalance = Math.max(0, currentBalance - creditsToExpire);

    await base(WALLETS_TABLE).update(batch.wallet_id, {
      balance: newBalance,
      "last-updated": new Date().toISOString(),
    });

    // 3. Create an expiration transaction for audit trail
    await base(TRANSACTIONS_TABLE).create({
      employer: [batch.employer_id],
      wallet: [batch.wallet_id],
      type: "expiration",
      status: "paid", // Expiration is always "completed"
      total_credits: creditsToExpire,
      reference_type: "system",
      "created-at": new Date().toISOString(),
    });

    return { success: true, creditsExpired: creditsToExpire };
  } catch (error: unknown) {
    console.error("Error processing expired credit batch:", getErrorMessage(error));
    return { success: false, creditsExpired: 0, error: getErrorMessage(error) };
  }
}
