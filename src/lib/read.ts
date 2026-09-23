import type { Gender } from '../types'
import {
  DIMENSION_LABEL,
  readQuestions,
  scriptFor,
  speak,
  type ReadDimension,
  type Script,
} from '../data/read'

/**
 * The engine behind the read.
 *
 * It answers one question — what has the other person actually shown — and it
 * is built to be unable to answer any other. There is no character verdict in
 * here, no number attached to a human being, and no instruction to stay or go.
 * Those are the reader's, and ours would be worthless: we have never met them.
 *
 * What it does have is an opinion about which evidence matters most. Whether
 * you exist in their life outranks everything else, because in this community
 * someone who keeps a person hidden has told you the whole story and the rest
 * is commentary.
 *
 * Every sentence this file returns passes through `speak(gender)` before it
 * leaves, because a man reading a woman must not be told what "he" intends.
 * `tests/mens-read.test.ts` holds that: no result may name the wrong side.
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
 * The order the dimensions are read in, and the order a tie is broken in.
 *
 * `public` leads deliberately. Every other signal can be produced by a man who
 * is enjoying himself; being known to his people costs him something. That is
 * a judgement, and it is stated as an order, not a decimal: this file used to
 * weight the five .26/.21/.20/.19/.14 and sum them into an `overall` that
 * decided the band — numbers nobody had measured, invisible to her, which
 * could call a man "strong" while her own screen said he had not yet shown
 * how he handles hard things (docs/ALIGNMENT.md S3). The band is now read from
 * the states she can see.
 */
const PRIORITY: ReadDimension[] = ['public', 'pressure', 'intent', 'family', 'consistency']

/** Lowest first, for choosing which gap to speak to. */
const STATE_RANK: Record<DimensionState, number> = { 'not-yet': 0, partly: 1, shown: 2 }

/** Why a gap in this dimension matters. The sentence that turns a score into a reason. */
const WHY_IT_MATTERS: Record<ReadDimension, string> = {
  public:
    'A person who intends to marry you lets you exist in their life. Being kept off to one side is not shyness, and it does not resolve on its own.',
  intent:
    'Wanting to be married and intending to marry you are different things, and only one of them has a date attached.',
  family:
    'Someone who means to approach your family has usually already thought about how. A vague answer here is an answer.',
  consistency:
    'Words are cheap and everyone has good ones. What you are looking for is whether the behaviour underneath them is steady.',
  pressure:
    'How someone treats you when you are inconvenient is as close to a preview of marriage as you get beforehand.',
}

const DURATION_NOTE: Record<string, string> = {
  'weeks-0': 'You are less than two weeks in.',
  'weeks-6': 'You are a few weeks in.',
  'months-3': 'You are two or three months in.',
  'months-plus': 'You are past three months.',
}

/** Long enough that a gap is fair to ask about directly. */
const MATURE = new Set(['months-3', 'months-plus'])

/**
 * Who to tell, in the one band we do not coach. Not a pronoun — a different
 * set of people — so it cannot be a token and is keyed on the reader instead.
 */
const CONFIDANTE: Record<Gender, string> = {
  woman: 'a sister, a friend, an older woman you trust',
  man: 'a brother, a friend, an older man you trust',
}

/**
 * A dimension's average answer, as a word. The per-answer weights in
 * src/data/read.ts are an editorial ordering of the options — which answer
 * shows more of the thing — and these two lines turn their average into one
 * of three words. Nothing finer reaches her.
 */
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
 * Questions added after reads were already being kept. A read taken before one
 * existed never saw it, so it is whole without it — and simply never names
 * what that question alone could.
 */
const ADDED_LATER = new Set(['money'])

/**
 * Read what he has shown her.
 *
 * Every question must be answered; a partial read would be a guess wearing the
 * clothes of an answer.
 */
