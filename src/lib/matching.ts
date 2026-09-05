import { allQuestions } from '../data/intake'
import type { Candidate } from '../data/candidates'
import type { Answers } from '../types'

/**
 * Alignment — how a person's map reads against someone.
 *
 * Two rules, in this order:
 *
 *   1. What she said she will not compromise on is checked first, as a gate.
 *      The old engine never read `dealbreakers` at all: a man could come out
 *      "Strong alignment" while failing her stated non-negotiable on faith or
 *      children. Anything a non-negotiable can be checked against is checked;
 *      what cannot be checked becomes the first thing to ask him.
 *
 *   2. Nothing that reaches a screen is a percentage. The old output was a
 *      0–100 score with bands — "Strong alignment", "Promising", "Worth
 *      exploring" — which is a match percentage by another name, and when real
 *      people arrive a percentage is an invitation to rank them. What a
 *      person is shown is reasons, one place they differ, and the question to
 *      open with. A number survives only as `fit`, to choose which sample to
 *      show, and is never rendered.
 *
 * ─── Claude seam ───────────────────────────────────────────────────────────
 * The reasons below are templated. When the Matchmaker voice is wired to a
 * real introduction, it writes them as a paragraph, from the same inputs.
 * ───────────────────────────────────────────────────────────────────────────
 */

export interface Alignment {
  /**
   * Internal only — used to order candidates, never shown. Deliberately not
   * named `score`, so that nothing can render it by habit.
   */
  fit: number
  /** Why their lives fit, most persuasive first. At most three. */
  reasons: string[]
  /** The one place the two of them differ most — said plainly, or null. */
  differs: string | null
  /** The first thing to ask him: a non-negotiable no answer can check, or the difference above. */
  ask: string
  /** Set when he fails one of her stated non-negotiables. Nothing else matters then. */
  blocked: string | null
}

// Candidate practice ids and the intake's 'practice' option ids are the same
// vocabulary, so one scale serves both sides of the comparison.
const PRACTICE_SCALE: Record<Candidate['practice'], number> = {
  devout: 4,
  consistent: 3,
  returning: 2,
  cultural: 1,
}
const TIMELINE_SCALE: Record<string, number> = {
  'within-1': 4,
  '1-2': 3,
  exploring: 2.5,
  '3-plus': 1,
}
const FAMILY_SCALE: Record<string, number> = {
  central: 4,
  guided: 3,
  informed: 2,
  private: 1,
}

/**
 * The three things Somali marriages actually break on. Three-step scales; the
 * fourth option on each question ("flexible", "unsure") is not on the scale
 * and reads as neutral — an honest "I don't know" must never be scored as a
 * mismatch. An unanswered question is neutral for the same reason.
 */
const HOUSEHOLD_SCALE: Record<string, number> = { 'with-family': 3, 'near-family': 2, separate: 1 }
const WORK_SCALE: Record<string, number> = { both: 3, seasons: 2, 'one-home': 1 }
const MONEY_SCALE: Record<string, number> = { expected: 3, some: 2, little: 1 }

function livingScore(user: unknown, cand: string, scale: Record<string, number>): number {
  if (typeof user !== 'string' || !(user in scale)) return 0.55
  if (!(cand in scale)) return 0.7
  const d = Math.abs(scale[user] - scale[cand])
  return d === 0 ? 1 : d === 1 ? 0.6 : 0.1
}

function closeness(a: number, b: number, maxDiff: number): number {
  return Math.max(0, 1 - Math.abs(a - b) / maxDiff)
}

function overlap(a: string[] = [], b: string[] = []): { ratio: number; shared: string[] } {
  if (a.length === 0 || b.length === 0) return { ratio: 0.55, shared: [] }
  const shared = a.filter((x) => b.includes(x))
  return { ratio: shared.length / Math.min(a.length, b.length), shared }
}

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
 * Her non-negotiables, checked against what a candidate's answers can show.
 *
 * Two can be checked: a shared commitment to faith (his practice), and being
 * aligned on children. The rest — honesty, respect, clean living, direction,
 * how he treats the powerless — are real and unverifiable from any form, so
 * they become the first thing to ask.
 */
const ASK_FOR: Record<string, string> = {
  honesty: 'You said honesty is not negotiable. Ask him about the last time he told someone a hard truth — and watch whether he answers plainly or performs.',
  respect: 'You said respect for you and your family is not negotiable. Ask him how he speaks about his own mother when she is not in the room.',
  'no-addiction': 'You said a life free of addiction is not negotiable. Ask him directly, and early — it is a kinder question at month one than at month six.',
  'ambition-nn': 'You said direction in life is not negotiable. Ask him what the next two years look like, and listen for whether there is a plan or a mood.',
  'kindness-nn': 'You said how he treats people, especially the powerless, is not negotiable. Watch him with a waiter, a younger cousin, someone who cannot help him.',
}

function gate(answers: Answers, c: Candidate): { blocked: string | null; ask: string | null } {
  const nn = Array.isArray(answers['dealbreakers']) ? (answers['dealbreakers'] as string[]) : []
  if (nn.includes('faith-nn') && (c.practice === 'cultural' || c.practice === 'returning')) {
    return { blocked: 'You said a shared commitment to faith is not negotiable, and his practice is not there yet. That is the whole answer, however much else fits.', ask: null }
  }
  if (nn.includes('kids-nn')) {
    const hers = answers['children']
    const clash =
      (hers === 'want' && c.children === 'no') ||
      (hers === 'no' && (c.children === 'want' || c.children === 'open')) ||
      (hers === 'open' && c.children === 'no')
    if (clash) {
      return { blocked: 'You said being aligned on children is not negotiable, and you are not. Nothing else on this list outweighs that.', ask: null }
    }
  }
  const first = nn.find((id) => id in ASK_FOR)
  return { blocked: null, ask: first ? ASK_FOR[first] : null }
}

