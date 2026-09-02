import { allQuestions } from '../data/intake'
import type {
  Answers,
  Dimension,
  DimensionReading,
  Option,
  Question,
  Reflection,
} from '../types'

/**
 * The reflection engine.
 *
 * Today this synthesizes a thoughtful reading from the intake locally — no
 * network, no keys, instant. It is written so the seam to a real LLM is clean:
 * `generateReflection` is already async, and `buildReflection` is the pure
 * synthesis you would hand to (or compare against) a Claude-generated version.
 *
 * ─── Claude seam ───────────────────────────────────────────────────────────
 * When we wire the API, `generateReflection` becomes:
 *
 *   const res = await fetch('/api/reflection', { method: 'POST', body: JSON.stringify({ answers }) })
 *   return await res.json()  // a Reflection produced by claude-opus-4-8
 *
 * The server prompt would frame Claude as a warm, culturally-fluent guide for
 * a Somali/Muslim audience, returning the same `Reflection` shape. The local
 * version below is the fallback and the baseline.
 * ───────────────────────────────────────────────────────────────────────────
 */

const DIMENSION_LABELS: Record<Dimension, string> = {
  intention: 'Intention',
  faith: 'Faith',
  family: 'Family',
  vision: 'Vision',
  character: 'Character',
  emotional: 'Emotional readiness',
  selfAwareness: 'Self-awareness',
}

const DIMENSION_ORDER: Dimension[] = [
  'intention',
  'faith',
  'family',
  'vision',
  'character',
  'emotional',
  'selfAwareness',
]

function questionsFor(dim: Dimension): Question[] {
  return allQuestions.filter((q) => q.dimension === dim)
}

function optionById(q: Question, id: string): Option | undefined {
  return q.options?.find((o) => o.id === id)
}

/** Normalized 0–1 contribution of a single answer, or null if it doesn't score. */
function scoreAnswer(q: Question, value: unknown): number | null {
  if (value == null) return null

  if (q.type === 'scale' && q.scale && typeof value === 'number') {
    const { min, max } = q.scale
    return (value - min) / (max - min)
  }

  if (q.type === 'single' && typeof value === 'string') {
    const opt = optionById(q, value)
    return opt?.weight ?? null
  }

  if (q.type === 'multi' && Array.isArray(value)) {
    const weights = value
      .map((id) => optionById(q, id)?.weight)
      .filter((w): w is number => typeof w === 'number')
    if (weights.length === 0) return null
    return weights.reduce((a, b) => a + b, 0) / weights.length
  }

  return null
}

function dimensionReading(dim: Dimension, answers: Answers): DimensionReading {
  const qs = questionsFor(dim)
  const scores: number[] = []
  for (const q of qs) {
    const s = scoreAnswer(q, answers[q.id])
    if (s != null) scores.push(s)
  }
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5
  const score = Math.round(avg * 100)
  return { dimension: dim, label: DIMENSION_LABELS[dim], score, note: dimensionNote(dim, score) }
}

function dimensionNote(dim: Dimension, score: number): string {
  const high = score >= 75
  const mid = score >= 55 && score < 75
  switch (dim) {
    case 'intention':
      return high
        ? 'Your intention is clear and settled. You know why you are here.'
        : mid
          ? 'Your intention is forming. A little more clarity will serve you well.'
          : 'You are still discerning your why — an honest and worthy place to be.'
    case 'faith':
      return high
        ? 'Faith is a steady center for you, and you know the role you want it to play.'
        : mid
          ? 'Your deen is a real part of the picture; you have room to define it together.'
          : 'Faith sits lighter for you right now — name that clearly so you find someone who fits.'
    case 'family':
      return high
        ? 'You have thought carefully about how family fits into this — a real strength.'
        : mid
          ? 'You have a sense of family’s role; a few conversations would sharpen it.'
          : 'How two families come together is worth more of your reflection.'
    case 'vision':
      return high
        ? 'You can see the life you want with real clarity.'
        : mid
          ? 'Your horizon is coming into focus across the things that matter.'
          : 'Some of your future is still open — that is fine, just hold it honestly.'
    case 'character':
      return high
        ? 'You know what you need in a person, and how you meet conflict — rare and valuable.'
        : mid
          ? 'You have a good read on what matters in a partner.'
          : 'It is worth getting clearer on what you truly need, beyond attraction.'
    case 'emotional':
      return high
        ? 'You meet love with a steady heart and know what makes you feel safe. That steadiness is a gift to whoever you choose.'
        : mid
          ? 'You understand your heart’s patterns; naming them is how you keep them from running the show.'
          : 'Your heart is still tender in places. Move gently, and let the right person earn your trust slowly.'
    case 'selfAwareness':
      return high
        ? 'You meet yourself honestly. That self-awareness is the foundation everything sits on.'
        : mid
          ? 'You are doing real reflection on yourself — keep going.'
          : 'The most important work is inward. A little more honesty with yourself goes far.'
  }
}

function collectTags(answers: Answers, dims: Dimension[], cap: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const q of allQuestions) {
    if (!dims.includes(q.dimension)) continue
    const v = answers[q.id]
    const ids = Array.isArray(v) ? v : typeof v === 'string' ? [v] : []
    for (const id of ids) {
      const opt = optionById(q, id)
      for (const tag of opt?.tags ?? []) {
        if (!seen.has(tag)) {
          seen.add(tag)
          out.push(tag)
        }
      }
    }
  }
  return out.slice(0, cap)
}

