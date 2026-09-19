import { PRODUCTS, TIMEZONE, type ProductId } from '../../shared/config.ts'
import type { DayAvailability, Qty } from '../../shared/types.ts'
import { formatYmd } from '../../shared/zoned.ts'

/**
 * The customer page's rules, as pure functions the page and the tests share.
 * None of these change the cart on their own: the page only ever changes a
 * quantity when the customer taps a stepper or "Reduce to what fits".
 */

export interface Short {
  id: ProductId
  asked: number
  free: number
}

export type Fit = { ok: true } | { ok: false; short: Short[] }

/** Does this whole cart fit on this day? Reports every line that does not. */
export function fit(day: DayAvailability, qty: Qty): Fit {
  const short = PRODUCTS.filter((p) => qty[p.id] > day.remaining[p.id]).map((p) => ({ id: p.id, asked: qty[p.id], free: day.remaining[p.id] }))
  return short.length ? { ok: false, short } : { ok: true }
}

export const hasBread = (qty: Qty) => PRODUCTS.some((p) => qty[p.id] > 0)

/**
 * blocked   the baker closed the day
 * closed    ordering has closed (the deadline, less the half hour a card payment needs)
 * sold_out  nothing free and nothing held: it really is gone
 * held_only nothing free, but some is mid-payment and may come back
 * short     with the current cart: it does not all fit
 * ok        orderable (with an empty cart: at least something is free)
 */
export type DayState = 'blocked' | 'closed' | 'sold_out' | 'held_only' | 'short' | 'ok'

export function dayState(day: DayAvailability, qty: Qty): DayState {
  if (day.blocked) return 'blocked'
  if (!day.open) return 'closed'
  const nothingFree = PRODUCTS.every((p) => day.remaining[p.id] === 0)
  if (nothingFree) return PRODUCTS.some((p) => day.held[p.id] > 0) ? 'held_only' : 'sold_out'
  if (hasBread(qty) && !fit(day, qty).ok) return 'short'
  return 'ok'
}

export const selectable = (state: DayState) => state === 'ok' || state === 'short'

export type ProductState = { kind: 'plenty' } | { kind: 'low'; free: number } | { kind: 'sold_out' } | { kind: 'held'; held: number }

/** One product on one day. A product being sold out never touches the other product. */
export function productState(day: DayAvailability, id: ProductId, capacity: number): ProductState {
  const free = day.remaining[id]
  if (free === 0) return day.held[id] > 0 ? { kind: 'held', held: day.held[id] } : { kind: 'sold_out' }
  if (free < capacity) return { kind: 'low', free }
  return { kind: 'plenty' }
}

/** The explicit adjustment, taken only when the customer asks for it. */
export function reduceToFit(qty: Qty, day: DayAvailability): Qty {
  const out = { ...qty }
  for (const p of PRODUCTS) out[p.id] = Math.min(qty[p.id], day.remaining[p.id])
  return out
}

/** Days that could take this cart, nearest first. */
export function daysThatFit(days: readonly DayAvailability[], qty: Qty): DayAvailability[] {
  return days.filter((d) => dayState(d, qty) === 'ok')
}

const name = (id: ProductId, n: number) => {
  const p = PRODUCTS.find((x) => x.id === id)!
  return `${n} ${p.name.toLowerCase()}`
}

/** "only 1 banana bread free (you asked for 2)". */
export function shortCopy(short: Short[]): string {
  return short.map((s) => (s.free === 0 ? `no ${PRODUCTS.find((p) => p.id === s.id)!.name.toLowerCase()} free (you asked for ${s.asked})` : `only ${name(s.id, s.free)} free (you asked for ${s.asked})`)).join(' and ')
}

/** "2 sourdough · 1 banana bread". */
export function linesCopy(qty: Qty): string {
  return PRODUCTS.filter((p) => qty[p.id] > 0)
    .map((p) => name(p.id, qty[p.id]))
    .join(' · ')
}

/** "Monday, September 21" — with the year once it is not this year, or whenever asked. */
export function longDate(ymd: string, today: string, year: 'auto' | 'always' = 'auto'): string {
  const withYear = year === 'always' || ymd.slice(0, 4) !== today.slice(0, 4)
  return formatYmd(ymd, withYear ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : { weekday: 'long', month: 'long', day: 'numeric' })
}

/** "Saturday, September 19 at 5:00 PM" in Chicago time, the way the deadline is really counted. */
export function deadlineCopy(cutoffAt: string, today: string): string {
  const ms = Date.parse(cutoffAt)
  const opts: Intl.DateTimeFormatOptions = { timeZone: TIMEZONE, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms)
  if (ymd.slice(0, 4) !== today.slice(0, 4)) opts.year = 'numeric'
  return new Intl.DateTimeFormat('en-US', opts).format(ms).replace(', ', ', ').replace(/ at /, ' at ').replace(/(\d{4}|\d{1,2}) (\d{1,2}:\d{2})/, '$1 at $2')
}

/** What a customer sees for each thing the server can refuse. */
export const ERROR_COPY: Record<string, string> = {
  sold_out: 'That just sold down while you were deciding. The counts below are fresh.',
  blocked: 'That day has just been closed by the baker. Please pick another.',
  closed: 'Ordering for that day has closed. Please pick another.',
  closing_soon: 'Card payment for that day has closed — payment must be complete by the deadline, and the payment page needs half an hour. Please pick another day.',
  payments_not_configured: 'Card payment is not switched on yet. Please check back soon.',
  payment_unavailable: 'Your bread is held for you, but the payment page could not be opened just now. Nothing was charged — tap Pay again in a moment.',
  offline: 'No connection. Nothing was charged — check your signal and try again.',
  busy: 'Very busy right now — please try again in a moment.',
  unavailable: 'Something went wrong on our side. Nothing was charged — please try again.',
  bad_phone: 'Please enter a 10-digit US phone number.',
  bad_name: 'Please enter your name.',
  bad_quantity: 'That quantity is not available. Please adjust your order.',
  bad_product: 'One of those breads is not on sale right now. Please refresh.',
  bad_date: 'That day is not one of the pickup days. Please pick another.',
  empty: 'Choose at least one loaf to start.',
}
