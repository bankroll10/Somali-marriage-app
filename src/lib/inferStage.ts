import type { Stage } from '../types'

/**
 * What an instrument says about where she is.
 *
 * The read-first user — Welcome's second door, `/?read&via=group` — used to
 * have no Home: `stage` stayed at its default of `preparing`, `hasHome` reads
 * `completed || stage !== 'preparing'`, so Back returned her to Welcome, the
 * next visit opened Welcome, and the follow-up her read had just written (the
 * only question this product asks about her life, and the North Star's
 * numerator) rendered nowhere, because it renders only on Home. The metric
 * for the one user the wedge is built around read zero by construction
 * (docs/BOARD.md).
 *
 * The instrument is the answer to the situation question. A read is eleven
 * questions about someone she is talking to; the eleven is what a couple asks
 * before saying yes. So finishing one, with nothing else said, is taken as
 * `talking` or `deciding`. Only when she has said nothing: `situated` stays
 * false — she did not answer the question, the product inferred it, and the
 * ladder's `situated` rung stays honest — and an explicit stage is never
 * overridden.
 */
export type Instrument = 'read' | 'eleven'

export function stageAfterInstrument(kind: Instrument, stage: Stage, situated: boolean): Stage | undefined {
  if (situated || stage !== 'preparing') return undefined
  return kind === 'read' ? 'talking' : 'deciding'
}

/** Who has a Home: anyone with a map, and anyone who has said where she is. */
export function hasHomeFor(i: { completed: boolean; stage: Stage }): boolean {
  return i.completed || i.stage !== 'preparing'
}

/**
 * Where the situation question lands when she says she is married.
 *
 * `setStage` opens the ending for someone arriving married with no record of
 * it, and that has to win over the guide: `chooseSituation` used to call
 * `openGuide` unconditionally for this stage, which overwrote the screen and
 * left the ending — the one screen built for this moment — unreachable from
 * the only place a person says they are married. What she met instead was an
 * empty compose box she had to write into before the product would say
 * anything (docs/AUDIT.md §6, measured in docs/VALUE.md).
 */
export function marriedOpensEnding(from: Stage, hasEnding: boolean): boolean {
  return from !== 'married' && !hasEnding
}