/** The tags behind one multi-select answer, in her chosen order. */
function tagsForQuestion(answers: Answers, questionId: string): string[] {
  const q = allQuestions.find((x) => x.id === questionId)
  const v = answers[questionId]
  if (!q || !Array.isArray(v)) return []
  return v.flatMap((id) => optionById(q, String(id))?.tags ?? [])
}

function nonNegotiables(answers: Answers): string[] {
  const q = allQuestions.find((x) => x.id === 'dealbreakers')
  const v = answers['dealbreakers']
  if (!q || !Array.isArray(v)) return []
  return v.map((id) => optionById(q, id)?.label ?? '').filter(Boolean)
}

function growthNote(answers: Answers): string {
  const patternQ = allQuestions.find((x) => x.id === 'pattern')
  const patternId = answers['pattern']
  const working = (answers['working-on'] as string | undefined)?.trim()

  let base = 'You are doing the inner work, and it shows.'
  if (typeof patternId === 'string' && patternQ) {
    const map: Record<string, string> = {
      unavailable:
        'You see your pull toward people who can’t fully show up. Naming it is how you start choosing differently — let availability, not chemistry, be your first filter.',
      rushing:
        'You know you tend to move fast. Let this process slow you down on purpose; the right person will still be there at a calmer pace.',
      walls:
        'You guard yourself closely. Real intimacy will ask you to lower the wall a little earlier than feels comfortable — gently, and with someone who earns it.',
      settling:
        'You’ve settled before. Your non-negotiables below are not too much to ask — hold them.',
      none: 'You’ve already done meaningful work on yourself. Stay honest as new things surface.',
    }
    base = map[patternId] ?? base
  }
  if (working) {
    base += ` In your own words, you’re still learning to ${working.replace(/^I'?m still learning to\s*/i, '').replace(/\.$/, '')}. That honesty is exactly what a good marriage is built on.`
  }
  return base
}

function alignmentParagraph(answers: Answers): string {
  const faithRole = answers['faith-role']
  const familyRole = answers['family-role']
  const parts: string[] = []

  if (typeof faithRole === 'number' && faithRole >= 4) {
    parts.push('a partner for whom faith is a shared center, not a footnote')
  } else if (typeof faithRole === 'number' && faithRole <= 2) {
    parts.push('someone who respects your relationship with faith without making it the whole frame')
  } else {
    parts.push('someone walking a faith path at a pace that sits comfortably beside yours')
  }

  if (familyRole === 'central' || familyRole === 'guided') {
    parts.push('a family-minded match who welcomes your people into the story')
  } else {
    parts.push('a match who respects that you lead your own decisions while honoring family')
  }

  // Only what she said she wants in a person. `coreValues` also carries her
  // timeline, motive and practice tags in its first three slots, so reading
  // from it printed "Above all, you're drawn to soon, intentional, grounded"
  // as the closing line of the map.
  const wanted = tagsForQuestion(answers, 'value-most')
  const valueLine =
    wanted.length >= 2
      ? `Above all, you’re drawn to ${wanted.slice(0, 3).join(', ').toLowerCase()}.`
      : ''

  return `Alignment for you looks like ${parts.join(', and ')}. ${valueLine}`.trim()
}

function headlineFor(overall: number): string {
  if (overall >= 80) return 'Grounded and ready'
  if (overall >= 65) return 'Ready, with clarity to gain'
  if (overall >= 50) return 'Building your foundation'
  return 'Earlier in the journey — and that’s okay'
}

function summaryFor(overall: number, top: DimensionReading, low: DimensionReading): string {
  const opener =
    overall >= 80
      ? 'You come to this with rare clarity.'
      : overall >= 65
        ? 'You are closer to ready than most who start this.'
        : overall >= 50
          ? 'You have a real foundation, with a few things still taking shape.'
          : 'You are early in this — and arriving honestly is worth more than arriving fast.'

  return `${opener} Your strongest ground is ${top.label.toLowerCase()}, and the place with the most room to grow is ${low.label.toLowerCase()} — not a flaw, just where a little more reflection will pay off most.`
}

/** Pure synthesis — deterministic, no I/O. */
export function buildReflection(answers: Answers): Reflection {
  const dimensions = DIMENSION_ORDER.map((d) => dimensionReading(d, answers))

  // Weight the dimensions: intention, faith and self-awareness anchor readiness.
  const weights: Record<Dimension, number> = {
    intention: 1.2,
    faith: 1.1,
    family: 0.9,
    vision: 0.9,
    character: 1,
    emotional: 1.15,
    selfAwareness: 1.2,
  }
  const wSum = dimensions.reduce((a, d) => a + weights[d.dimension], 0)
  const overall = Math.round(
    dimensions.reduce((a, d) => a + d.score * weights[d.dimension], 0) / wSum,
  )

  const sorted = [...dimensions].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const low = sorted[sorted.length - 1]

  const coreValues = collectTags(
    answers,
    ['intention', 'faith', 'vision', 'character'],
    6,
  )

  return {
    headline: headlineFor(overall),
    summary: summaryFor(overall, top, low),
    overall,
    dimensions,
    coreValues,
    nonNegotiables: nonNegotiables(answers),
    growthNote: growthNote(answers),
    alignment: alignmentParagraph(answers),
  }
}

/**
 * Async entry point used by the UI. Local synthesis today; swap the body for a
 * Claude-backed call (see seam note at the top) without touching the UI.
 */
export async function generateReflection(answers: Answers): Promise<Reflection> {
  // Small intentional pause — this moment should feel considered, not instant.
  await new Promise((r) => setTimeout(r, 1400))
  return buildReflection(answers)
}
