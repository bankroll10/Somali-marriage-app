import { allQuestions } from '../data/intake'
import { speak } from '../data/read'
import type { Candidate } from '../data/candidates'
import type { Answers } from '../types'

/**
 * Alignment — what two maps say, side by side.
 *
 * Three rules, in this order:
 *
 *   1. What she said she will not compromise on is checked first, as a gate —
 *      and a gate blocks only where his answer plainly contradicts her words.
 *      Anything our reading would have to supply is the first thing to ask,
 *      not a verdict (docs/ALIGNMENT.md G1, G2).
 *
 *   2. Nothing here is a number. This file used to sum eight weighted
 *      closeness scores — faith .26, children .16, values .16, family .13,
 *      timeline .11, household .08, work .05, money .05 — over invented
 *      scales with invented neutral values (0.55 for "unanswered", 2.5 for
 *      "somewhere in the middle"), and used the sum to choose which sample to
 *      show. None of those numbers had been measured against anything; no
 *      introduction has been made. The sum picked the most flattering invented
 *      man and the screen called it "chosen by alignment" (docs/ALIGNMENT.md
 *      S1). So there is no sum.
 *
 *   3. What is shown is literal. Where the two answers are the same, it says
 *      so. Where they differ, it says so — every difference, in one fixed
 *      order of conversation, never "the one that matters most", because we
 *      do not know which one matters most. Where either side has not answered
 *      or said "unsure", it is not known yet, and it is said to be.
 *
 * ─── Claude seam ───────────────────────────────────────────────────────────
 * The lines below are templated. When the Matchmaker voice is wired to a
 * real introduction, it writes them as a paragraph, from the same inputs.
 * ───────────────────────────────────────────────────────────────────────────
 */

export interface Alignment {
  /** Where the two answers are the same, in conversation order. */
  same: string[]
  /** Every place the two answers differ, in conversation order — not ranked. */
  differ: string[]
  /** Topics where either side has no answer yet, or said unsure. */
  unknown: string[]
  /** The first thing to ask: a non-negotiable no answer can settle, or the first difference. */
  ask: string
  /** Set when his answer plainly contradicts one of her stated non-negotiables. Nothing else matters then. */
  blocked: string | null
}

/**
 * The order the topics are read in, and so the order differences are listed.
 * Editorial: children and faith first because a non-negotiable can rest on
 * them; the rest as a conversation would reach them. It is an order to read
 * in, not a claim about which difference ends marriages (docs/ALIGNMENT.md).
 */
const PRACTICE = new Set(['devout', 'consistent', 'returning', 'cultural'])
const TIMELINE = new Set(['within-1', '1-2', '3-plus', 'exploring'])
const FAMILY = new Set(['central', 'guided', 'informed', 'private'])
const CHILDREN = new Set(['want', 'open', 'no'])
const HOUSEHOLD = new Set(['with-family', 'near-family', 'separate'])
const FLEXIBLE = new Set(['flexible', 'Flexible'])
const WORK = new Set(['both', 'seasons', 'one-home'])
const MONEY = new Set(['expected', 'some', 'little'])

/**
 * Translate a multi-select answer from option ids into the shared tag vocabulary.
 * Each option's `tags` field already IS the candidate vocabulary, so translating
 * through it keeps one source of truth rather than a lookup table that can drift.
 */
function answerTags(answers: Answers, questionId: string): string[] {
  const value = answers[questionId]
  if (!Array.isArray(value)) return []
  const question = allQuestions.find((q) => q.id === questionId)
  if (!question) return []
  return value.flatMap((id) => question.options?.find((o) => o.id === id)?.tags ?? [])
}

/**
 * Her non-negotiables that no form can check — real, and unverifiable from
 * any answer — become the first thing to ask.
 */
const ASK_FOR: Record<string, string> = {
  honesty: 'You said honesty is not negotiable. Ask {him} about the last time {he} told someone a hard truth — and watch whether {he} answers plainly or performs.',
  respect: 'You said respect for you and your family is not negotiable. Ask {him} how {he} speaks about {his} own family when they are not in the room.',
  'no-addiction': 'You said a life free of addiction is not negotiable. Ask {him} directly, and early — it is a kinder question at month one than at month six.',
  'ambition-nn': 'You said direction in life is not negotiable. Ask {him} what the next two years look like, and listen for whether there is a plan or a mood.',
  'kindness-nn': 'You said how {he} treats people, especially the powerless, is not negotiable. Watch {him} with a waiter, a younger cousin, someone who cannot help {him}.',
}

/** A checkable non-negotiable whose answers do not plainly clash, but do not settle it either. */
const ASK_FAITH_RETURNING =
  'You said a shared commitment to faith is not negotiable, and {he} describes {himself} as reconnecting with {his} faith. That is not a no. Ask {him} what it looks like in {his} week now, and where {he} wants it to be in a year.'
const ASK_CHILDREN_OPEN =
  'You said being aligned on children is not negotiable, and your answers are not the same: one of you is open to children, the other does not see them. Ask how settled that is, before anything else.'

