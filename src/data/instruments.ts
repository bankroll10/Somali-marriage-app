/**
 * The four questionnaires, and the one bit that says a person began one.
 *
 * Every instrument in this product is all-or-nothing: `buildRead` and
 * `buildBeforeYes` return null unless every question is answered, and the map
 * exists only once the intake completes. So a rung is recorded when someone
 * *finishes*, and until now nothing at all was recorded when someone started.
 * A six-of-eleven read and a zero-of-eleven read were byte-identical in every
 * store, which made the most basic question about a questionnaire —
 * is it too long? — impossible to ask. See docs/EXPERIMENTS.md.
 *
 * This is the denominator. One bit per instrument per person, for ever: she
 * began the read. Not how far she got, not how long she took, not how many
 * times she came back — the merge is a union, so a count of openings is
 * structurally uncomputable, the same way the tally shapes elsewhere make a
 * desirability count uncomputable. The completion side is already a rung, so
 * `rungs.read / began.read` is the whole experiment.
 *
 * `couple` is his side of the two-sided eleven — a man arriving cold on a link
 * she sent. It is the one that matters most: if men open it and abandon it,
 * the readout would otherwise say "words do not travel" when the truth is "the
 * eleven is too long for someone with no map." His finishing writes his own
 * `beforeYes`, so his completion shows as the `eleven` rung on his device.
 *
 * Must match netlify/shared/vocab.ts INSTRUMENTS.
 */
export type Instrument = 'map' | 'read' | 'eleven' | 'couple'

export const INSTRUMENT_IDS: Instrument[] = ['map', 'read', 'eleven', 'couple']

/** What each one is, for the readout. Never shown to a member. */
export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  map: 'The map — the thirteen questions',
  read: 'A read on someone',
  eleven: 'Before you say yes',
  couple: 'His side of the eleven',
}
