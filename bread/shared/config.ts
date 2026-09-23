/**
 * Everything about the business that is a number or a name lives here, so a
 * change of price, capacity, day, or hours is a one-line edit in one file.
 * Both the browser and the Netlify functions import this file.
 */

export const SHOP_NAME = 'Fresh Bread'
/** One line under the name on the order page. */
export const TAGLINE = 'Baked to order, paid up front, picked up on your way out.'
/** Where the site lives — for social previews and absolute links. */
export const SITE_URL = 'https://bread-pickup.netlify.app'

/** Where customers collect. Shown on the order page and the confirmation. */
export const PICKUP_PLACE = 'Life Time Fridley'
/** Where inside the place to go. */
export const PICKUP_PLACE_WHERE = 'the front desk'
/**
 * Life Time is only where the hand-over happens. Nothing on the site may
 * suggest the gym runs, sells or endorses the bread; this sentence appears
 * wherever the place is named prominently.
 */
export const PICKUP_PLACE_NOTE = `${PICKUP_PLACE} is the pickup spot only — this bread is not sold by, or affiliated with, the gym.`

export type ProductId = 'sourdough' | 'banana'

export interface Product {
  id: ProductId
  /**
   * A photo of her bread, as a path under public/ (e.g. '/bread/sourdough.jpg').
   * Absent, the page shows a clearly-placeholder illustration and says so.
   */
  image?: string
  name: string
  blurb: string
  /** What is in it, in her words — shown on the order page so anyone with an allergy can check. */
  ingredients: string
  priceCents: number
  /** How many she can make for one pickup day. */
  capacityPerDay: number
}

export const PRODUCTS: readonly Product[] = [
  { id: 'sourdough', name: 'Sourdough', blurb: 'A full loaf', ingredients: 'Flour, water, salt, sourdough starter.', priceCents: 500, capacityPerDay: 3 },
  {
    id: 'banana',
    name: 'Banana bread',
    blurb: 'Small loaf',
    ingredients: 'Bananas, brown sugar, vanilla, eggs, sourdough starter, flour, baking soda, salt, milk, neutral oil, butter.',
    priceCents: 300,
    capacityPerDay: 4,
  },
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

/**
 * Orders close at ORDER_CUTOFF_HOUR on the calendar day ORDER_CUTOFF_DAYS_BEFORE
 * the pickup, Chicago wall-clock time. Biz, 2026-09-23: "5 PM the day before
 * pickup. So Monday closes Sunday at 5, Wednesday closes Tuesday at 5, and
 * Thursday closes Wednesday at 5." (It was 48 hours before the shift.)
 */
export const ORDER_CUTOFF_DAYS_BEFORE = 1
export const ORDER_CUTOFF_HOUR = 17

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
 * Where a Zelle payment goes, and the name to expect it from — the manual
 * path only; customers pay by card. ZELLE_NAME is empty until she gives her
 * name as it appears on Zelle: the page shows the handle alone rather than
 * a placeholder, and nothing about Zelle is sent on a card order at all.
 */
export const ZELLE_NAME = ''
export const ZELLE_HANDLE = '(612) 703-8698'

/** Her number, on the site for customer questions and order problems (Biz, 2026-09-23). */
export const CONTACT_PHONE = '(612) 703-8698'
export const CONTACT_PHONE_TEL = 'tel:+16127038698'

/**
 * Her policy (2026-09-23): no refunds for a missed pickup — she brings the
 * bread to the club on her next shift instead. Deliberately about a missed
 * pickup only, not "all sales final": if she ever has to cancel, the site has
 * not promised a customer they cannot get their money back.
 */
export const MISSED_PICKUP = `Can't make your pickup? No refunds — but text ${CONTACT_PHONE} and she'll bring your bread to ${PICKUP_PLACE} on her next shift.`

/**
 * Reservation abuse. A checkout is free and holds bread for up to
 * SESSION_MINUTES + STRIPE_HOLD_MARGIN_MINUTES, so one client must not be
 * able to hold the shop with requests alone. Per address, in the database
 * (function instances share no memory): at most this many checkouts in the
 * window, and at most this many card orders on hold at once. The numbers
 * leave room for several customers behind one gym Wi-Fi address; they are
 * a ceiling on abuse, not a guess at real traffic.
 */
export const CHECKOUT_WINDOW_MINUTES = 15
export const MAX_CHECKOUTS_PER_IP = 12
export const MAX_LIVE_HOLDS_PER_IP = 4
/**
 * A reserved card order is checked with Stripe at most this often from the
 * customer's page: two polls a second apart share one answer, so a page
 * being hammered cannot turn into a Stripe call per request.
 */
export const RECONCILE_MIN_INTERVAL_MS = 1_000

/** What an order of these quantities costs. */
export function totalCents(qty: Record<ProductId, number>): number {
  return PRODUCTS.reduce((sum, p) => sum + (qty[p.id] ?? 0) * p.priceCents, 0)
}

export function formatMoney(cents: number): string {
  const dollars = cents / 100
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}