export function alignment(answers: Answers, c: Candidate): Alignment {
  const { blocked, ask: gateAsk } = gate(answers, c)

  // Faith: blend of how central faith is + practice level.
  const userFaithRole = typeof answers['faith-role'] === 'number' ? (answers['faith-role'] as number) : 3
  const userPractice = PRACTICE_SCALE[answers['practice'] as Candidate['practice']] ?? 2.5
  const faithScore =
    (closeness(userFaithRole, c.faithRole, 4) + closeness(userPractice, PRACTICE_SCALE[c.practice], 3)) / 2

  const userTl = TIMELINE_SCALE[answers['timeline'] as string] ?? 2.5
  const timelineScore = closeness(userTl, TIMELINE_SCALE[c.timeline], 3)

  const userFam = FAMILY_SCALE[answers['family-role'] as string] ?? 2.5
  const familyScore = closeness(userFam, FAMILY_SCALE[c.familyRole], 3)

  // Children. Want against no is the one mismatch that ends marriages, and it
  // used to score 0.15 one way round and 0.45 the other — a woman who wanted
  // children read a man who did not as a mild difference. It is the same
  // difference from either side.
  const userKids = answers['children'] as string | undefined
  let childrenScore = 0.55
  if (userKids) {
    const pair = new Set([userKids, c.children])
    if (userKids === c.children) childrenScore = 1
    else if (pair.has('want') && pair.has('open')) childrenScore = 0.75
    else if (pair.has('no') && (pair.has('want') || pair.has('open'))) childrenScore = 0.15
    else childrenScore = 0.45
  }

  const values = overlap(answerTags(answers, 'value-most'), c.values)

  const householdScore = livingScore(answers['household'], c.household, HOUSEHOLD_SCALE)
  const workScore = livingScore(answers['work'], c.work, WORK_SCALE)
  const moneyScore = livingScore(answers['money-home'], c.moneyHome, MONEY_SCALE)

  // Weights sum to 1. Faith still leads; the three living terms take 0.18
  // between them. A blocked candidate sorts to the bottom whatever else fits.
  const fit = blocked
    ? 0
    : faithScore * 0.26 +
      childrenScore * 0.16 +
      values.ratio * 0.16 +
      familyScore * 0.13 +
      timelineScore * 0.11 +
      householdScore * 0.08 +
      workScore * 0.05 +
      moneyScore * 0.05

  // Reasons, most persuasive first — only three are shown.
  const reasons: string[] = []
  if (faithScore >= 0.8 && (userFaithRole >= 4 || c.faithRole >= 4)) reasons.push('you both put deen at the center')
  const living =
    answers['money-home'] === 'expected' && c.moneyHome === 'expected'
      ? 'you both expect to send money home, and neither of you will resent it'
      : answers['money-home'] === 'little' && c.moneyHome === 'little'
        ? 'neither of you expects to carry money home every month'
        : answers['household'] === 'near-family' && c.household === 'near-family'
          ? 'you both picture your own front door, close to family'
          : answers['household'] === 'with-family' && c.household === 'with-family'
            ? 'you both picture one household with family in it'
            : answers['household'] === 'separate' && c.household === 'separate'
              ? 'you both picture a home that is fully your own'
              : answers['work'] === 'both' && c.work === 'both'
                ? 'you’d both keep working, and share what’s at home'
                : answers['work'] === 'one-home' && c.work === 'one-home'
                  ? 'you both picture one of you at home'
                  : null
  if (living) reasons.push(living)
  if (values.shared.length) reasons.push(`you share a value of ${values.shared.slice(0, 2).join(' and ').toLowerCase()}`)
  if (childrenScore >= 0.9 && userKids === 'want') reasons.push('you both want a family')
  if (timelineScore >= 0.8 && (userTl >= 3 || TIMELINE_SCALE[c.timeline] >= 3)) reasons.push('you’re both ready to move with intention')
  if (familyScore >= 0.8) reasons.push('you see family’s role the same way')

  // The one place they differ most. Named, never scored; the lowest of the
  // things she actually answered.
  const differences: { score: number; line: string }[] = []
  if (typeof answers['faith-role'] === 'number' || typeof answers['practice'] === 'string')
    differences.push({ score: faithScore, line: 'how central faith is, day to day' })
  if (answers['timeline']) differences.push({ score: timelineScore, line: 'how soon you each picture marriage' })
  if (answers['family-role']) differences.push({ score: familyScore, line: 'how involved family should be, and when' })
  if (userKids) differences.push({ score: childrenScore, line: 'children' })
  if (typeof answers['household'] === 'string' && answers['household'] in HOUSEHOLD_SCALE)
    differences.push({ score: householdScore, line: 'whose house you would live in' })
  if (typeof answers['work'] === 'string' && answers['work'] in WORK_SCALE)
    differences.push({ score: workScore, line: 'work after marriage and children' })
  if (typeof answers['money-home'] === 'string' && answers['money-home'] in MONEY_SCALE)
    differences.push({ score: moneyScore, line: 'money sent home' })
  differences.sort((a, b) => a.score - b.score)
  const weakest = differences[0]
  const differs = weakest && weakest.score < 0.7 ? weakest.line : null

  const ask =
    gateAsk ??
    (differs
      ? `Open with the place you differ: ${differs}. Ask how he sees it before you say how you do.`
      : 'Ask him what he pictures an ordinary Tuesday evening looking like, five years from now. You will hear the whole life in it.')

  return { fit, reasons: reasons.slice(0, 3), differs, ask, blocked }
}