function gate(answers: Answers, c: Candidate): { blocked: string | null; ask: string | null } {
  const nn = Array.isArray(answers['dealbreakers']) ? (answers['dealbreakers'] as string[]) : []
  // The server's twin is netlify/shared/gate.ts; tests/gate-sync.test.ts holds them together.
  if (nn.includes('faith-nn') && c.practice === 'cultural') {
    return {
      blocked: 'You said a shared commitment to faith is not negotiable, and {he} describes {his} practice as “Muslim by identity, lighter in practice”. That is the whole answer, however much else is the same.',
      ask: null,
    }
  }
  const hers = answers['children']
  if (nn.includes('kids-nn')) {
    if (hers === 'want' && c.children === 'no') {
      return { blocked: 'You said being aligned on children is not negotiable. You want children, and {he} does not see them in {his} future. Nothing else on this list outweighs that.', ask: null }
    }
    if (hers === 'no' && c.children === 'want') {
      return { blocked: 'You said being aligned on children is not negotiable. You do not see children in your future, and {he} wants them. Nothing else on this list outweighs that.', ask: null }
    }
  }
  if (nn.includes('faith-nn') && c.practice === 'returning') return { blocked: null, ask: ASK_FAITH_RETURNING }
  if (nn.includes('kids-nn') && ((hers === 'open' && c.children === 'no') || (hers === 'no' && c.children === 'open'))) {
    return { blocked: null, ask: ASK_CHILDREN_OPEN }
  }
  const first = nn.find((id) => id in ASK_FOR)
  return { blocked: null, ask: first ? ASK_FOR[first] : null }
}

const CHILDREN_SAME: Record<string, string> = {
  want: 'you both want a family',
  open: 'you are both open to children with the right person',
  no: 'neither of you sees children in your future',
}
const HOUSEHOLD_SAME: Record<string, string> = {
  'with-family': 'you both picture one household with family in it',
  'near-family': 'you both picture your own front door, close to family',
  separate: 'you both picture a home that is fully your own',
}
const MONEY_SAME: Record<string, string> = {
  expected: 'you both expect to send money home every month',
  some: 'you both expect to send some money home, when you can',
  little: 'neither of you expects to carry money home every month',
}
const WORK_SAME: Record<string, string> = {
  both: 'you both picture both of you working',
  seasons: 'you both picture work changing with the seasons of family',
  'one-home': 'you both picture one of you at home',
}

export function alignment(answers: Answers, c: Candidate): Alignment {
  // A woman reading a man, or a man reading a woman: the sample is always the other side.
  const fix = speak(c.gender === 'woman' ? 'man' : 'woman')
  const { blocked, ask: gateAsk } = gate(answers, c)

  const same: string[] = []
  const differ: string[] = []
  const unknown: string[] = []

  /** One single-choice topic, compared literally: the same answer, a different one, or not known. */
  function compare(mine: unknown, theirs: string, known: Set<string>, sameLine: (v: string) => string, differLine: string, unknownLine: string) {
    if (typeof mine === 'string' && FLEXIBLE.has(mine)) return
    if (FLEXIBLE.has(theirs)) return
    if (typeof mine !== 'string' || !known.has(mine) || !known.has(theirs)) return void unknown.push(unknownLine)
    if (mine === theirs) same.push(sameLine(mine))
    else differ.push(differLine)
  }

  compare(answers['children'], c.children, CHILDREN, (v) => CHILDREN_SAME[v], 'children', 'children')

  // Faith: practice is a label a person chose, so it compares literally. How
  // central faith should be is a 1–5 self-rating, and one point on a slider
  // is not a difference anyone could name — so "the same" is both at the
  // centre (4 or 5) and "different" is two points or more apart. A tolerance
  // for a self-rating, and said so in docs/ALIGNMENT.md.
  compare(answers['practice'], c.practice, PRACTICE, () => 'you describe where you are in your practice the same way', 'where you each are in your practice', 'where you each are in your practice')
  const role = answers['faith-role']
  if (typeof role !== 'number') unknown.push('how central faith should be at home')
  else if (role >= 4 && c.faithRole >= 4) same.push('you both put deen at the center')
  else if (Math.abs(role - c.faithRole) >= 2) differ.push('how central faith should be at home')

  compare(answers['family-role'], c.familyRole, FAMILY, () => 'you see family’s role the same way', 'how involved family should be, and when', 'how involved family should be')
  compare(answers['household'], c.household, HOUSEHOLD, (v) => HOUSEHOLD_SAME[v], 'whose house you would live in', 'whose house you would live in')
  compare(answers['money-home'], c.moneyHome, MONEY, (v) => MONEY_SAME[v], 'money sent home', 'money sent home')
  compare(answers['work'], c.work, WORK, (v) => WORK_SAME[v], 'work after marriage and children', 'work after marriage and children')
  compare(answers['timeline'], c.timeline, TIMELINE, () => 'you picture the same timeline for marriage', 'how soon you each picture marriage', 'how soon you each picture marriage')

  // Values: a shared one is worth naming; different ones are not a difference
  // anyone disagrees about, so they are not listed as one.
  const shared = answerTags(answers, 'value-most').filter((t) => c.values.includes(t))
  if (shared.length) same.push(`you both named ${shared.slice(0, 2).join(' and ').toLowerCase()}`)

  const ask =
    gateAsk ??
    (differ.length
      ? `Open with a place your answers differ: ${differ[0]}. Ask how {he} sees it before you say how you do.`
      : 'Ask {him} what {he} pictures an ordinary Tuesday evening looking like, five years from now. You will hear the whole life in it.')

  return { same, differ, unknown, ask: fix(ask), blocked: blocked ? fix(blocked) : null }
}
