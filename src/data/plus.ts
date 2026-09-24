/**
 * What is free, what costs money, and the rule that decides which.
 *
 * Two rules decide everything on this screen:
 *
 *  1. Nothing that protects a person is ever paid. Your privacy controls, your
 *     family's vouch, reporting a concern, and replying to someone who is serious
 *     about you are free forever. Charging a woman to protect herself — or to
 *     answer a man who has already expressed interest — is the oldest move in
 *     this category and we don't make it.
 *
 *  2. Nothing we sell may earn more when a member is doing worse. The guide
 *     used to be metered per reply, with "no counter" as the paid tier — which
 *     meant the product was paid for the 1am spiral. The guide is now free and
 *     budgeted by progress (src/lib/budget.ts). What is sold is paid once,
 *     at a step forward, and ends on its own.
 *
 *  3. Every price sits at a step forward, and nothing is priced by time. Run
 *     the test on each line below: does this earn more if she stays single
 *     longer, opens the app more often, or is having a worse night? If yes, it
 *     does not ship. What is left has a property no subscription can have —
 *     revenue is strictly increasing in successful exits: once when a couple
 *     have seen where they match, and at the wedding. A member who never
 *     leaves is a member who never pays. The run of this test is recorded in
 *     docs/MONETIZATION.md.
 *
 * The wedding is not an accident of the model, it is the oldest part of it.
 * Our matchmakers have always been paid at the nikah, by the families, out of
 * the celebration — never by the month and never per introduction. Charging
 * where the community already expects to pay is why this can be honest and
 * solvent at the same time.
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
  'Your privacy controls, and reporting anyone who is on the other side of your eleven',
  'Being introduced — and replying to anyone who is serious about you',
  `The guide — ${REPLIES_PER_STEP} replies for every step you take, and every follow-up you answer`,
]

/**
 * The eight questions in docs/MONETIZATION.md, reduced to the three a member
 * can check from the screen: who pays, when, and after what. `after` is the
 * rung (netlify/shared/vocab.ts, RUNGS) that must already have happened — the
 * value created before anything is asked for. The badge on the screen is
 * built from these, so it cannot claim "bought once" for a thing a family
 * pays at a wedding.
 */
export interface PaidLater {
  title: string
  body: string
  who: 'the two of you' | 'the families' | 'a guest'
  when: string
  after: 'he-answered' | 'married'
  badge: string
}

/**
 * What will cost money, and only once a gate in docs/MONETIZATION.md passes.
 * Each is paid once, at a step forward, and none of it is anything listed as
 * free above. Prices are set at launch, not here.
 *
 * This line used to be "Deciding together": the two-sided eleven, the family
 * scripts and a call — two of those three are in freeForever, so it sold what
 * was free, and it carried the name of the stage a member declares
 * (src/data/stages.ts), so the free stage read as a product. It is now only
 * the call, under its own name, and once per member for life: a second
 * courtship's call is free, so nothing is earned when one ends.
 * docs/MONETIZATION.md, challenge 1.
 */
export const paidLater: PaidLater[] = [
  {
    title: 'Talking it through, with a matchmaker',
    body: 'One conversation with a human matchmaker, for the two of you, about what you found where you match and where you don’t. Offered only after you have both seen it. Once per person, for life: if this courtship ends, the next one’s conversation is free.',
    who: 'the two of you',
    when: 'once, after the joint view',
    after: 'he-answered',
    badge: 'Once, for the two of you, after you’ve seen where you match',
  },
  {
    title: 'A matchmaker in your corner',
    body: 'If a pool opens — a real, vetted person who reads your map and works your case. Paid by the families at the nikah, one fixed amount agreed before anyone is introduced, the way that role has always been paid. If nothing comes of it, nothing is owed, and paying gives a family no say and nothing of yours.',
    who: 'the families',
    when: 'at the nikah, only if there is one',
    after: 'married',
    badge: 'Paid by the families, at the nikah, only if there is one',
  },
  {
    title: 'The first year married, as a gift',
    body: 'The conversations nobody warns you about after the wedding — in-laws, money, the first real argument. Given by somebody else, the way a wedding gift is. Never sold to a couple who have just paid for a wedding.',
    who: 'a guest',
    when: 'at the wedding',
    after: 'married',
    badge: 'A gift, from someone else, at the wedding',
  },
]

export const promises: string[] = [
  'We never earn more because you are having a hard night. Nothing here is priced by the reply, the message, or the hour.',
  // "If you stay single, we earn nothing from you" was false the day a
  // courtship that bought the call ended. What is true is that staying single
  // never earns us more (docs/MONETIZATION.md, the incentive audit).
  'We are paid when you get somewhere, and never while you are stuck. The one thing you might pay for is paid once in your life, so staying single never earns us more.',
  'Nothing that protects you is ever paid, at any price.',
  'What we sell is paid once, at a step forward, and ends on its own. There is no subscription to forget.',
  // Bounded 2026-09-12 (docs/BOARD.md, decision 0). It used to promise everyone
  // "here" at launch a free year of every paid feature — with no marker for who
  // "here" was, and a reading under which a family's
  // payment to a matchmaker at the nikah was barred, so the company had
  // arranged not to learn whether anyone pays until a year after the first
  // pool. The promise is about what a member is charged, and she is charged
  // nothing; what a family pays at a wedding, and what a guest gives, was
  // never hers to be charged.
  'Everyone counted before their pool opens keeps every paid feature free for a year after it opens. That is a promise about what you are charged — and you are charged nothing. What a family chooses to pay at a nikah, or a guest chooses to give, is theirs.',
  'We will never sell your data, and we will never charge you without asking first.',
]
