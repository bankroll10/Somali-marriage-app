/**
 * The floor under every small cell.
 *
 * A readout split by city or by door is a table of quasi-identifiers, and a
 * cell of one or two in a city of forty is a person wearing a number. So every
 * cell in such a split that falls under the floor reads as `null` — never as a
 * number, and never omitted, because a missing key is itself a count of
 * zero-to-four with the sign changed.
 *
 * Applied only where a split exists: per-city and per-door rungs, the
 * married-by cross-tabs, a city's hardest parts and ledger. Never to a
 * whole-population count, which combines with nothing — a lone
 * `ending.who.here = 1` is exactly what the operating loop must see. Nor to the
 * door's own women/men count, which is public by design.
 *
 * What this is and is not. Members never see a tally. The founder holds every
 * store and could count by hand, so this does not protect against the founder;
 * it protects against a leaked founder key and against casual inference. And a
 * floored cell beside an unfloored total can be recovered by subtraction when
 * every other cell in the row is shown — OPERATING.md says so, rather than
 * pretend otherwise. It is cheap, it removes the easy read, and the honest
 * sentence on Trust and the day-precision dates do the heavier lifting.
 */

export const K_FLOOR = 5

export type Floored<T extends Record<string, number>> = { [K in keyof T]: number | null }

/** One row of counts, each cell floored on its own. */
export function floor<T extends Record<string, number>>(counts: T, k: number = K_FLOOR): Floored<T> {
  const out = {} as Floored<T>
  for (const key of Object.keys(counts) as (keyof T)[]) out[key] = counts[key] < k ? null : counts[key]
  return out
}

/** A table of rows — city → rung → n — every cell floored. */
export function floorRows<T extends Record<string, number>>(
  rows: Record<string, T>,
  k: number = K_FLOOR,
): Record<string, Floored<T>> {
  const out: Record<string, Floored<T>> = {}
  for (const [row, counts] of Object.entries(rows)) out[row] = floor(counts, k)
  return out
}
