/**
 * What is free, what costs money, and the rule that decides which.
 *
 * Two rules decide everything on this screen:
 *
 *  1. Nothing that protects a person is ever paid. Your privacy controls, your
 *     family's vouch, report-and-block, and replying to someone who is serious
 *     about you are free forever. Charging a woman to protect herself — or to
 *     answer a man who has already expressed interest — is the oldest move in
 *     this category and we don't make it.
 *
 *  2. Nothing we sell may earn more when a member is doing worse. The guide
 *     used to be metered per reply, with "no counter" as the paid tier — which
 *     meant the product was paid for the 1am spiral. The guide is now free and
 *     budgeted by progress (src/lib/budget.ts). What is sold is bought once,
 *     for a stage or for a person, and ends on its own.
 *
 * Everything here is stated in the app's own voice.
 */

/**
 * Replies granted for every step on the ladder and every follow-up answered.
 * Fifteen is enough for a real conversation about one real thing; the next
 * fifteen come from doing the thing.
 */
export const REPLIES_PER_STEP = 15

export const freeForever: string[] = [
  'Your map — every reading, and what changed between them',
  'Your work — the step you’re carrying and everything you’ve finished',
  'A read on someone, and Before you say yes — the conversations that decide a marriage, asked early',
  'Asking him to answer the eleven on his own phone, and seeing where you match',
  'The family conversations — words for your wali, for hooyo, and for two families meeting',
  'Your family’s vouch, when they give it',
  'Your privacy controls, and reporting or blocking anyone, instantly',
  'Being introduced — and replying to anyone who is serious about you',
  `The guide — ${REPLIES_PER_STEP} replies for every step you take, and every follow-up you answer`,
]

export interface PaidLater {
  title: string
  body: string
}

/**
 * What will cost money, with the public launch. Each is bought once and ends
 * on its own — a stage, or a person. Prices are set at launch, not here.
 */
export const paidLater: PaidLater[] = [
  {
    title: 'Deciding together',
    body: 'Bought once, for one courtship: a joint conversation guide over the two-sided eleven, the family scripts, and one call with a human matchmaker to walk the two of you through what you found.',
  },
  {
    title: 'A matchmaker in your corner',
    body: 'When your city opens — a real, vetted person who reads your map and works your case. The honourable role our families have always paid for, done properly.',
  },
]

export const promises: string[] = [
  'We never earn more because you are having a hard night. Nothing here is priced by the reply, the message, or the hour.',
  'Nothing that protects you is ever paid, at any price.',
  'What we sell is bought once and ends on its own. There is no subscription to forget.',
  'Everyone here before the public launch keeps every paid feature free for a year after it.',
  'We will never sell your data, and we will never charge you without asking first.',
]
