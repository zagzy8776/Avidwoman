/**
 * Money formatting — one place, so the storefront and the admin console can
 * never print a different symbol for the same figure.
 *
 * The house trades in Naira; the other codes are here so a product or an order
 * priced in a foreign currency still reads correctly instead of printing a
 * dollar sign in front of a Naira amount.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
}

/** The symbol for a currency code, defaulting to Naira. */
export function currencySymbol(currency?: string | null): string {
  return CURRENCY_SYMBOLS[currency ?? 'NGN'] ?? '₦'
}

/** Money for display, e.g. money(285000) -> "₦285,000". */
export function money(amount: number, currency?: string | null): string {
  return `${currencySymbol(currency)}${amount.toLocaleString()}`
}