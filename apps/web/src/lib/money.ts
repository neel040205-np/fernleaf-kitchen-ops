/**
 * Converts an INR decimal value or string (e.g., 150.00 or "150.00") into integer paise/cents (15000).
 */
export function dollarsToCents(dollars: number | string): number {
  const val = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

/**
 * Converts integer paise/cents (e.g., 15000) to a string representation in INR (e.g., "150.00").
 */
export function centsToDollarsStr(cents?: number | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) return '0.00';
  return (cents / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats integer paise/cents into formatted INR currency string (e.g., 15000 -> "₹150.00").
 */
export function formatUsd(cents?: number | null): string {
  return `₹${centsToDollarsStr(cents)}`;
}

export function formatInr(cents?: number | null): string {
  return `₹${centsToDollarsStr(cents)}`;
}
