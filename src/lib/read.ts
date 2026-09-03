import type { Gender } from '../types'
import {
  DIMENSION_LABEL,
  SCRIPTS,
  readQuestions,
  type ReadDimension,
  type Script,
} from '../data/read'

/**
 * The engine behind the read.
 *
 * It answers one question — what has he actually shown her — and it is built to
 * be unable to answer any other. There is no character verdict in here, no
 * number attached to a human being, and no instruction to stay or go. Those are
 * hers, and ours would be worthless: we have never met him.
 *
 * What it does have is an opinion about which evidence matters most. Whether
 * she exists in his life outranks everything else, because in this community a
 * man who keeps a woman hidden has told you the whole story and the rest is
 * commentary.
 */

export type ReadBand = 'early' | 'strong' | 'mixed' | 'thin' | 'caution'

/** No numbers ever reach her about a person. Three states, in words. */
export type DimensionState = 'shown' | 'partly' | 'not-yet'

export interface ReadDimensionReading {
  dimension: ReadDimension
  label: string
  state: DimensionState
}

export interface ReadResult {
  band: ReadBand
  headline: string
  summary: string
  /** What he has shown, in her own answers, strongest first. */
  shown: string[]
  /** What is not there, weakest first. */
  missing: string[]
  dimensions: ReadDimensionReading[]
  /** The dimension the script addresses. */
  thin: ReadDimension
  script: Script
  /** Present only for the one pattern that is not ours to coach. */
  caution?: string
  /** Watch-list, for a read taken too early to conclude anything. */
  watch?: string[]
}

export type ReadAnswers = Record<string, string>

/**
 * How much each dimension counts.
 *
 * `public` leads deliberately. Every other signal can be produced by a man who
 * is enjoying himself; being known to his people costs him something.
 */
const WEIGHTS: Record<ReadDimension, number> = {
  public: 0.26,
  intent: 0.21,
  consistency: 0.2,
  pressure: 0.19,
  family: 0.14,
}

/** Stable order for iteration and display — most consequential first. */
const PRIORITY: ReadDimension[] = ['public', 'pressure', 'intent', 'family', 'consistency']

/** Why a gap in this dimension matters. The sentence that turns a score into a reason. */
const WHY_IT_MATTERS: Record<ReadDimension, string> = {
  public:
    'A person who intends to marry you lets you exist in their life. Being kept off to one side is not shyness, and it does not resolve on its own.',
  intent:
    'Wanting to be married and intending to marry you are different things, and only one of them has a date attached.',
  family:
    'In our families this is not a formality, it is the entire road. Someone who means to walk it has usually already thought about how.',
  consistency:
    'Words are cheap and everyone has good ones. What you are looking for is whether the behaviour underneath them is steady.',
  pressure:
    'How someone treats you when you are inconvenient is the closest thing to a preview of marriage you will ever get.',
}

const DURATION_NOTE: Record<string, string> = {
  'weeks-0': 'You are less than two weeks in.',
  'weeks-6': 'You are a few weeks in.',
  'months-3': 'You are two or three months in.',
  'months-plus': 'You are past three months.',
}

/** Long enough that a gap is a decision rather than an oversight. */
const MATURE = new Set(['months-3', 'months-plus'])

function stateOf(score: number): DimensionState {
  if (score >= 0.7) return 'shown'
  if (score >= 0.35) return 'partly'
  return 'not-yet'
}

