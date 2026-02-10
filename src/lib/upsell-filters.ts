import { ProductRecord, TransactionRecord } from "@/lib/airtable";

/**
 * Context passed to the repeat_mode filter for each upsell.
 */
export interface RepeatModeContext {
  /** All spend/boost transactions for this vacancy */
  vacancyTransactions: TransactionRecord[];
  /** First publication date of the vacancy (for until_max calculations) */
  firstPublishedAt?: string;
  /** Current closing date of the vacancy */
  closingDate?: string;
}

/**
 * Result of the repeat_mode filter for a single upsell.
 */
export interface UpsellFilterResult {
  /** The product */
  product: ProductRecord;
  /** Whether the upsell should be shown */
  visible: boolean;
  /** For until_max: the maximum selectable date (published_at + max_value days) */
  maxDate?: Date;
}

/**
 * Filter upsells based on their repeat_mode and existing transactions on the vacancy.
 *
 * Repeat modes:
 * - `once`: Hide if a transaction for this product already exists on this vacancy.
 * - `unlimited`: Always show. No filtering needed.
 * - `renewable`: Hide if the most recent transaction's effect is still active
 *   (created_at + duration_days > now). Show if expired or no transaction exists.
 * - `until_max`: Hide if the vacancy has reached the maximum value
 *   (e.g. closing_date >= published_at + max_value days). Otherwise show,
 *   and include the max selectable date for the UI.
 *
 * Products without a repeat_mode default to `unlimited` (always shown).
 */
export function filterUpsellsByRepeatMode(
  upsells: ProductRecord[],
  context: RepeatModeContext
): UpsellFilterResult[] {
  const { vacancyTransactions } = context;

  return upsells.map((product) => {
    const mode = product.repeat_mode || "unlimited";

    switch (mode) {
      case "unlimited":
        return { product, visible: true };

      case "once":
        return {
          product,
          visible: !hasExistingTransaction(product.id, vacancyTransactions),
        };

      case "renewable":
        return {
          product,
          visible: isRenewable(product, vacancyTransactions),
        };

      case "until_max":
        return filterUntilMax(product, context);

      default:
        return { product, visible: true };
    }
  });
}

/**
 * Check if any transaction for this product exists on the vacancy.
 */
function hasExistingTransaction(
  productId: string,
  transactions: TransactionRecord[]
): boolean {
  return transactions.some(
    (tx) => tx.product_ids?.includes(productId)
  );
}

/**
 * For `renewable` mode: check if the effect of the most recent transaction
 * has expired (created_at + duration_days < now).
 * Returns true if the upsell should be shown (expired or no prior purchase).
 */
function isRenewable(
  product: ProductRecord,
  transactions: TransactionRecord[]
): boolean {
  const durationDays = product.duration_days;
  if (!durationDays) return true; // No duration configured → always show

  // Find the most recent transaction for this product
  const relevantTx = transactions
    .filter((tx) => tx.product_ids?.includes(product.id))
    .sort((a, b) => {
      const dateA = a["created-at"] ? new Date(a["created-at"]).getTime() : 0;
      const dateB = b["created-at"] ? new Date(b["created-at"]).getTime() : 0;
      return dateB - dateA; // Most recent first
    })[0];

  if (!relevantTx || !relevantTx["created-at"]) return true; // No prior purchase

  // Calculate expiry: created_at + duration_days
  const createdAt = new Date(relevantTx["created-at"]);
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const now = new Date();
  return expiresAt <= now; // Show if effect has expired
}

/**
 * For `until_max` mode: check if the vacancy has reached the maximum value.
 * For example, extend_duration with max_value=365 checks if
 * closing_date >= first_published_at + 365 days.
 * Returns visible=false if max is reached, otherwise visible=true with maxDate.
 */
function filterUntilMax(
  product: ProductRecord,
  context: RepeatModeContext
): UpsellFilterResult {
  const { firstPublishedAt, closingDate } = context;
  const maxValue = product.max_value;

  // If no max_value or no publication date, show by default
  if (!maxValue || !firstPublishedAt) {
    return { product, visible: true };
  }

  // Calculate the absolute maximum date: published_at + max_value days
  const pubDate = new Date(firstPublishedAt);
  pubDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(pubDate);
  maxDate.setDate(maxDate.getDate() + maxValue);

  // If closing_date already equals or exceeds the max → hide
  if (closingDate) {
    const closing = new Date(closingDate);
    closing.setHours(0, 0, 0, 0);

    if (closing >= maxDate) {
      return { product, visible: false };
    }
  }

  return { product, visible: true, maxDate };
}

/**
 * Convenience: filter and return only visible products.
 * For contexts where you just need the filtered list (e.g. vacancy creation).
 */
export function getVisibleUpsells(
  upsells: ProductRecord[],
  context: RepeatModeContext
): ProductRecord[] {
  return filterUpsellsByRepeatMode(upsells, context)
    .filter((r) => r.visible)
    .map((r) => r.product);
}
