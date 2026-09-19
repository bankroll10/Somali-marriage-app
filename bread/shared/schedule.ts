import {
  CARD_CHECKOUT_LEAD_MINUTES,
  ORDER_CUTOFF_HOURS,
  PICKUP_START_HOUR,
  PICKUP_WEEKDAYS,
  TIMEZONE,
  WEEKS_AHEAD,
} from './config.ts'
import { addDays, weekdayOf, ymdInZone, zonedEpoch } from './zoned.ts'

export function isPickupDay(ymd: string): boolean {
  return PICKUP_WEEKDAYS.includes(weekdayOf(ymd))
}

/** The instant the shift starts on a pickup date. */
export function pickupStart(ymd: string): number {
  return zonedEpoch(ymd, PICKUP_START_HOUR, TIMEZONE)
}

/** The last instant an order may be placed for a pickup date. */
export function cutoffFor(ymd: string): number {
  return pickupStart(ymd) - ORDER_CUTOFF_HOURS * 3_600_000
}

/**
 * May a card checkout start for this date right now? Payment must land by
 * the cutoff and Stripe cannot make a session shorter than 30 minutes, so
 * the date closes to new card checkouts CARD_CHECKOUT_LEAD_MINUTES early.
 * The one rule behind the availability list, the admin's "open" flag and
 * the checkout's refusal, so no instant reads open in one place and closed
 * in another.
 */
export function cardCheckoutOpen(ymd: string, nowMs: number): boolean {
  return cutoffFor(ymd) - nowMs > CARD_CHECKOUT_LEAD_MINUTES * 60_000
}

/** A pickup day inside the rolling window as of `nowMs`. Anything else is not a date customers can name. */
export function isInWindow(ymd: string, nowMs: number, weeks = WEEKS_AHEAD): boolean {
  return pickupDates(nowMs, weeks).includes(ymd)
}

/** A date customers may still order for, ignoring capacity and blocks. */
export function isOrderable(ymd: string, nowMs: number): boolean {
  return isInWindow(ymd, nowMs) && nowMs < cutoffFor(ymd)
}

/**
 * Every pickup date from today (in the shop's zone) through `weeks` weeks out.
 * Dates past their cutoff are included — the UI shows them as closed — so the
 * list is stable across the day rather than shrinking underneath a customer.
 */
export function pickupDates(nowMs: number, weeks = WEEKS_AHEAD): string[] {
  const today = ymdInZone(nowMs, TIMEZONE)
  const out: string[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(today, i)
    if (isPickupDay(d)) out.push(d)
  }
  return out
}