export function buildRead(answers: ReadAnswers, gender: Gender = 'woman'): ReadResult | null {
  const questions = readQuestions(gender)
  if (questions.some((q) => !answers[q.id] && !ADDED_LATER.has(q.id))) return null
  const fix = speak(gender)

  // ── Score each dimension ─────────────────────────────────────────────────
  const collected: Record<string, number[]> = {}
  for (const q of questions) {
    if (q.dimension === 'context') continue
    const chosen = q.options.find((o) => o.id === answers[q.id])
    // An answer that says nothing about them — "I have not told {him}" — is not scored.
    if (!chosen || chosen.weight === null) continue
    ;(collected[q.dimension] ??= []).push(chosen.weight)
  }
  const scores = {} as Record<ReadDimension, number>
  for (const dim of PRIORITY) {
    const xs = collected[dim] ?? []
    scores[dim] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
  }

  // ── Notes, strongest and weakest, from her own answers ───────────────────
  const scored = questions
    .filter((q) => q.dimension !== 'context')
    .flatMap((q) => {
      const chosen = q.options.find((o) => o.id === answers[q.id])!
      return chosen.weight === null ? [] : [{ note: chosen.note, weight: chosen.weight, dimension: q.dimension as ReadDimension }]
    })
  const shown = scored.filter((s) => s.weight >= 0.7).sort((a, b) => b.weight - a.weight).map((s) => s.note)
  const missing = scored.filter((s) => s.weight <= 0.3).sort((a, b) => a.weight - b.weight).map((s) => s.note)

  const dimensions: ReadDimensionReading[] = PRIORITY.map((dimension) => ({
    dimension,
    label: fix(DIMENSION_LABEL[dimension]),
    state: stateOf(scores[dimension]),
  }))

  const duration = answers.duration
  const durationNote = DURATION_NOTE[duration] ?? ''
  // Which gap to speak to: the thinnest state she can see, and among equals
  // the one that comes first. A woman nobody knows about does not need to be
  // coached through asking how he'd approach her family — being hidden is the
  // prior question, and answering the smaller one first would waste the only
  // ask she is likely to make this week.
  const thin = [...dimensions].sort(
    (a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || PRIORITY.indexOf(a.dimension) - PRIORITY.indexOf(b.dimension),
  )[0].dimension

  // ── Money, before the families ───────────────────────────────────────────
  // Not a measure of how serious {he} is — the man running a romance scam is
  // often the most attentive man she has met — so it is not scored. It is
  // named, above everything else, because it is what scams do (docs/ABUSE.md).
  if (answers.money === 'yes') {
    return {
      band: 'caution',
      headline: fix('One of these is not about how serious {he} is.'),
      summary: fix(`${durationNote} {He} has asked you for money before your families have met. Whatever the reason given — a bill, a ticket, family back home, an investment — that is the shape romance scams take, and it looks the same from inside whether or not {he} means well. We are not going to guess at {his} character from a few questions. We can tell you what to do.`),
      shown,
      missing,
      dimensions,
      thin,
      script: scriptFor(thin, gender),
      caution: fix(
        `Send nothing more until your families have met — not a loan, not a ticket, not an investment. Tell ${CONFIDANTE[gender]} exactly what {he} asked for, this week. If {he} is serious, the families meeting first costs {him} nothing.`,
      ),
    }
  }

  // ── The one pattern we do not coach ──────────────────────────────────────
  // Hidden, and made to feel like the problem. Naming it is right; treating it
  // as a communication issue with a clever script would be wrong.
  const secret = answers.secret === 'explicit'
  const isolating = secret && (answers.hard === 'blames' || answers.known === 'nobody')
  if (isolating) {
    return {
      band: 'caution',
      headline: 'Two of these go together, and it is worth saying so plainly.',
      summary: fix(`${durationNote} You have been asked to keep this hidden, and ${
        answers.hard === 'blames'
          ? 'when you raise something difficult you come away feeling like the problem'
          : 'there is no one in {his} life who knows you exist'
      }. Kept quiet, and left doubting yourself, is the shape that leaves someone with nobody to compare notes with. We cannot tell you what {he} intends, and we are not going to guess at {his} character from a few questions. We can tell you that this particular combination is not a question for an app.`),
      shown,
      missing,
      dimensions,
      thin,
      script: scriptFor(thin, gender),
      caution: fix(
        `Tell one person who knows you — ${CONFIDANTE[gender]} — exactly what you have just told us. Out loud, to a human being, this week. Not for advice. So that someone other than {him} knows the shape of it.`,
      ),
    }
  }

  // ── Too early to conclude ────────────────────────────────────────────────
  if (duration === 'weeks-0') {
    return {
      band: 'early',
      headline: 'It is too early for this to tell you much.',
      summary: fix(`${durationNote} That is not a failing — it means the honest answer is that {he} has not had time to show you anything yet, and anyone who tells you otherwise this early is guessing. What you can do now is know exactly what you are watching for, so that in a month you are reading behaviour instead of re-reading messages.`),
      shown,
      missing,
      dimensions,
      thin,
      script: scriptFor('early', gender),
      watch: PRIORITY.map((d) => fix(`${DIMENSION_LABEL[d]} — ${WHY_IT_MATTERS[d]}`)),
    }
  }

  // ── The three real bands ─────────────────────────────────────────────────
  // Read from the five states on her screen, by a rule she could check herself:
  // strong is being known shown, nothing not-yet, and four of five shown; thin is
  // more not-yet than shown; everything else is mixed. Nothing can buy its way
  // past being hidden, and nothing she can see as missing can be summed away.
  const count = (st: DimensionState) => dimensions.filter((d) => d.state === st).length
  const publicShown = dimensions.find((d) => d.dimension === 'public')!.state === 'shown'
  const band: ReadBand =
    publicShown && count('not-yet') === 0 && count('shown') >= 4
      ? 'strong'
      : count('not-yet') > count('shown')
        ? 'thin'
        : 'mixed'

  const strongest = shown.slice(0, 2)
  const weakest = missing.slice(0, 2)
  const mature = MATURE.has(duration)

  let headline: string
  let summary: string

  if (band === 'strong') {
    headline = '{He} has done most of what this asks about.'
    summary = `${durationNote} ${sentence(join(strongest))}${
      strongest.length ? '. ' : ''
    }Those are real, and worth holding onto. ${
      weakest.length
        ? `The thinnest part is that ${weakest[0]} — worth closing, not worth panicking about.`
        : `There is no obvious gap in what you have told us.`
    } This is a summary of your own answers — not a verdict on {him}, and not a prediction. The useful thing now is not more watching. It is one clear conversation, so that what you both assume is said out loud.`
  } else if (band === 'mixed') {
    headline = `Real signals — and one gap that is doing a lot of work.`
    summary = `${durationNote} ${
      strongest.length
        ? `${sentence(join(strongest))}. That is real, and it is worth holding onto. `
        : ''
    }${
      weakest.length ? `What is missing is that ${weakest[0]}. ` : ''
    }${WHY_IT_MATTERS[thin]}${
      mature ? ' At this point it is fair to ask about it directly.' : ''
    }`
  } else {
    headline = 'So far, {he} has shown you very little of it.'
    summary = `${durationNote} ${
      weakest.length ? `${sentence(join(weakest))}. ` : ''
    }${WHY_IT_MATTERS[thin]}${
      mature
        ? ' You are far enough in that this is information, not impatience on your part.'
        : ' It is still early enough that this can change — but it changes because {he} does something, not because more time passes.'
    } None of that is a verdict on {him}, and it is certainly not one on you. It is a description of what has happened so far.`
  }

  return {
    band,
    headline: fix(headline),
    summary: fix(summary),
    shown,
    missing,
    dimensions,
    thin,
    script: scriptFor(thin, gender),
  }
}

/** A one-line summary of a past read, for the Guide's context. */
export function readSummary(result: Pick<ReadResult, 'band' | 'thin'>, gender: Gender = 'woman'): string {
  const BAND: Record<ReadBand, string> = {
    early: 'too early to tell',
    strong: '{he} has done most of what the read asks about',
    mixed: 'real signals with one significant gap',
    thin: 'very little shown so far',
    caution: 'a pattern of being kept hidden',
  }
  return speak(gender)(`${BAND[result.band]}; thinnest ground: ${DIMENSION_LABEL[result.thin].toLowerCase()}`)
}
