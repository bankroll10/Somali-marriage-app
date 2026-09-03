import { allQuestions } from '../data/intake'
import type { Candidate } from '../data/candidates'
import type { Answers } from '../types'

/**
 * Alignment engine — scores how well a candidate fits the seeker's readiness map.
 * This is the anti-swipe core: people are ranked by *alignment*, not looks.
 *
 * ─── Claude seam ───────────────────────────────────────────────────────────
 * The numeric score stays rule-based (fast, explainable). The "why you align"
 * reasoning is exactly where Claude (the Matchmaker voice) plugs in later — a
 * warm, specific paragraph instead of the templated reasons below.
 * ───────────────────────────────────────────────────────────────────────────
 */

export interface Alignment {
  score: number // 0–100
  reasons: string[]
  headline: string
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
 *
 * The two sides of this comparison speak different languages: the intake stores
 * what the user tapped as ids ('deen-char', 'emotional'), while candidates carry
 * human labels ('Taqwa', 'Maturity'). Comparing them directly is always empty —
 * which is exactly what happened: `values.ratio` was 0 for every user against
 * every candidate, silently zeroing a fifth of the score and putting "Strong
 * alignment" mathematically out of reach.
 *
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

export function alignment(answers: Answers, c: Candidate): Alignment {
  // Faith: blend of how central faith is + practice level.
  const userFaithRole = typeof answers['faith-role'] === 'number' ? (answers['faith-role'] as number) : 3
  const userPractice =
    PRACTICE_SCALE[answers['practice'] as Candidate['practice']] ?? 2.5
  const faithScore =
    (closeness(userFaithRole, c.faithRole, 4) + closeness(userPractice, PRACTICE_SCALE[c.practice], 3)) / 2

  // Timeline.
  const userTl = TIMELINE_SCALE[answers['timeline'] as string] ?? 2.5
  const timelineScore = closeness(userTl, TIMELINE_SCALE[c.timeline], 3)

  // Family involvement.
  const userFam = FAMILY_SCALE[answers['family-role'] as string] ?? 2.5
  const familyScore = closeness(userFam, FAMILY_SCALE[c.familyRole], 3)

  // Children.
  const userKids = answers['children'] as string | undefined
  let childrenScore = 0.55
  if (userKids) {
    if (userKids === c.children) childrenScore = 1
    else if (
      (userKids === 'want' && c.children === 'open') ||
      (userKids === 'open' && c.children === 'want')
    )
      childrenScore = 0.75
    else if (userKids === 'no' && c.children !== 'no') childrenScore = 0.15
    else childrenScore = 0.45
  }

  const values = overlap(answerTags(answers, 'value-most'), c.values)

  // How you'd live. Read from the three optional questions on the sample
  // introduction and Profile — the Somali-specific ground no other app reads on.
  const householdScore = livingScore(answers['household'], c.household, HOUSEHOLD_SCALE)
  const workScore = livingScore(answers['work'], c.work, WORK_SCALE)
  const moneyScore = livingScore(answers['money-home'], c.moneyHome, MONEY_SCALE)

  // Weights sum to 1. Faith still leads; the three living terms take 0.18
  // between them — enough that a real mismatch on whose house or money home
  // shows in the number, not so much that a neutral "haven't decided" drags it.
  const score = Math.round(
    100 *
      (faithScore * 0.26 +
        childrenScore * 0.16 +
        values.ratio * 0.16 +
        familyScore * 0.13 +
        timelineScore * 0.11 +
        householdScore * 0.08 +
        workScore * 0.05 +
        moneyScore * 0.05),
  )

  // Build human reasons, most persuasive first — only three are shown, so the
  // order decides what she actually reads. The shared-value line names her own
  // taps back to her ("you share a value of taqwa and kindness"), which is more
  // specific than any of the band-based reasons, so it sits second behind deen.
  // It used to sit last and was cut by the slice below every single time.
  const reasons: string[] = []
  if (faithScore >= 0.8 && (userFaithRole >= 4 || c.faithRole >= 4))
    reasons.push('you both put deen at the center')
  // One living reason at most, and it sits second: it is the sentence no other
  // app could write, and the whole point of asking. Money home first — it is
  // the most specific to us, and the one most often found out too late.
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
  if (values.shared.length)
    reasons.push(`you share a value of ${values.shared.slice(0, 2).join(' and ').toLowerCase()}`)
  if (childrenScore >= 0.9 && userKids === 'want') reasons.push('you both want a family')
  if (timelineScore >= 0.8 && (userTl >= 3 || TIMELINE_SCALE[c.timeline] >= 3))
    reasons.push('you’re both ready to move with intention')
  if (familyScore >= 0.8) reasons.push('you see family’s role the same way')

  const headline =
    score >= 85
      ? 'Strong alignment'
      : score >= 70
        ? 'Promising alignment'
        : score >= 55
          ? 'Worth exploring'
          : 'Some common ground'

  return { score, reasons: reasons.slice(0, 3), headline }
}
