import { REPLIES_PER_STEP } from '../data/plus'

/**
 * The guide's budget — and the rule behind it.
 *
 * Every reply costs money to run, so there has to be a limit somewhere. The
 * question is what refills it. A calendar month refills it for doing nothing,
 * and the paid tier that lifted it earned most from the member having the
 * worst night. This refills it for progress: every step she takes on the
 * ladder — she said what was happening, built a map, took a read, went
 * through the eleven, asked him, he answered, she had the conversation, her
 * family vouched, she is deciding, she is married — and every follow-up she
 * answers, whichever way it went, grants a fixed number of replies.
 *
 * So to talk to the guide more, you move. And the guide, whose replies end
 * on the act of saying the words, is what moves you. There is no counter on
 * screen and nothing to buy; when the budget is spent, the wall points at the
 * instruments, because they are what refills it.
 *
 * Pure. The rungs and the answered follow-ups are passed in.
 */
export function guideBudget(rungsReached: number, followUpsAnswered: number): number {
  return REPLIES_PER_STEP * (Math.max(0, rungsReached) + Math.max(0, followUpsAnswered))
}

/** What she has left. Never negative; a rung that reads as un-reached again cannot put her in debt. */
export function repliesLeft(rungsReached: number, followUpsAnswered: number, spent: number): number {
  return Math.max(0, guideBudget(rungsReached, followUpsAnswered) - Math.max(0, spent))
}
