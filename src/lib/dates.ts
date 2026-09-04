/**
 * Local calendar-day keys. These lived in data/checkin.ts, which is gone —
 * the daily check-in was a streak with the guilt filed off — but the map, the
 * work card and the reflection all date things by the local day.
 */

/** Local-date key so a record belongs to a calendar day. */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Date key for n days ago (n=0 → today). */
export function dayKey(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return todayKey(d)
}
