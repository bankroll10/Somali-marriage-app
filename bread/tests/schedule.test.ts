import { describe, expect, it } from 'vitest'
import { cutoffFor, isInWindow, isOrderable, isPickupDay, pickupDates, pickupStart } from '../shared/schedule.ts'
import { addDays, partsInZone } from '../shared/zoned.ts'

// Chicago is UTC−5 in September. "Local" below means Chicago.
const local = (y: number, m: number, d: number, h: number, min = 0) => Date.UTC(y, m - 1, d, h + 5, min)

describe('pickup schedule', () => {
  it('is Monday, Wednesday and Thursday', () => {
    expect(['2026-09-21', '2026-09-23', '2026-09-24'].every(isPickupDay)).toBe(true)
    expect(['2026-09-20', '2026-09-22', '2026-09-25', '2026-09-26'].some(isPickupDay)).toBe(false)
  })

  it('closes orders at 5 PM the day before pickup (Biz, 2026-09-23)', () => {
    // Monday closes Sunday at 5, Wednesday closes Tuesday at 5, Thursday closes Wednesday at 5.
    expect(cutoffFor('2026-09-21')).toBe(local(2026, 9, 20, 17))
    expect(cutoffFor('2026-09-23')).toBe(local(2026, 9, 22, 17))
    expect(cutoffFor('2026-09-24')).toBe(local(2026, 9, 23, 17))
    expect(isOrderable('2026-09-21', local(2026, 9, 20, 16, 59))).toBe(true)
    expect(isOrderable('2026-09-21', local(2026, 9, 20, 17, 0))).toBe(false)
    expect(isOrderable('2026-09-21', local(2026, 9, 20, 17, 1))).toBe(false)
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

// Chicago leaves daylight time on Nov 1 2026 and returns on Mar 14 2027.
describe('cutoffs across daylight-saving changes and calendar edges', () => {
  it('is 5 PM on the wall clock the day before, whichever side of a clock change', () => {
    // Clocks go back at 2 AM Sun Nov 1 2026, so Sunday 5 PM is already CST (UTC−6): 23:00Z.
    expect(cutoffFor('2026-11-02')).toBe(Date.UTC(2026, 10, 1, 23))
    expect(partsInZone(cutoffFor('2026-11-02'), 'America/Chicago')).toMatchObject({ month: 11, day: 1, hour: 17, minute: 0 })
    expect(isOrderable('2026-11-02', Date.UTC(2026, 10, 1, 22, 59, 59, 999))).toBe(true)
    expect(isOrderable('2026-11-02', Date.UTC(2026, 10, 1, 23, 0, 0, 0))).toBe(false)
    // Clocks go forward at 2 AM Sun Mar 8 2026 and Sun Mar 14 2027: Sunday 5 PM is CDT (UTC−5).
    expect(cutoffFor('2026-03-09')).toBe(Date.UTC(2026, 2, 8, 22))
    expect(cutoffFor('2027-03-15')).toBe(Date.UTC(2027, 2, 14, 22))
    expect(partsInZone(cutoffFor('2027-03-15'), 'America/Chicago')).toMatchObject({ month: 3, day: 14, hour: 17, minute: 0 })
  })

  it('for every pickup day in a year: 5 PM the previous day, and exactly 24 hours before the shift', () => {
    // Clocks change at 2 AM on a Sunday and pickups are Mon/Wed/Thu, so the span from cutoff to
    // shift never contains a change. If the pickup days ever change, this is what will say so.
    let checked = 0
    for (let d = '2026-09-01'; d < '2027-09-01'; d = addDays(d, 1)) {
      if (!isPickupDay(d)) continue
      const cutoff = cutoffFor(d)
      const [y, m, day] = addDays(d, -1).split('-').map(Number)
      expect(partsInZone(cutoff, 'America/Chicago'), d).toMatchObject({ year: y, month: m, day, hour: 17, minute: 0 })
      expect(pickupStart(d) - cutoff, d).toBe(24 * 3_600_000)
      checked++
    }
    expect(checked).toBeGreaterThan(150)
  })

  it('starts the window from today in Chicago, not today in UTC', () => {
    // 03:00Z on Sep 18 is 10 PM on Thursday Sep 17 in Chicago.
    expect(pickupDates(Date.UTC(2026, 8, 18, 3), 1)[0]).toBe('2026-09-17')
    expect(pickupDates(Date.UTC(2026, 8, 18, 5), 1)[0]).toBe('2026-09-21')
  })

  it('crosses month and year ends', () => {
    const fromDec20 = pickupDates(Date.UTC(2026, 11, 20, 12), 4)
    expect(fromDec20).toContain('2026-12-31')
    expect(fromDec20).toContain('2027-01-04')
    expect(pickupDates(Date.UTC(2027, 1, 26, 12), 1)).toEqual(['2027-03-01', '2027-03-03', '2027-03-04'])
  })

  it('ends the window exactly, and never reaches into the past', () => {
    const now = Date.UTC(2026, 8, 18, 17) // Fri Sep 18, noon Chicago
    expect(isInWindow('2026-10-15', now)).toBe(true) // last Thursday inside 4 weeks
    expect(isInWindow('2026-10-19', now)).toBe(false) // the Monday after
    expect(isInWindow('2026-09-17', now)).toBe(false) // yesterday
    expect(isInWindow('2026-09-14', now)).toBe(false) // last Monday
    expect(isOrderable('2026-09-21', cutoffFor('2026-09-21') - 1)).toBe(true)
    expect(isOrderable('2026-09-21', cutoffFor('2026-09-21'))).toBe(false)
    // On the pickup day itself, orders closed the evening before.
    expect(isOrderable('2026-09-21', Date.UTC(2026, 8, 21, 14))).toBe(false)
  })
})
