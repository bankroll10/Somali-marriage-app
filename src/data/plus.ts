/**
 * Niyyah+ — the shape of the business, written down honestly.
 *
 * Two rules decide everything on this screen:
 *
 *  1. Nothing that protects a person is ever paid. Verification, photo blur,
 *     wali-friendly mode, the privacy shield, report-and-block, and replying to
 *     someone who is serious about you are free forever. Charging a woman to
 *     protect herself — or to answer a man who has already expressed interest —
 *     is the oldest move in this category and we don't make it.
 *
 *  2. We charge for what costs us money to run, and for the work that starts
 *     after the introductions stop. That's the guide, and the lifecycle.
 *
 * Everything here is stated in the app's own voice, including the parts that
 * argue against buying the most expensive plan.
 */

/** Guide replies included free, per calendar month. */
export const FREE_REPLIES = 20

/** Days in the free trial. No card is taken, so nothing can lapse into a charge. */
export const TRIAL_DAYS = 7

export const freeForever: string[] = [
  'Your readiness map — every reading, and the whole record of how you’ve changed',
  'Your work — the step you’re carrying and everything you’ve finished',
  'The daily check-in and today’s reflection',
  'Verification, photo blur, wali-friendly mode, and the privacy shield',
  'Reporting and blocking anyone, instantly, with no questions',
  'Being introduced — and replying to anyone who is serious about you',
  `${FREE_REPLIES} guide replies every month`,
]

export interface PlusFeature {
  title: string
  body: string
  /** True when this ships with the public launch rather than today. */
  soon?: boolean
}

export const plusIncludes: PlusFeature[] = [
  {
    title: 'Your guide, without a counter',
    body: 'All six voices, as often as you need them — the one that steadies you at 1am and the one that keeps you honest. Every reply costs us real money to run; that’s the only reason there’s a limit at all.',
  },
  {
    title: 'Guidance past the match',
    body: 'Deciding together, and married. The questions that actually decide a marriage — money, family, where you’ll live, how you argue — arrive long after the introductions stop.',
  },
  {
    title: 'The family conversations',
    body: 'Preparation and words you can borrow for the wali, for your parents, and for the meeting between two families. The part everyone dreads and nobody rehearses.',
  },
  {
    title: 'A matchmaker in your corner',
    body: 'A real, vetted person who reads your map and works your case — the honourable role our families have always trusted.',
    soon: true,
  },
]

export interface Plan {
  id: 'month' | 'six' | 'year'
  label: string
  price: string
  /** What it works out to, said plainly rather than hidden in small print. */
  per: string
  note: string
  badge?: string
}

export const plans: Plan[] = [
  {
    id: 'month',
    label: 'Monthly',
    price: '$15',
    per: '$15 a month',
    note: 'Month to month. Leave whenever you like.',
  },
  {
    id: 'six',
    label: 'Six months',
    price: '$75',
    per: '$12.50 a month',
    note: 'About as long as a serious process takes, from first introduction to a decision.',
    badge: 'Most people',
  },
  {
    id: 'year',
    label: 'A year',
    price: '$120',
    per: '$10 a month',
    note: 'The cheapest by the month — but if this works, you won’t need all of it. We’d rather say that now than take the money quietly.',
  },
]

export const promises: string[] = [
  'No card for the trial. There is nothing to forget to cancel.',
  'Cancel in two taps, from this screen. It stays on until the day you’ve paid through.',
  'We email before any renewal. You will never find a surprise charge.',
  'Cancelling keeps your map, your work, your check-ins and every conversation. They were never the paid part.',
  'We will never sell your data, and we will never charge you without asking first.',
]
