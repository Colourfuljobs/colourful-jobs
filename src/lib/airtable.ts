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
  status: z.enum(["pending_onboarding", "active", "invited"]).default("pending_onboarding"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.string().optional(),
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
  sector: z.string().optional(),
  location: z.string().optional(),
  short_description: z.string().optional(),
  logo: z.array(z.string()).optional(), // Linked record to Media Assets
  header_image: z.array(z.string()).optional(), // Linked record to Media Assets
  gallery: z.array(z.string()).optional(), // Linked records to Media Assets
  video_url: z.string().optional(), // YouTube or Vimeo URL for company page
  status: z.enum(["draft", "active"]).default("draft"),
  role: z.array(z.string()).optional(), // Linked record to Roles table
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
  "created-at": z.string().optional(),
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
  product_id: z.string().nullable().optional(), // Linked record to Products
  type: z.enum(["purchase", "spend", "refund", "adjustment"]),
  reference_type: z.enum(["vacancy", "order", "admin", "system"]).nullable().optional(),
  context: z.enum(["dashboard", "vacancy", "boost", "renew", "transactions"]).nullable().optional(),
  status: z.enum(["paid", "failed", "refunded", "open"]),
  money_amount: z.number().nullable().optional(),
  credits_amount: z.number().int(),
  vacancy_name: z.string().nullable().optional(), // Lookup field from Vacancies
  invoice: z.array(airtableAttachmentSchema).nullable().optional(), // Attachment field
  invoice_details_snapshot: z.string().nullable().optional(), // JSON string with invoice details at time of purchase
  "created-at": z.string().optional(),
});

export const productRecordSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  type: z.enum(["vacancy_package", "credit_bundle", "upsell"]),
  credits: z.number().int(),
  base_price: z.number().nullable().optional(), // Reference price (for showing discount)
  price: z.number(), // Actual selling price excl. VAT
  discount_percentage: z.number().nullable().optional(), // Calculated formula field
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  features: z.array(z.string()).optional(), // Linked records to Features
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
  duration_days: z.number().nullable().optional(),
  package_category: z.string().nullable().optional(), // More permissive - accept any string
});

// ============================================
// VACANCY SCHEMAS
// ============================================

