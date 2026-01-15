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

