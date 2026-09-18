/**
 * Everything about the business that is a number or a name lives here, so a
 * change of price, capacity, day, or hours is a one-line edit in one file.
 * Both the browser and the Netlify functions import this file.
 */

export const SHOP_NAME = 'Fresh Bread'

/** Where customers collect. Shown on the order page and the confirmation. */
export const PICKUP_PLACE = 'Life Time'

export type ProductId = 'sourdough' | 'banana'

export interface Product {
  id: ProductId
  name: string
  blurb: string
  priceCents: number
  /** How many she can make for one pickup day. */
  capacityPerDay: number
}

export const PRODUCTS: readonly Product[] = [
  { id: 'sourdough', name: 'Sourdough', blurb: 'A full loaf', priceCents: 500, capacityPerDay: 3 },
  { id: 'banana', name: 'Banana bread', blurb: 'Small loaf', priceCents: 300, capacityPerDay: 4 },
]

export const PRODUCT_IDS: readonly ProductId[] = PRODUCTS.map((p) => p.id)

export function product(id: ProductId): Product {
  const found = PRODUCTS.find((p) => p.id === id)
  if (!found) throw new Error(`unknown product ${id}`)
  return found
}

/** All times are wall-clock in this zone. Life Time is a Minnesota company. */
export const TIMEZONE = 'America/Chicago'

/** 0 = Sunday … 6 = Saturday. Monday, Wednesday, Thursday. */
export const PICKUP_WEEKDAYS: readonly number[] = [1, 3, 4]

/** Her shift: 5–11 PM. */
export const PICKUP_START_HOUR = 17
export const PICKUP_END_HOUR = 23
export const PICKUP_PREFERRED_AFTER_HOUR = 21

/** Orders close this many hours before the shift starts on the pickup date. */
export const ORDER_CUTOFF_HOURS = 48

/** How far ahead customers can pick a date. */
export const WEEKS_AHEAD = 4

/**
 * There is no payment processor — she is paid by Zelle, outside the app, and
 * confirms each order herself in /admin. A hold protects a customer's bread
 * only until this many hours pass, then it is released automatically. Long
 * enough that she can reasonably notice during a shift; short enough that one
 * customer who never sends the Zelle can't sit on the day's only sourdough
 * all day. One constant to change if three hours is wrong for her.
 */
export const PAYMENT_HOLD_HOURS = 3

/**
 * Card checkout (Stripe-hosted). Stripe cannot make a session shorter than
 * 30 minutes, and payment must be complete by the displayed ordering
 * deadline, so card checkout must START at least this many minutes before
 * the cutoff (the extra two absorb clock skew between us and Stripe). The
 * session then expires at the cutoff or after SESSION_MINUTES, whichever is
 * sooner, never below SESSION_MIN_MINUTES.
 */
export const CARD_CHECKOUT_LEAD_MINUTES = 32
export const SESSION_MINUTES = 45
export const SESSION_MIN_MINUTES = 31
/** How long after a session's own expiry we wait before asking Stripe whether it really is dead. */
export const STRIPE_HOLD_MARGIN_MINUTES = 10

/**
 * Where customers send payment, and the name to expect it from. ZELLE_NAME is
 * still a placeholder — fill it in with her real name as it appears on Zelle
 * before this goes live, or every order page will show a fake one.
 */
export const ZELLE_NAME = '<her name on Zelle>'
export const ZELLE_HANDLE = '(612) 703-8698'

/** What an order of these quantities costs. */
export function totalCents(qty: Record<ProductId, number>): number {
  return PRODUCTS.reduce((sum, p) => sum + (qty[p.id] ?? 0) * p.priceCents, 0)
}

export function formatMoney(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}