function join(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Read what he has shown her.
 *
 * Every question must be answered; a partial read would be a guess wearing the
 * clothes of an answer.
 */
export function buildRead(answers: ReadAnswers, gender: Gender = 'woman'): ReadResult | null {
  const questions = readQuestions(gender)
  if (questions.some((q) => !answers[q.id])) return null

  // ── Score each dimension ─────────────────────────────────────────────────
  const collected: Record<string, number[]> = {}
  for (const q of questions) {
    if (q.dimension === 'context') continue
    const chosen = q.options.find((o) => o.id === answers[q.id])
    if (!chosen) continue
    ;(collected[q.dimension] ??= []).push(chosen.weight)
  }
  const scores = {} as Record<ReadDimension, number>
  for (const dim of PRIORITY) {
    const xs = collected[dim] ?? []
    scores[dim] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
  }
  const overall = PRIORITY.reduce((sum, d) => sum + scores[d] * WEIGHTS[d], 0)

  // ── Notes, strongest and weakest, from her own answers ───────────────────
  const scored = questions
    .filter((q) => q.dimension !== 'context')
    .map((q) => {
      const chosen = q.options.find((o) => o.id === answers[q.id])!
      return { note: chosen.note, weight: chosen.weight, dimension: q.dimension as ReadDimension }
    })
  const shown = scored.filter((s) => s.weight >= 0.7).sort((a, b) => b.weight - a.weight).map((s) => s.note)
  const missing = scored.filter((s) => s.weight <= 0.3).sort((a, b) => a.weight - b.weight).map((s) => s.note)

  const dimensions: ReadDimensionReading[] = PRIORITY.map((dimension) => ({
    dimension,
    label: DIMENSION_LABEL[dimension],
    state: stateOf(scores[dimension]),
  }))

  const duration = answers.duration
  const durationNote = DURATION_NOTE[duration] ?? ''
  // Which gap to speak to. Not simply the lowest score: how thin it is, times
  // how much it matters. A woman nobody knows about does not need to be coached
  // through asking how he'd approach her family — being hidden is the prior
  // question, and answering the smaller one first would waste the only ask she
  // is likely to make this week.
  const thin = [...PRIORITY].sort(
    (a, b) => (1 - scores[b]) * WEIGHTS[b] - (1 - scores[a]) * WEIGHTS[a],
  )[0]

  // ── The one pattern we do not coach ──────────────────────────────────────
  // Hidden, and made to feel like the problem. Naming it is right; treating it
  // as a communication issue with a clever script would be wrong.
  const secret = answers.secret === 'explicit'
  const isolating = secret && (answers.hard === 'blames' || answers.known === 'nobody')
  if (isolating) {
    return {
      band: 'caution',
      headline: 'Two of these go together, and it is worth saying so plainly.',
      summary: `${durationNote} You have been asked to keep this hidden, and ${
        answers.hard === 'blames'
          ? 'when you raise something difficult you come away feeling like the problem'
          : 'there is no one in his life who knows you exist'
      }. Kept quiet, and left doubting yourself, is the shape that leaves women without anyone to compare notes with. We cannot tell you what he intends, and we are not going to guess at his character from eleven questions. We can tell you that this particular combination is not a question for an app.`,
      shown,
      missing,
      dimensions,
      thin,
      script: SCRIPTS[thin],
      caution:
        'Tell one person who knows you — a sister, a friend, an older woman you trust — exactly what you have just told us. Out loud, to a human being, this week. Not for advice. So that someone other than him knows the shape of it.',
    }
  }

  // ── Too early to conclude ────────────────────────────────────────────────
  if (duration === 'weeks-0') {
    return {
      band: 'early',
      headline: 'It is too early for this to tell you much.',
      summary: `${durationNote} That is not a failing — it means the honest answer is that he has not had time to show you anything yet, and anyone who tells you otherwise this early is guessing. What you can do now is know exactly what you are watching for, so that in a month you are reading behaviour instead of re-reading messages.`,
      shown,
      missing,
      dimensions,
      thin,
      script: SCRIPTS.early,
      watch: PRIORITY.map((d) => `${DIMENSION_LABEL[d]} — ${WHY_IT_MATTERS[d]}`),
    }
  }

  // ── The three real bands ─────────────────────────────────────────────────
  // A high overall score cannot buy its way past being hidden.
  const band: ReadBand = overall >= 0.72 && scores.public >= 0.6 ? 'strong' : overall >= 0.45 ? 'mixed' : 'thin'

  const strongest = shown.slice(0, 2)
  const weakest = missing.slice(0, 2)
  const mature = MATURE.has(duration)

  let headline: string
  let summary: string

  if (band === 'strong') {
    headline = 'He has shown you the things that actually predict it.'
    summary = `${durationNote} ${sentence(join(strongest))}${
      strongest.length ? '. ' : ''
    }Those are not small, and they are not what someone passing time produces. ${
      weakest.length
        ? `The thinnest part is that ${weakest[0]} — worth closing, not worth panicking about.`
        : `There is no obvious gap in what you have told us, which is rarer than you would think.`
    } The useful thing now is not more watching. It is one clear conversation, so that what you both assume is actually said out loud.`
  } else if (band === 'mixed') {
    headline = `Real signals — and one gap that is doing a lot of work.`
    summary = `${durationNote} ${
      strongest.length
        ? `${sentence(join(strongest))}. That is real, and it is worth holding onto. `
        : ''
    }${
      weakest.length ? `What is missing is that ${weakest[0]}. ` : ''
    }${WHY_IT_MATTERS[thin]}${
      mature ? ' At this point that is a decision rather than an oversight.' : ''
    }`
  } else {
    headline = 'So far, he has shown you very little of it.'
    summary = `${durationNote} ${
      weakest.length ? `${sentence(join(weakest))}. ` : ''
    }${WHY_IT_MATTERS[thin]}${
      mature
        ? ' You are far enough in that this is information, not impatience on your part.'
        : ' It is still early enough that this can change — but it changes because he does something, not because more time passes.'
    } None of that is a verdict on him, and it is certainly not one on you. It is a description of what has happened so far.`
  }

  return {
    band,
    headline,
    summary,
    shown,
    missing,
    dimensions,
    thin,
    script: SCRIPTS[thin],
  }
}

/** A one-line summary of a past read, for the Guide's context. */
export function readSummary(result: Pick<ReadResult, 'band' | 'thin'>): string {
  const BAND: Record<ReadBand, string> = {
    early: 'too early to tell',
    strong: 'he has shown the things that predict seriousness',
    mixed: 'real signals with one significant gap',
    thin: 'very little shown so far',
    caution: 'a pattern of being kept hidden',
  }
  return `${BAND[result.band]}; thinnest ground: ${DIMENSION_LABEL[result.thin].toLowerCase()}`
}
