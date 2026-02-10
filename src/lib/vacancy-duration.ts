import { ProductRecord } from "@/lib/airtable";

/**
 * Haal de basislooptijd (dagen) uit het product.
 * Leest duration_days direct van het product.
 */
export function getPackageBaseDuration(product: Pick<ProductRecord, "duration_days">): number {
  return product.duration_days ?? 30; // fallback 30 dagen
}

/**
 * Bereken het geldige datumbereik voor looptijdverlenging.
 * - minDate: huidige sluitingsdatum of vandaag (als closing_date in verleden/niet ingesteld)
 * - maxDate: publicatiedatum + 365 dagen
 */
export function calculateDateRange(
  publishedAt: string,
  currentClosingDate?: string
): { minDate: Date; maxDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Min: huidige sluitingsdatum of vandaag (als closing_date in verleden/niet ingesteld)
  let minDate = today;
  if (currentClosingDate) {
    const closing = new Date(currentClosingDate);
    closing.setHours(0, 0, 0, 0);
    minDate = closing > today ? closing : today;
  }

  // Max: publicatiedatum + 365 dagen
  const pubDate = new Date(publishedAt);
  pubDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(pubDate);
  maxDate.setDate(maxDate.getDate() + 365);

  return { minDate, maxDate };
}

/**
 * Bereken het aantal extra dagen op basis van gekozen datum
 * ten opzichte van de huidige sluitingsdatum (of vandaag).
 */
export function calculateExtraDays(
  selectedDate: Date,
  currentClosingDate?: string
): number {
  const baseline = currentClosingDate ? new Date(currentClosingDate) : new Date();
  baseline.setHours(0, 0, 0, 0);
  const selected = new Date(selectedDate);
  selected.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.round(
      (selected.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}
