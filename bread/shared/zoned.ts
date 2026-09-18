/**
 * Wall-clock time in one IANA zone, with nothing but Intl. Enough for "5 PM on
 * this date in Chicago" and "what date is it in Chicago right now", including
 * across daylight-saving changes.
 */

export interface ZonedParts {
  year: number
  month: number // 1–12
  day: number
  hour: number
  minute: number
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    })
    formatters.set(tz, f)
  }
  return f
}

export function partsInZone(epochMs: number, tz: string): ZonedParts {
  const out: Record<string, string> = {}
  for (const p of formatter(tz).formatToParts(new Date(epochMs))) out[p.type] = p.value
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    weekday: WEEKDAYS.indexOf(out.weekday),
  }
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** "YYYY-MM-DD" for the calendar date it is in `tz` at that instant. */
export function ymdInZone(epochMs: number, tz: string): string {
  const p = partsInZone(epochMs, tz)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

export function isYmd(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  return new Date(t).getUTCMonth() === m - 1 && new Date(t).getUTCDate() === d
}

function utcOf(ymd: string, hour = 0, minute = 0): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d, hour, minute)
}

/** The instant at which it is `hour:minute` on `ymd` in `tz`. */
export function zonedEpoch(ymd: string, hour: number, tz: string, minute = 0): number {
  const wanted = utcOf(ymd, hour, minute)
  const offsetAt = (t: number) => {
    const p = partsInZone(t, tz)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - t
  }
  // Guess as if the zone were UTC, then correct by the zone's offset at the
  // guess; a second pass settles the rare case where the correction itself
  // crosses a DST boundary.
  let t = wanted - offsetAt(wanted)
  t = wanted - offsetAt(t)
  return t
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(utcOf(ymd) + n * 86_400_000)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

/** 0 = Sunday … 6 = Saturday, for a calendar date. */
export function weekdayOf(ymd: string): number {
  return new Date(utcOf(ymd)).getUTCDay()
}

/** "Mon, Sep 21" — a calendar date, so no zone can shift it. */
export function formatYmd(ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(new Date(utcOf(ymd)))
}

/** "Sat, Sep 19 at 5:00 PM" for an instant, in the shop's zone. */
export function formatInstant(epochMs: number, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(epochMs)).replace(', ', ', ').replace(/(\d), (\d)/, '$1 at $2')
}
