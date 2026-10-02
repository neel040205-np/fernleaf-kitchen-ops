/**
 * Rounds cents UP to the next 5-cent boundary ($0.05 = 5 cents).
 * Examples:
 * - 211 cents ($2.11) -> 215 cents ($2.15)
 * - 215 cents ($2.15) -> 215 cents ($2.15)
 * - 201 cents ($2.01) -> 205 cents ($2.05)
 * - 200 cents ($2.00) -> 200 cents ($2.00)
 */
export function roundUpToNext5Cents(cents: number): number {
  if (cents <= 0) return 0;
  const remainder = cents % 5;
  if (remainder === 0) return cents;
  return cents + (5 - remainder);
}

/**
 * Calculates derived price in cents given a base value and derivation rule.
 */
export function calculateDerivedPriceCents(
  baseCents: number,
  multiplier: number,
): number {
  if (!baseCents || baseCents <= 0 || !multiplier || multiplier <= 0) {
    return 0;
  }
  const rawCents = Math.ceil(baseCents * multiplier);
  return roundUpToNext5Cents(rawCents);
}

/**
 * Formats integer cents to USD string representation (e.g. 1550 -> "$15.50")
 */
export function formatCentsToUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
