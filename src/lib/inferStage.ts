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
 * (docs/DECISIONS.md).
 *
 * Finishing either instrument, with nothing else said, is taken as `talking`:
 * she is talking to someone. Never further. The eleven used to be taken as
 * `deciding`, so a stranger curious about the list, or a man who had only
 * answered her link, was placed at "Deciding together" without choosing it:
 * the guide was told they were deciding, the deciding-only family words
 * appeared, and the `deciding` rung, the product's one measure of an explicit
 * decision, counted a tool being used (docs/DECISIONS.md, the commitment
 * audit). Sliding into a more consequential state is what this product exists
 * to help people notice; it must not do it to them. Moving to *deciding* is
 * her own tap on the stage band. Only when she has said nothing: `situated`
 * stays false, and an explicit stage is never overridden.
 */
export type Instrument = 'read' | 'eleven'

export function stageAfterInstrument(_kind: Instrument, stage: Stage, situated: boolean): Stage | undefined {
  if (situated || stage !== 'preparing') return undefined
  return 'talking'
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
 * anything (docs/DECISIONS.md (AUDIT) §6, measured in docs/DESIGN.md).
 */
export function marriedOpensEnding(from: Stage, hasEnding: boolean): boolean {
  return from !== 'married' && !hasEnding
}
