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
 * Where customers send payment, and the name to expect it from. Both are
 * placeholders — fill these in with her real Zelle details before this goes
 * live, or every order page will show fake ones.
 */
export const ZELLE_NAME = '<her name on Zelle>'
export const ZELLE_HANDLE = '<the email or phone her Zelle is registered to>'

/** What an order of these quantities costs. */
export function totalCents(qty: Record<ProductId, number>): number {
  return PRODUCTS.reduce((sum, p) => sum + (qty[p.id] ?? 0) * p.priceCents, 0)
}

export function formatMoney(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}
