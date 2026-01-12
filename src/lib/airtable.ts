import Airtable from "airtable";
import { z } from "zod";

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
  status: z.enum(["pending_onboarding", "active"]).default("pending_onboarding"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.string().optional(),
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
  "invoice_house-nr": z.string().optional(),
  "invoice_house-nr-add": z.string().optional(),
  "invoice_postal-code": z.string().optional(),
  invoice_city: z.string().optional(),
  invoice_country: z.string().optional(),
  sector: z.string().optional(),
  location: z.string().optional(),
  short_description: z.string().optional(),
  logo: z.array(z.any()).optional(),
  "logo_alt-text": z.string().optional(),
  header_image: z.array(z.any()).optional(),
  "header_image_alt-text": z.string().optional(),
  status: z.enum(["draft", "active"]).default("draft"),
  role: z.array(z.string()).optional(), // Linked record to Roles table
});

type UserRecord = z.infer<typeof userRecordSchema>;
type EmployerRecord = z.infer<typeof employerRecordSchema>;

const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || "Users";
const EMPLOYERS_TABLE = process.env.AIRTABLE_EMPLOYERS_TABLE || "Employers";
const DEFAULT_EMPLOYER_ROLE_ID = process.env.AIRTABLE_DEFAULT_EMPLOYER_ROLE_ID;

if (!DEFAULT_EMPLOYER_ROLE_ID) {
  console.warn(
    "AIRTABLE_DEFAULT_EMPLOYER_ROLE_ID is not set. Employers will be created without a default role."
  );
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

  return userRecordSchema.parse({
    id: records[0].id,
    ...fields,
    employer_id,
  });
}

export async function createUser(fields: {
  email: string;
  employer_id?: string | null;
  status?: UserRecord["status"];
  first_name?: string;
  last_name?: string;
  role?: string;
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

  try {
    const record = await base(USERS_TABLE).create(airtableFields);

    // Update the record to set the id field to the Airtable record ID
    await base(USERS_TABLE).update(record.id, { id: record.id });

    const fields = record.fields;
    // Airtable Link fields return arrays, extract first value
    const employer_id = Array.isArray(fields.employer_id)
      ? fields.employer_id[0] || null
      : fields.employer_id || null;

    return userRecordSchema.parse({
      id: record.id,
      ...fields,
      employer_id,
    });
  } catch (error: any) {
    console.error("Error creating user in Airtable:", {
      table: USERS_TABLE,
      fields: airtableFields,
      error: error.message,
      statusCode: error.statusCode,
    });
    throw new Error(`Failed to create user: ${error.message || "Unknown error"}`);
  }
}

export async function createEmployer(fields: Partial<EmployerRecord>): Promise<EmployerRecord> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  const airtableFields: Record<string, any> = {
    status: fields.status ?? "draft",
    // Set default employer role (linked record to Roles table) if configured
    ...(DEFAULT_EMPLOYER_ROLE_ID && { role: fields.role ?? [DEFAULT_EMPLOYER_ROLE_ID] }),
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
  if (fields["invoice_house-nr"] !== undefined) airtableFields["invoice_house-nr"] = fields["invoice_house-nr"];
  if (fields["invoice_house-nr-add"] !== undefined) airtableFields["invoice_house-nr-add"] = fields["invoice_house-nr-add"];
  if (fields["invoice_postal-code"] !== undefined) airtableFields["invoice_postal-code"] = fields["invoice_postal-code"];
  if (fields.invoice_city !== undefined) airtableFields.invoice_city = fields.invoice_city;
  if (fields.invoice_country !== undefined) airtableFields.invoice_country = fields.invoice_country;
  if (fields.sector !== undefined) airtableFields.sector = fields.sector;
  if (fields.location !== undefined) airtableFields.location = fields.location;
  if (fields.short_description !== undefined) airtableFields.short_description = fields.short_description;
  if (fields.logo !== undefined) airtableFields.logo = fields.logo;
  if (fields["logo_alt-text"] !== undefined) airtableFields["logo_alt-text"] = fields["logo_alt-text"];
  if (fields.header_image !== undefined) airtableFields.header_image = fields.header_image;
  if (fields["header_image_alt-text"] !== undefined) airtableFields["header_image_alt-text"] = fields["header_image_alt-text"];

  try {
    const record = await base(EMPLOYERS_TABLE).create(airtableFields);

    // Update the record to set the employer_id field to the Airtable record ID
    await base(EMPLOYERS_TABLE).update(record.id, { employer_id: record.id });

    return employerRecordSchema.parse({
      id: record.id,
      ...record.fields,
    });
  } catch (error: any) {
    console.error("Error creating employer in Airtable:", {
      table: EMPLOYERS_TABLE,
      fields: airtableFields,
      error: error.message,
      statusCode: error.statusCode,
    });
    throw new Error(
      `Failed to create employer: ${error.message || "Unknown error"}`
    );
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
  if (fields["invoice_house-nr"] !== undefined) airtableFields["invoice_house-nr"] = fields["invoice_house-nr"];
  if (fields["invoice_house-nr-add"] !== undefined) airtableFields["invoice_house-nr-add"] = fields["invoice_house-nr-add"];
  if (fields["invoice_postal-code"] !== undefined) airtableFields["invoice_postal-code"] = fields["invoice_postal-code"];
  if (fields.invoice_city !== undefined) airtableFields.invoice_city = fields.invoice_city;
  if (fields.invoice_country !== undefined) airtableFields.invoice_country = fields.invoice_country;
  if (fields.sector !== undefined) airtableFields.sector = fields.sector;
  if (fields.location !== undefined) airtableFields.location = fields.location;
  if (fields.short_description !== undefined) airtableFields.short_description = fields.short_description;
  if (fields.logo !== undefined) airtableFields.logo = fields.logo;
  if (fields["logo_alt-text"] !== undefined) airtableFields["logo_alt-text"] = fields["logo_alt-text"];
  if (fields.header_image !== undefined) airtableFields.header_image = fields.header_image;
  if (fields["header_image_alt-text"] !== undefined) airtableFields["header_image_alt-text"] = fields["header_image_alt-text"];
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

  const record = await base(USERS_TABLE).update(id, airtableFields);

  const fields_result = record.fields;
  const employer_id = Array.isArray(fields_result.employer_id)
    ? fields_result.employer_id[0] || null
    : fields_result.employer_id || null;

  return userRecordSchema.parse({
    id: record.id,
    ...fields_result,
    employer_id,
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
  } catch (error: any) {
    console.error("Error getting employer by KVK:", error);
    return null;
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(USERS_TABLE).destroy(id);
  } catch (error: any) {
    console.error("Error deleting user from Airtable:", error);
    throw new Error(`Failed to delete user: ${error.message || "Unknown error"}`);
  }
}

export async function deleteEmployer(id: string): Promise<void> {
  if (!baseId || !apiKey) {
    throw new Error("Airtable not configured");
  }

  try {
    await base(EMPLOYERS_TABLE).destroy(id);
  } catch (error: any) {
    console.error("Error deleting employer from Airtable:", error);
    throw new Error(`Failed to delete employer: ${error.message || "Unknown error"}`);
  }
}


