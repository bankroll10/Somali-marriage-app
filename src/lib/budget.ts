/**
 * The guide's budget — and the rule behind it.
 *
 * Every reply costs money to run, so there has to be a limit somewhere. The
 * question is what refills it. A calendar month refills it for doing nothing,
 * and the paid tier that lifted it earned most from the member having the
 * worst night. This refills it for progress: every step she takes on the
 * ladder — she said what was happening, built a map, took a read, went
 * through the eleven, asked him, he answered, she had the conversation — and
 * every follow-up she answers, whichever way it went, grants a fixed number of
 * replies.
 *
 * Progress is something she did, never a stage she said. `deciding` and
 * `married` used to count, read from the stage she is at now: saying "we're
 * deciding" bought fifteen replies, and ending a courtship took them back, on
 * the night she might most need them. A product that says "only you decide
 * this" and "it ended, that is allowed" cannot pay for one direction
 * (docs/DECISIONS.md Part 14). The readout's rungs are unchanged.
 *
 * So to talk to the guide more, you do the next thing. And the guide, whose
 * replies end on the act of saying the words, is what moves you. There is no
 * counter on screen and nothing to buy; when the budget is spent, the wall
 * points at the instruments, because they are what refills it.
 *
 * Pure. The rungs and the answered follow-ups are passed in.
 */

/**
 * Replies granted for every step on the ladder and every follow-up answered.
 * Fifteen is enough for a real conversation about one real thing; the next
 * fifteen come from doing the thing.
 */
export const REPLIES_PER_STEP = 15

/** Rungs that are a stage she says, not a thing she did. They grant nothing. */
const SAID: readonly string[] = ['deciding', 'married']

/** How many of her rungs count toward the budget: the ones she did. */
export function budgetRungs(rungs: readonly string[]): number {
  return rungs.filter((r) => !SAID.includes(r)).length
}

export function guideBudget(rungsReached: number, followUpsAnswered: number): number {
  return REPLIES_PER_STEP * (Math.max(0, rungsReached) + Math.max(0, followUpsAnswered))
}

/** What she has left. Never negative; a rung that reads as un-reached again cannot put her in debt. */
export function repliesLeft(rungsReached: number, followUpsAnswered: number, spent: number): number {
  return Math.max(0, guideBudget(rungsReached, followUpsAnswered) - Math.max(0, spent))
}
