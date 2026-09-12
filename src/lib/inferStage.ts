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
