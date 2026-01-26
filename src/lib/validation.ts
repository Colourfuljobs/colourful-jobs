import { z } from "zod";
import { normalizeUrl } from "./utils";

// Simple validation helpers using standard Zod methods
// These work better with react-hook-form's zodResolver

// Custom URL validation that accepts URLs with or without protocol
const websiteUrlSchema = z.string()
  .min(1, "Website-URL is verplicht")
  .refine((val) => {
    // Normalize URL and check if it's valid
    const normalized = normalizeUrl(val);
    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  }, "Voer een geldige URL in (bijv. www.voorbeeld.nl)");

// Personal data validation (Users table)
export const personalDataSchema = z.object({
  first_name: z.string().min(1, "Voornaam is verplicht"),
  last_name: z.string().min(1, "Achternaam is verplicht"),
  email: z.string().min(1, "E-mailadres is verplicht").email("Ongeldig e-mailadres"),
});

// Company data validation (Employers table)
export const companyDataSchema = z.object({
  company_name: z.string().min(1, "Juridische bedrijfsnaam is verplicht"),
  kvk: z.string().min(1, "KVK-nummer is verplicht").regex(/^\d{8}$/, "KVK-nummer moet 8 cijfers bevatten"),
  phone: z.string().min(1, "Telefoonnummer is verplicht"),
  website_url: websiteUrlSchema,
});

// Billing data validation (Employers table)
export const billingDataSchema = z.object({
  "reference-nr": z.string().optional(),
  invoice_contact_name: z.string().min(1, "Contactpersoon facturatie is verplicht"),
  invoice_email: z.string().min(1, "E-mail facturatie is verplicht").email("Ongeldig e-mailadres"),
  invoice_street: z.string().min(1, "Straat en huisnummer is verplicht"),
  "invoice_postal-code": z.string().min(1, "Postcode is verplicht"),
  invoice_city: z.string().min(1, "Plaats is verplicht"),
});

// Website data validation (Employers table)
export const websiteDataSchema = z.object({
  display_name: z.string().min(1, "Weergavenaam is verplicht"),
  sector: z.string().min(1, "Sector is verplicht"),
  short_description: z.string().min(1, "Omschrijving is verplicht"),
  // Logo and header_image are uploaded separately, validation handled in UI
  logo: z.any().optional(),
  header_image: z.any().optional(),
});

// Complete onboarding form schema
export const onboardingFormSchema = personalDataSchema
  .merge(companyDataSchema)
  .merge(billingDataSchema)
  .merge(websiteDataSchema);

export type PersonalData = z.infer<typeof personalDataSchema>;
export type CompanyData = z.infer<typeof companyDataSchema>;
export type BillingData = z.infer<typeof billingDataSchema>;
export type WebsiteData = z.infer<typeof websiteDataSchema>;
export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

// Domain validation utilities for join existing employer flow

/**
 * Extract domain from email address
 * @example "user@company.nl" → "company.nl"
 */
export function extractDomainFromEmail(email: string): string | null {
  if (!email || !email.includes("@")) {
    return null;
  }
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[1]) {
    return null;
  }
  return parts[1].toLowerCase().trim();
}

/**
 * Extract domain from website URL
 * @example "https://www.company.nl/page" → "company.nl"
 */
export function extractDomainFromUrl(websiteUrl: string): string | null {
  if (!websiteUrl) {
    return null;
  }
  
  try {
    const url = new URL(websiteUrl);
    // Remove www. prefix and convert to lowercase
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Check if email domain matches website domain
 * Used for validating if a user can join an existing employer account
 */
export function doDomainsMatch(email: string, websiteUrl: string): boolean {
  const emailDomain = extractDomainFromEmail(email);
  const websiteDomain = extractDomainFromUrl(websiteUrl);
  
  if (!emailDomain || !websiteDomain) {
    return false;
  }
  
  return emailDomain === websiteDomain;
}

