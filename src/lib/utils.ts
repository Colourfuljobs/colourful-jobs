import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Type-safe error message extraction
 * Handles unknown error types and extracts the message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
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

