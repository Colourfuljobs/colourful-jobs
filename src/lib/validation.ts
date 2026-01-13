import { z } from "zod";

// Simple validation helpers using standard Zod methods
// These work better with react-hook-form's zodResolver

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
  website_url: z.string().min(1, "Website-URL is verplicht").url("Voer een geldige URL in (bijv. https://www.voorbeeld.nl)"),
});

// Billing data validation (Employers table)
export const billingDataSchema = z.object({
  "reference-nr": z.string().optional(),
  invoice_contact_name: z.string().min(1, "Contactpersoon facturatie is verplicht"),
  invoice_email: z.string().min(1, "E-mail facturatie is verplicht").email("Ongeldig e-mailadres"),
  invoice_street: z.string().min(1, "Straat is verplicht"),
  "invoice_house-nr": z.string().min(1, "Huisnummer is verplicht"),
  "invoice_house-nr-add": z.string().optional(),
  "invoice_postal-code": z.string().min(1, "Postcode is verplicht"),
  invoice_city: z.string().min(1, "Plaats is verplicht"),
  invoice_country: z.string().min(1, "Land is verplicht"),
});

// Website data validation (Employers table)
export const websiteDataSchema = z.object({
  display_name: z.string().min(1, "Weergavenaam is verplicht"),
  sector: z.string().min(1, "Sector is verplicht"),
  location: z.string().min(1, "Locatie is verplicht"),
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

