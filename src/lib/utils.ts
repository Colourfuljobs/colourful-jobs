import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Type-safe error message extraction
 * Handles unknown error types and extracts the message string
 * Special handling for Zod validation errors to return user-friendly messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // Check if this looks like a Zod email validation error (contains email pattern info)
    if (message.includes('"format": "email"') || message.includes('Invalid email address')) {
      return "Ongeldig e-mailadres. Controleer of je e-mailadres correct is geschreven.";
    }
    
    // Check for other Zod validation errors (JSON array format)
    if (message.startsWith('[{') && message.includes('"code":') && message.includes('"message":')) {
      try {
        const zodErrors = JSON.parse(message);
        if (Array.isArray(zodErrors) && zodErrors.length > 0) {
          // Return the first error message
          return zodErrors[0].message || "Validatiefout opgetreden.";
        }
      } catch {
        // If parsing fails, return a generic validation error
        return "Validatiefout opgetreden. Controleer je gegevens.";
      }
    }
    
    return message;
  }
  if (typeof error === "string") {
    // Check if the string looks like a Zod error
    if (error.includes('"format": "email"') || error.includes('Invalid email address')) {
      return "Ongeldig e-mailadres. Controleer of je e-mailadres correct is geschreven.";
    }
    return error;
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown error";
}

/**
 * Type guard to check if error has a statusCode property (common in API errors)
 */
export function hasStatusCode(error: unknown): error is { statusCode: number } {
  return error !== null && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number";
}

/**
 * Normalize a URL by adding https:// if no protocol is specified
 * - "www.example.com" → "https://www.example.com"
 * - "example.com" → "https://example.com"
 * - "http://example.com" → "http://example.com" (keeps existing protocol)
 * - "https://example.com" → "https://example.com" (unchanged)
 * - "" → "" (empty string unchanged)
 */
export function normalizeUrl(url: string): string {
  if (!url || url.trim() === "") {
    return "";
  }
  
  const trimmedUrl = url.trim();
  
  // If URL already has a protocol, return as-is
  if (trimmedUrl.match(/^https?:\/\//i)) {
    return trimmedUrl;
  }
  
  // Add https:// prefix
  return `https://${trimmedUrl}`;
}

/**
 * Check if an employer's profile is complete
 * Required fields for a complete profile:
 * - display_name (weergavenaam)
 * - sector
 * - logo (URL)
 */
export interface EmployerProfileData {
  display_name?: string | null;
  sector?: string | null;
  logo?: string | null;
}

export interface ProfileCompleteResult {
  complete: boolean;
  missingFields: string[];
}

export function isProfileComplete(profile: EmployerProfileData): ProfileCompleteResult {
  const requiredFields = [
    { key: 'display_name', label: 'Weergavenaam' },
    { key: 'sector', label: 'Sector' },
    { key: 'logo', label: 'Logo' },
  ] as const;

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = profile[field.key as keyof EmployerProfileData];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field.label);
    }
  }

  return {
    complete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Sorts lookup records alphabetically, but always places "Overig" or "Overige" at the end.
 * Case-insensitive match on both "overig" and "overige" to be safe.
 * 
 * @param records - Array of lookup records to sort
 * @returns Sorted array with "Overig"/"Overige" last
 */
export function sortLookupWithOverigeLast<T extends { id: string; name: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    const aIsOverig = aLower === "overig" || aLower === "overige";
    const bIsOverig = bLower === "overig" || bLower === "overige";
    
    if (aIsOverig && !bIsOverig) return 1;
    if (!aIsOverig && bIsOverig) return -1;
    return a.name.localeCompare(b.name, "nl");
  });
}

/**
 * Adds Dutch thousand separators (dots) to numbers of 4+ digits in a string.
 * Already formatted numbers (with dots) are left untouched.
 * "4000 - 5500" → "4.000 - 5.500"
 */
function addThousandSeparators(value: string): string {
  return value.replace(/\d{4,}/g, (match) => {
    return match.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });
}

/**
 * Ensures salary strings that start with a digit get a € prefix.
 * If the value starts with a letter or €, it's returned as-is.
 * Also adds thousand separators to numbers of 4+ digits.
 */
export function formatSalaryInput(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed) return value;

  // Step 1: Add thousand separators to all bare numbers
  let result = addThousandSeparators(trimmed);

  // Step 2: Add € prefix if starts with a digit
  const firstChar = result.charAt(0);
  if (/[0-9]/.test(firstChar)) {
    result = `€${result}`;
  }

  return result;
}