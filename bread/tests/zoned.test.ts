import { describe, expect, it } from 'vitest'
import { addDays, formatYmd, isYmd, partsInZone, weekdayOf, ymdInZone, zonedEpoch } from '../shared/zoned.ts'

const TZ = 'America/Chicago'

describe('zoned time', () => {
  it('reads the calendar date in the zone, not in UTC', () => {
    // 11 PM Chicago on Sep 18 is 4 AM UTC on Sep 19.
    const t = Date.UTC(2026, 8, 19, 4, 0)
    expect(ymdInZone(t, TZ)).toBe('2026-09-18')
    expect(ymdInZone(t, 'UTC')).toBe('2026-09-19')
    expect(partsInZone(t, TZ)).toMatchObject({ hour: 23, minute: 0, weekday: 5 })
  })

  it('finds 5 PM on a date, in daylight time and in standard time', () => {
    // CDT is UTC−5, CST is UTC−6.
    expect(zonedEpoch('2026-09-21', 17, TZ)).toBe(Date.UTC(2026, 8, 21, 22, 0))
    expect(zonedEpoch('2026-12-07', 17, TZ)).toBe(Date.UTC(2026, 11, 7, 23, 0))
    // The day the clocks fall back (Nov 1 2026): still 5 PM local.
    expect(partsInZone(zonedEpoch('2026-11-01', 17, TZ), TZ)).toMatchObject({ day: 1, hour: 17 })
    // And the day they spring forward (Mar 8 2026).
    expect(partsInZone(zonedEpoch('2026-03-08', 17, TZ), TZ)).toMatchObject({ day: 8, hour: 17 })
    // Midnight, the classic UTC-offset trap.
    expect(partsInZone(zonedEpoch('2026-09-21', 0, TZ), TZ)).toMatchObject({ day: 21, hour: 0, minute: 0 })
  })

  it('does calendar arithmetic without a zone', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(weekdayOf('2026-09-21')).toBe(1) // Monday
    expect(weekdayOf('2026-09-20')).toBe(0)
    expect(formatYmd('2026-09-21')).toBe('Mon, Sep 21')
  })

  it('validates dates strictly', () => {
    expect(isYmd('2026-09-21')).toBe(true)
    expect(isYmd('2026-02-30')).toBe(false)
    expect(isYmd('2026-9-1')).toBe(false)
    expect(isYmd(20260921)).toBe(false)
  })
})
