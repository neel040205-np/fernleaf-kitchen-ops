/**
 * Converts a dollar decimal value or string (e.g., 12.50 or "12.50") into integer cents (1250).
 */
export function dollarsToCents(dollars: number | string): number {
  const val = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

/**
 * Converts integer cents (e.g., 1250) to a string representation in dollars (e.g., "12.50").
 */
export function centsToDollarsStr(cents?: number | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) return '0.00';
  return (cents / 100).toFixed(2);
}

/**
 * Formats integer cents into formatted USD currency string (e.g., 1250 -> "$12.50").
 */
export function formatUsd(cents?: number | null): string {
  return `$${centsToDollarsStr(cents)}`;
}
