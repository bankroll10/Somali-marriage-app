/**
 * The day, never the moment.
 *
 * Every store used to write millisecond timestamps. Each on its own was
 * harmless; together they were a join. `counted` on the ladder was written in
 * the same second as the door entry, `he-answered` within one poll of the
 * pair's `answeredAt`, `vouched` alongside the vouch's `at` — so anyone holding
 * two stores could line their records up by the clock, and the promise that the
 * install code is not the map code came down to a millisecond. A day is what
 * the Trust screen actually says reaches us ("the step and the date"), and a
 * day is what every readout needs. Nothing here has ever needed the time.
 */
export function day(ms: number = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10)
}

const MOMENT = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/

/**
 * Every timestamp in a value a client wrote, cut to its day. The rule above,
 * applied to the one record this product stores whole — a kept map — which
 * carried millisecond timestamps long after every other store had stopped
 * (docs/PRIVACY.md, C2). Its own join was the same one: a map's `couple.at`
 * and the couple sheet's `createdAt`, lined up by the clock.
 */
export function toDays<T>(value: T): T {
  if (typeof value === 'string') return (value.match(MOMENT)?.[1] ?? value) as T
  if (Array.isArray(value)) return value.map(toDays) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toDays(v)])) as T
  }
  return value
}
