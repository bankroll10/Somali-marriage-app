import {
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

/** A date customers may still order for, ignoring capacity and blocks. */
export function isOrderable(ymd: string, nowMs: number): boolean {
  return isPickupDay(ymd) && nowMs < cutoffFor(ymd)
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
