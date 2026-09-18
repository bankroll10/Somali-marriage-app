import type { ProductId } from './config.ts'

/** Quantity of each product. Every key present, zero when none. */
export type Qty = Record<ProductId, number>

export interface Hold {
  orderId: string
  qty: Qty
  /** ISO instant. Past this the hold no longer counts against capacity. */
  expiresAt: string
}

/** One pickup date's inventory. Written only with an etag check. */
export interface DayRecord {
  date: string
  blocked: boolean
  holds: Hold[]
  sold: Qty
  /** Paid orders for this date, oldest first. */
  orderIds: string[]
}

export type OrderStatus = 'pending' | 'paid' | 'expired'

export interface Order {
  id: string
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
}

/** What the order page needs to know about one date. */
export interface DayAvailability {
  date: string
  blocked: boolean
  /** ISO instant after which no order may be placed. */
  cutoffAt: string
  /** False once the cutoff has passed. */
  open: boolean
  remaining: Qty
}

export interface AvailabilityResponse {
  now: string
  days: DayAvailability[]
}

export interface CheckoutRequest {
  date: string
  qty: Partial<Qty>
  name: string
  phone: string
}

export interface CheckoutResponse {
  orderId: string
  shortId: string
  date: string
  qty: Qty
  amountCents: number
  holdExpiresAt: string
  zelle: { name: string; handle: string }
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
  holdExpiresAt: string
  zelle: { name: string; handle: string }
}

export interface AdminOrder extends Order {
  shortId: string
}

export interface AdminDay {
  date: string
  blocked: boolean
  cutoffAt: string
  toBake: Qty
  remaining: Qty
  orders: AdminOrder[]
}

export interface AdminResponse {
  now: string
  days: AdminDay[]
}

export type AdminAction =
  | { action: 'block'; date: string }
  | { action: 'unblock'; date: string }
  | { action: 'pickedUp'; orderId: string; pickedUp: boolean }
  | { action: 'markPaid'; orderId: string; force?: boolean }
  | { action: 'expireOrder'; orderId: string }

export function zeroQty(): Qty {
  return { sourdough: 0, banana: 0 }
}

/** Orders are identified by a long id; humans get the first six characters. */
export function shortId(id: string): string {
  return id.slice(0, 6).toUpperCase()
}