export const vacancyStatusEnum = z.enum([
  "concept",
  "awaiting_approval",
  "published",
  "expired",
  "unpublished",
  "needs_adjustment",
]);

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
  title: z.string().optional(),
  status: vacancyStatusEnum.default("concept"),
  input_type: vacancyInputTypeEnum.default("self_service"),
  
  // Content
  intro_txt: z.string().optional(),
  description: z.string().optional(), // Rich text (HTML)
  
  // Location & job details
  location: z.string().optional(),
  employment_type: vacancyEmploymentTypeEnum.optional(),
  hrs_per_week: z.number().int().optional(),
  salary: z.string().optional(),
  
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
  apply_url: z.string().optional(),
  application_email: z.string().optional(),
  show_apply_form: z.boolean().default(false),
  
  // Contact person
  contact_name: z.string().optional(),
  contact_role: z.string().optional(),
  contact_company: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_photo_id: z.string().nullable().optional(), // Linked to Media Assets
  
  // Social proof
  recommendations: z.string().optional(), // JSON string array
  
  // Media
  media_assets: z.array(z.string()).optional(), // Linked to Media Assets
  
  // Credits & transactions
  credits_spent: z.number().int().optional(), // Lookup field
  credit_transactions: z.array(z.string()).optional(), // Linked to Transactions
  
  // Users & events
  users: z.array(z.string()).optional(), // Linked to Users (creator)
  events: z.array(z.string()).optional(), // Linked to Events
  
  // Timestamps
  "created-at": z.string().optional(),
  "updated-at": z.string().optional(),
  "submitted-at": z.string().optional(),
  "last-published-at": z.string().optional(),
  "depublished-at": z.string().optional(),
  "last-status_changed-at": z.string().optional(),
  closing_date: z.string().optional(),
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

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  if (!baseId || !apiKey) return null;

  const records = await base(USERS_TABLE)
    .select({
      filterByFormula: `{email} = '${escapeAirtableString(email)}'`,
      maxRecords: 1,
    })
    .firstPage();

  if (!records[0]) return null;

  const fields = records[0].fields;
  // Airtable Link fields return arrays, extract first value
  const employer_id = Array.isArray(fields.employer_id)
    ? fields.employer_id[0] || null
    : fields.employer_id || null;
  const invited_by = Array.isArray(fields.invited_by)
    ? fields.invited_by[0] || null
    : fields.invited_by || null;

  return userRecordSchema.parse({
    id: records[0].id,
    ...fields,
    employer_id,
    invited_by,
  });
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
  if (fields.role) airtableFields.role = fields.role;

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
    // Airtable Link fields return arrays, extract first value
    const employer_id = Array.isArray(resultFields.employer_id)
      ? resultFields.employer_id[0] || null
      : resultFields.employer_id || null;
    const invited_by = Array.isArray(resultFields.invited_by)
      ? resultFields.invited_by[0] || null
      : resultFields.invited_by || null;

    return userRecordSchema.parse({
      id: record.id,
      ...resultFields,
      employer_id,
      invited_by,
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
  // Linked records to Media Assets (require arrays of record IDs)
  if (fields.logo !== undefined) airtableFields.logo = fields.logo;
  if (fields.header_image !== undefined) airtableFields.header_image = fields.header_image;
  if (fields.gallery !== undefined) airtableFields.gallery = fields.gallery;
  if (fields.video_url !== undefined) airtableFields.video_url = fields.video_url;
  if (fields.status !== undefined) airtableFields.status = fields.status;

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
  const employer_id = Array.isArray(fields_result.employer_id)
    ? fields_result.employer_id[0] || null
    : fields_result.employer_id || null;
  const invited_by = Array.isArray(fields_result.invited_by)
    ? fields_result.invited_by[0] || null
    : fields_result.invited_by || null;

  return userRecordSchema.parse({
    id: record.id,
    ...fields_result,
    employer_id,
    invited_by,
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

    return employerRecordSchema.parse({
      id: record.id,
      ...fields,
      logo,
      header_image,
      gallery,
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
      const vacancy_id = Array.isArray(fields.vacancy)
        ? fields.vacancy[0] || null
        : fields.vacancy || null;

      return transactionRecordSchema.parse({
        id: record.id,
        employer_id,
        wallet_id,
        vacancy_id,
        user_id: null, // Not used in this table
        type: fields.type,
        reference_type: fields.reference_type || null,
        status: fields.status,
        money_amount: fields.money_amount || null,
        credits_amount: fields.credits_amount || 0,
        vacancy_name: fields.vacancy_name || null,
        invoice: fields.invoice || null,
        "created-at": fields["created-at"] as string | undefined,
      });
    });
  } catch (error: unknown) {
    console.error("[Transactions] Error:", getErrorMessage(error));
    console.error("[Transactions] Full error:", error);
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
        "created-at": fields["created-at"] as string | undefined,
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
    "created-at": new Date().toISOString(),
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
      "created-at": recordFields["created-at"] as string | undefined,
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
    "created-at": recordFields["created-at"] as string | undefined,
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
    const employer_id = Array.isArray(fields.employer_id)
      ? fields.employer_id[0] || null
      : fields.employer_id || null;
    const invited_by = Array.isArray(fields.invited_by)
      ? fields.invited_by[0] || null
      : fields.invited_by || null;

    return userRecordSchema.parse({
      id: record.id,
      ...fields,
      employer_id,
      invited_by,
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
      const employer_id = Array.isArray(fields.employer_id)
        ? fields.employer_id[0] || null
        : fields.employer_id || null;
      const invited_by = Array.isArray(fields.invited_by)
        ? fields.invited_by[0] || null
        : fields.invited_by || null;

      return userRecordSchema.parse({
        id: record.id,
        ...fields,
        employer_id,
        invited_by,
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
    const employer_id = Array.isArray(fields.employer_id)
      ? fields.employer_id[0] || null
      : fields.employer_id || null;
    const invited_by = Array.isArray(fields.invited_by)
      ? fields.invited_by[0] || null
      : fields.invited_by || null;

    return userRecordSchema.parse({
      id: records[0].id,
      ...fields,
      employer_id,
      invited_by,
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
    "updated-at": new Date().toISOString(),
  });

  const fields = record.fields;
  const employer_id = Array.isArray(fields.employer_id)
    ? fields.employer_id[0] || null
    : fields.employer_id || null;
  const invited_by = Array.isArray(fields.invited_by)
    ? fields.invited_by[0] || null
    : fields.invited_by || null;

  return userRecordSchema.parse({
    id: record.id,
    ...fields,
    employer_id,
    invited_by,
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
      
      // Extract linked record IDs from array (features)
      const features = Array.isArray(fields.features) ? fields.features : [];

      return productRecordSchema.parse({
        id: record.id,
        display_name: fields.display_name || "",
        type: fields.type,
        credits: fields.credits || 0,
        base_price: fields.base_price || null,
        price: fields.price || 0,
        discount_percentage: fields.discount_percentage || null,
        is_active: fields.is_active || false,
        sort_order: fields.sort_order || 0,
        features,
      });
    });
  } catch (error: unknown) {
    console.error("Error getting products by type:", getErrorMessage(error));
    return [];
  }
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

    return productRecordSchema.parse({
      id: record.id,
      display_name: fields.display_name || "",
      type: fields.type,
      credits: fields.credits || 0,
      base_price: fields.base_price || null,
      price: fields.price || 0,
      discount_percentage: fields.discount_percentage || null,
      is_active: fields.is_active || false,
      sort_order: fields.sort_order || 0,
      features,
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
        duration_days: fields.duration_days || null,
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
        duration_days: fields.duration_days || null,
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
 */
export async function createPurchaseTransaction(fields: {
  employer_id: string;
  wallet_id: string;
  user_id: string;
  product_id: string;
  credits_amount: number;
  money_amount: number;
  context: TransactionRecord["context"];
  invoice_details_snapshot: string; // JSON string
}): Promise<TransactionRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    employer: [fields.employer_id], // Linked record requires array
    wallet: [fields.wallet_id], // Linked record requires array
    product_id: [fields.product_id], // Linked record to Products - requires array
    type: "purchase",
    status: "open",
    credits_amount: fields.credits_amount,
    money_amount: fields.money_amount,
    context: fields.context,
    invoice_details_snapshot: fields.invoice_details_snapshot,
    reference_type: "order",
    "created-at": new Date().toISOString(),
  };

  try {
    const record = await base(TRANSACTIONS_TABLE).create(airtableFields);

    const recordFields = record.fields;
    const employer_id = Array.isArray(recordFields.employer)
      ? recordFields.employer[0] || null
      : recordFields.employer || null;
    const wallet_id = Array.isArray(recordFields.wallet)
      ? recordFields.wallet[0] || null
      : recordFields.wallet || null;
    const product_id = Array.isArray(recordFields.product_id)
      ? recordFields.product_id[0] || null
      : recordFields.product_id || null;

    return transactionRecordSchema.parse({
      id: record.id,
      employer_id,
      wallet_id,
      user_id: null,
      product_id,
      vacancy_id: null,
      type: recordFields.type,
      reference_type: recordFields.reference_type || null,
      context: (recordFields.context as string) || null,
      status: recordFields.status,
      money_amount: recordFields.money_amount || null,
      credits_amount: recordFields.credits_amount || 0,
      vacancy_name: null,
      invoice: recordFields.invoice || null,
      invoice_details_snapshot: (recordFields.invoice_details_snapshot as string) || null,
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
  const media_assets = Array.isArray(fields.media_assets) 
    ? fields.media_assets 
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

  return vacancyRecordSchema.parse({
    id: record.id,
    employer_id,
    title: fields.title || "",
    status: fields.status || "concept",
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
    media_assets,
    credits_spent: fields.credits_spent || 0,
    credit_transactions,
    users,
    events,
    "created-at": fields["created-at"] as string | undefined,
    "updated-at": fields["updated-at"] as string | undefined,
    "submitted-at": fields["submitted-at"] as string | undefined,
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
    status: "concept",
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
    airtableFields.status = fields.status;
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
  
  // Media
  if (fields.media_assets !== undefined) airtableFields.media_assets = fields.media_assets;
  
  // Users
  if (fields.users !== undefined) airtableFields.users = fields.users;
  
  // Special timestamps
  if (fields["submitted-at"] !== undefined) airtableFields["submitted-at"] = fields["submitted-at"];
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
 */
export async function createSpendTransaction(fields: {
  employer_id: string;
  wallet_id: string;
  vacancy_id: string;
  credits_amount: number;
  context?: TransactionRecord["context"];
}): Promise<TransactionRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    employer: [fields.employer_id],
    wallet: [fields.wallet_id],
    vacancy: [fields.vacancy_id],
    type: "spend",
    status: "paid",
    credits_amount: fields.credits_amount,
    reference_type: "vacancy",
    context: fields.context || "vacancy",
    "created-at": new Date().toISOString(),
  };

  try {
    const record = await base(TRANSACTIONS_TABLE).create(airtableFields);

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

    return transactionRecordSchema.parse({
      id: record.id,
      employer_id,
      wallet_id,
      vacancy_id,
      user_id: null,
      product_id: null,
      type: recordFields.type,
      reference_type: recordFields.reference_type || null,
      context: (recordFields.context as string) || null,
      status: recordFields.status,
      money_amount: null,
      credits_amount: recordFields.credits_amount || 0,
      vacancy_name: recordFields.vacancy_name || null,
      invoice: null,
      invoice_details_snapshot: null,
      "created-at": recordFields["created-at"] as string | undefined,
    });
  } catch (error: unknown) {
    console.error("Error creating spend transaction:", getErrorMessage(error));
    throw new Error(`Failed to create spend transaction: ${getErrorMessage(error)}`);
  }
}
