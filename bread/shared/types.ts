import type { ProductId } from './config.ts'

/** Quantity of each product. Every key present, zero when none. */
export type Qty = Record<ProductId, number>

/**
 * reserved: bread held, awaiting her confirmation of the Zelle.
 * paid: confirmed; counts toward what she bakes.
 * expired: the hold lapsed unconfirmed; units went back into the pool.
 * cancelled: she cancelled the reservation herself.
 * An expired or cancelled order can still become paid (a late Zelle) if the
 * bread is still there, or if she chooses to bake extra.
 */
export type OrderStatus = 'reserved' | 'paid' | 'expired' | 'cancelled'

export type PaymentProvider = 'zelle' | 'stripe'

/**
 * What happened to the bread, separately from what happened to the money.
 * owed: paid for and still to be handed over (this is what she bakes).
 * picked_up: handed over.
 * cancelled: she decided this customer will not be getting bread — a refund,
 * if any, is a separate matter recorded from Stripe, and whether the units
 * went back on sale is her explicit call (restockedAt).
 */
export type Fulfillment = 'owed' | 'picked_up' | 'cancelled'

export interface Order {
  id: string
  provider: PaymentProvider
  date: string
  name: string
  /** Ten digits, as typed by a US customer with the formatting stripped. */
  phone: string
  qty: Qty
  amountCents: number
  status: OrderStatus
  createdAt: string
  /** ISO instant. Past this an unconfirmed order's hold is released. */
  holdExpiresAt: string
  paidAt?: string
  pickedUpAt?: string
  /** She confirmed this past capacity and agreed to bake the extra. */
  forced?: boolean
  fulfillment: Fulfillment
  fulfillmentNote?: string
  fulfillmentChangedAt?: string
  /** The cancelled order's units were returned to the pool at this instant. */
  restockedAt?: string
  /** Refunds Stripe has completed / still has in flight, mirrored. Zero for a cash or Zelle order. */
  refundedCents: number
  refundPendingCents: number
}

/** What the order page needs to know about one date. */
export interface DayAvailability {
  date: string
  blocked: boolean
  /** ISO instant after which no order may be placed. */
  cutoffAt: string
  /** False once the cutoff has passed. */
  open: boolean
  /** Free to order right now. */
  remaining: Qty
  /** Reserved by someone mid-payment right now — not free, but not sold either. Counts only. */
  held: Qty
}

export interface AvailabilityResponse {
  now: string
  products: PublicProduct[]
  days: DayAvailability[]
}

export interface CheckoutRequest {
  date: string
  qty: Partial<Qty>
  name: string
  phone: string
  /** A v4 UUID the browser makes once per Reserve tap, so a retried request cannot reserve twice. */
  checkoutKey: string
}

export interface CheckoutResponse {
  orderId: string
  shortId: string
  date: string
  qty: Qty
  amountCents: number
  holdExpiresAt: string
  /** True when this request repeated an earlier one and no new bread was reserved — or when this phone number already had a live hold, which is returned instead. */
  replayed: boolean
  /** Stripe's hosted payment page for this order. Absent for Zelle. */
  url?: string
}

/** A product as the server sells it — the browser displays these, the server never trusts the browser's copy. */
export interface PublicProduct {
  id: ProductId
  name: string
  blurb: string
  priceCents: number
  capacityPerDay: number
}

/** The confirmation page's view of an order — no phone, nothing to leak. */
export interface OrderSummary {
  id: string
  shortId: string
  date: string
  name: string
  qty: Qty
  amountCents: number
  status: OrderStatus
  provider: PaymentProvider
  /** For a card order that is still reserved: Stripe has not yet confirmed either way. */
  checking: boolean
  /** A payment arrived that needs her attention before the order can be confirmed. */
  attention: boolean
  holdExpiresAt: string
  /** Where to send a Zelle payment. Only on a Zelle order; a card order carries nothing about Zelle. */
  zelle?: { name: string; handle: string }
}

export interface PaymentException {
  id: number
  orderId: string
  sessionId: string | null
  kind: string
  detail: Record<string, unknown>
  createdAt: string
}

export interface AdminOrder extends Order {
  shortId: string
  /** Open payment exceptions on this order. */
  exceptions: PaymentException[]
  /** The payment in Stripe's Dashboard, where refunds are issued. Card orders that reached a payment only. */
  stripeUrl?: string
  /** Were this paid order cancelled and restocked now, could anyone buy the units? False on a blocked or closed date. */
  resellableIfRestocked: boolean
}

export interface AdminDay {
  date: string
  blocked: boolean
  blockedReason?: string
  cutoffAt: string
  /** Customers can still order this date right now. */
  open: boolean
  capacity: Qty
  /** Paid and still owed: what she bakes. */
  toBake: Qty
  /** Reserved, unpaid, still live: on Stripe's page, or awaiting a Zelle. */
  held: Qty
  remaining: Qty
  activeCheckouts: number
  orders: AdminOrder[]
}

export interface AdminResponse {
  now: string
  today: string
  nextPickupDate: string
  days: AdminDay[]
}

/** What a block or unblock touched — nothing — and what it left on the date. */
export interface AdminBlockResult {
  day: AdminDay
  affected: { owed: AdminOrder[]; holds: AdminOrder[] }
}

export interface AdminSession {
  token: string
  expiresAt: string
}

export type AdminAction =
  | { action: 'block'; date: string; reason?: string }
  | { action: 'unblock'; date: string }
  | { action: 'pickedUp'; orderId: string; pickedUp: boolean }
  | { action: 'markPaid'; orderId: string; force?: boolean }
  | { action: 'cancel'; orderId: string }
  | { action: 'cancelPaid'; orderId: string; restock: boolean; note?: string }
  | { action: 'syncRefund'; orderId: string }
  | { action: 'resolveException'; orderId: string; exceptionId: number }

export function zeroQty(): Qty {
  return { sourdough: 0, banana: 0 }
}

/** Orders are identified by a long id; humans get the first six characters. */
export function shortId(id: string): string {
  return id.slice(0, 6).toUpperCase()
}
