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

/**
 * Price display mode - determines whether to show euros or credits prominently
 */
export type PriceDisplayMode = "euros" | "credits";

/**
 * Get the price display mode based on whether the user has ever purchased credits
 * @param totalPurchased - Total credits ever purchased by the user
 * @returns "credits" if user has purchased credits, "euros" otherwise
 */
export function getPriceDisplayMode(totalPurchased: number): PriceDisplayMode {
  return totalPurchased > 0 ? "credits" : "euros";
}

/**
 * Format price with credits based on display mode
 * @param price - Price in euros
 * @param credits - Number of credits
 * @param mode - Display mode (euros or credits)
 * @returns Formatted string like "€249 (5 credits)" or "5 credits (€249)"
 */
export function formatPriceWithCredits(
  price: number,
  credits: number,
  mode: PriceDisplayMode
): string {
  const formattedPrice = `€${price % 1 === 0 ? price.toLocaleString("nl-NL") : price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedCredits = `${credits} ${credits === 1 ? "credit" : "credits"}`;
  
  if (mode === "euros") {
    return `${formattedPrice} (${formattedCredits})`;
  }
  return `${formattedCredits} (${formattedPrice})`;
}
