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
