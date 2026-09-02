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

  // No partnership term: the intake stopped asking 'partnership-style' when it
  // was cut to 13 questions, so that slice scored a flat 0.55 for everyone and
  // was pure dead weight dragging the ceiling down. Its 0.08 is redistributed
  // proportionally across the five signals we actually collect. If a partnership
  // question ever returns, restore the term and take the weight back from here.
  const score = Math.round(
    100 *
      (faithScore * 0.3 +
        timelineScore * 0.15 +
        familyScore * 0.17 +
        childrenScore * 0.18 +
        values.ratio * 0.2),
  )

  // Build human reasons, most persuasive first — only three are shown, so the
  // order decides what she actually reads. The shared-value line names her own
  // taps back to her ("you share a value of taqwa and kindness"), which is more
  // specific than any of the band-based reasons, so it sits second behind deen.
  // It used to sit last and was cut by the slice below every single time.
  const reasons: string[] = []
  if (faithScore >= 0.8 && (userFaithRole >= 4 || c.faithRole >= 4))
    reasons.push('you both put deen at the center')
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
