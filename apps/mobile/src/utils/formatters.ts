/**
 * MarketPulse AI - Formatting Utilities
 * 
 * CRITICAL: All monetary/percentage values from the backend arrive as STRINGS
 * to avoid JS floating-point precision loss. These helpers safely format 
 * those string values for display without ever converting to intermediate floats.
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
});

/**
 * Safely formats a value (string or number) as USD currency.
 * Returns '$0.00' on any invalid input instead of crashing.
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(parsed)) return '$0.00';
  return currencyFormatter.format(parsed);
}

/**
 * Compact currency for large numbers: $142.5K, $1.2M
 */
export function formatCurrencyCompact(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0';
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(parsed)) return '$0';
  return compactFormatter.format(parsed);
}

/**
 * Safely formats a percentage value.
 * Input: 2.41 (meaning 2.41%). Output: "+2.41%"
 * Gracefully handles string inputs from the backend.
 */
export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '0.00%';
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(parsed)) return '0.00%';
  // Intl.NumberFormat percent expects 0.0241 for 2.41%, so we divide by 100
  return percentFormatter.format(parsed / 100);
}

/**
 * Formats a quantity with appropriate decimal places.
 * Crypto: up to 8 decimals. Forex: 4 decimals. Metals: 2 decimals.
 */
export function formatQuantity(value: string | number | null | undefined, decimals: number = 4): string {
  if (value === null || value === undefined) return '0';
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(parsed)) return '0';
  
  // Remove trailing zeros
  return parsed.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Returns sentiment color based on value sign.
 */
export function getSentimentColor(value: number, bullColor: string, bearColor: string): string {
  return value >= 0 ? bullColor : bearColor;
}

/**
 * Returns sign prefix for display values.
 */
export function getSignPrefix(value: number): string {
  return value >= 0 ? '+' : '';
}
