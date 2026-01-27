/**
 * Credits utility functions for validating and checking credit balances
 */

export interface CreditCheckResult {
  sufficient: boolean;
  shortage: number;
  available: number;
  required: number;
}

/**
 * Check if there are sufficient credits for an action
 * @param required - Number of credits required for the action
 * @param available - Number of credits available in the wallet
 * @returns Object with sufficient flag and shortage amount
 */
export function checkSufficientCredits(
  required: number,
  available: number
): CreditCheckResult {
  const shortage = Math.max(0, required - available);
  return {
    sufficient: available >= required,
    shortage,
    available,
    required,
  };
}

/**
 * Format credits amount for display
 * @param amount - Number of credits
 * @returns Formatted string (e.g., "10 credits" or "1 credit")
 */
export function formatCredits(amount: number): string {
  return `${amount} ${amount === 1 ? "credit" : "credits"}`;
}

/**
 * Calculate the credits needed for a vacancy package
 * Based on the Products table pricing
 */
export const VACANCY_PACKAGE_CREDITS = {
  basic: 16,
  complete: 20,
  premium: 23,
} as const;

/**
 * Calculate the credits needed for upsells
 * Based on the Products table pricing
 */
export const UPSELL_CREDITS = {
  featured: 3,
  extra_social: 3,
  same_day: 3,
  extend_duration: 3,
} as const;
