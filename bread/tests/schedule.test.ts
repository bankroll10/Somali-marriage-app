import { describe, expect, it } from 'vitest'
import { cutoffFor, isOrderable, isPickupDay, pickupDates } from '../shared/schedule.ts'

// Chicago is UTC−5 in September. "Local" below means Chicago.
const local = (y: number, m: number, d: number, h: number, min = 0) => Date.UTC(y, m - 1, d, h + 5, min)

describe('pickup schedule', () => {
  it('is Monday, Wednesday and Thursday', () => {
    expect(['2026-09-21', '2026-09-23', '2026-09-24'].every(isPickupDay)).toBe(true)
    expect(['2026-09-20', '2026-09-22', '2026-09-25', '2026-09-26'].some(isPickupDay)).toBe(false)
  })

  it('closes orders 48 hours before the 5 PM shift', () => {
    // Monday Sep 21 → cutoff Saturday Sep 19, 5:00 PM.
    expect(cutoffFor('2026-09-21')).toBe(local(2026, 9, 19, 17))
    expect(isOrderable('2026-09-21', local(2026, 9, 19, 16, 59))).toBe(true)
    expect(isOrderable('2026-09-21', local(2026, 9, 19, 17, 0))).toBe(false)
    expect(isOrderable('2026-09-21', local(2026, 9, 19, 17, 1))).toBe(false)
    // A Tuesday is never orderable, however early.
    expect(isOrderable('2026-09-22', local(2026, 9, 1, 9))).toBe(false)
  })

  it('lists the coming weeks from today in Chicago, including today', () => {
    // Friday Sep 18 at 11 PM Chicago is already Saturday in UTC.
    const days = pickupDates(local(2026, 9, 18, 23), 1)
    expect(days).toEqual(['2026-09-21', '2026-09-23', '2026-09-24'])
    // On a Monday the list starts with that Monday (closed, but shown).
    expect(pickupDates(local(2026, 9, 21, 9), 1)[0]).toBe('2026-09-21')
    expect(pickupDates(local(2026, 9, 21, 9), 4)).toHaveLength(12)
  })
})
