import { allQuestions } from '../data/intake'
import { getHookOption } from '../data/hook'
import type {
  Answers,
  AnswerValue,
  Dimension,
  DimensionReading,
  GroundState,
  MapSnapshot,
  Option,
  Question,
  Reflection,
} from '../types'

/**
 * The reflection engine.
 *
 * It names where a person stands on seven grounds — in a word each, never a
 * number — and writes every note from the answer she actually gave. It
 * synthesizes the reading locally — no network, no keys, instant.
 *
 * ─── The seam that was here, and why it is closed ──────────────────────────
 * This file used to carry a plan to put a model behind `generateReflection` —
 * the roadmap called it "the last local seam", as though local were a stage to
 * grow out of. docs/PRODUCT.md declines it, and the reasoning is worth keeping
 * where the temptation lives:
 *
 * The map is the durable asset. It feeds the guide and her side of the eleven
 * (matching went on 2026-09-24), it is built from her answers and a question set that is ours, and it works with the
 * network off. Putting a supplier behind it would trade something permanent
 * for something rented, and would mean that the day a vendor changes its mind
 * a member cannot get a map at all.
 *
 * The rule, asserted in tests/durable.test.ts: a model may add a layer on top
 * of something this product already does completely without it, and may never
 * be the thing that produces it. If a model ever writes prose *alongside* this
 * reading, `buildReflection` still has to produce the whole map first.
 * ───────────────────────────────────────────────────────────────────────────
 */

const DIMENSION_LABELS: Record<Dimension, string> = {
  intention: 'Intention',
  faith: 'Faith',
  family: 'Family',
  vision: 'Vision',
  character: 'Character',
  emotional: 'Steadiness',
  selfAwareness: 'Knowing yourself',
}

/**
 * The grounds that are positions, not readiness.
 *
 * How central faith is, how practised, how involved family should be, whether
 * children are in view: each is a position a person may hold and still be
 * wholly ready to marry. The map used to rate them — a Muslim whose faith is
 * private, lighter in practice, read "Thin" on faith and "Thinnest right now:
 * faith" on Home; wanting family informed rather than central, or no children,
 * or a three-year timeline, scored lower too. That is a religious and cultural
 * verdict the guide is forbidden to give, from weights nobody measured
 * (docs/PRODUCT.md S5). So these are described, in her own words, and never
 * rated; and they are never anyone's thinnest ground, though the work on them
 * is still offered after the rated grounds'.
 */
const POSITIONS = new Set<Dimension>(['faith', 'family', 'vision'])

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

  // Writing something in your own words, unprompted, in an explicitly optional
  // field is itself the signal this dimension is trying to measure. Skipping it
  // says nothing either way, so it returns null rather than dragging the score.
  if (q.type === 'text') {
    return typeof value === 'string' && value.trim().length > 0 ? 1 : null
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

/**
 * The one number that survives, and it never leaves this file.
 *
 * Each answer still carries a weight, because the map has to decide which
 * ground to offer work on first and the daily reflection has to know where she
 * is thinnest. That is all the weights are for now: an ordering. They are
 * never summed into an overall, never shown, never sent.
 */
function strength(dim: Dimension, answers: Answers): number {
  const scores: number[] = []
  for (const q of questionsFor(dim)) {
    const s = scoreAnswer(q, answers[q.id])
    if (s != null) scores.push(s)
  }
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5
}

/** Three words. An unanswered ground reads as steady — we know nothing, which is not thin. */
function stateOf(strength: number): GroundState {
  if (strength >= 0.75) return 'strong'
  if (strength >= 0.5) return 'steady'
  return 'thin'
}

function dimensionReading(dim: Dimension, answers: Answers): DimensionReading {
  return {
    dimension: dim,
    label: DIMENSION_LABELS[dim],
    state: POSITIONS.has(dim) ? null : stateOf(strength(dim, answers)),
    note: dimensionNote(dim, answers),
  }
}

/**
 * The note under each dimension bar.
 *
 * These used to be keyed on the score band alone — three strings per dimension,
 * 21 in total for every person who will ever use this. That had two costs. Two
 * women in the same band read word-for-word identical text, which is fatal for a
 * product whose whole promise is "this is about you". And opposite answers
 * collapsed into the same sentence: "I want children, God willing" and "I don't
 * see children in my future" both landed high on vision and printed the same
 * line, which reads as a machine that did not listen.
 *
 * So they are keyed on the answer she actually gave. The bar beside each note
 * already carries the number; the words are for what she told us, and there is
 * no longer any band arithmetic between her answer and the sentence she reads.
 */
function dimensionNote(dim: Dimension, answers: Answers): string {
  const a = (id: string) => answers[id] as string | undefined

  switch (dim) {
    case 'intention': {
      const why = a('why-now')
      const soon = a('timeline') === 'within-1' || a('timeline') === '1-2'
      if (why === 'pressure')
        return soon
          ? 'You named the pressure honestly — your family and community expect this, and you are moving anyway. Knowing the difference between their clock and your intention is what keeps you from choosing to end the questions.'
          : 'You said the expectation comes from around you rather than from inside you. That is an honest place to start, and the reason to go slowly is that a marriage entered to quiet the questions is still a marriage once they stop.'
      if (why === 'ready')
        return soon
          ? 'You know why you are here and roughly when, and you can say it plainly. Say it early.'
 : 'You feel ready, and you are giving yourself room on the timing. That combination — clear on the why, unhurried on the when — leaves room to choose calmly.'
      if (why === 'lonely')
        return 'You were honest that companionship is a real part of this. It is not a lesser reason, but it is worth watching: loneliness can make almost anyone look like an answer, so let your standards do the filtering rather than your evenings.'
      return 'You are still working out whether you are ready, and you said so instead of performing certainty. Arriving honestly is worth more than arriving fast.'
    }

    case 'faith': {
      const p = a('practice')
      const central = typeof answers['faith-role'] === 'number' && (answers['faith-role'] as number) >= 4
      if (p === 'devout')
        return 'Your deen shapes your day, not just your identity. Look for someone whose practice is already theirs — you should not have to carry someone else\u2019s practice as well as your own.'
      if (p === 'consistent')
        return central
          ? 'You hold the core steadily and you want faith at the center of your home. Say that early; it filters more honestly than any list of qualities.'
 : 'You are consistent in the core and growing in the rest, and you said so plainly.'
      if (p === 'returning')
        return 'You said you are on the way back to your deen. That is a harder thing to write down than to feel, and the right person will meet you on that road rather than judge you for being on it.'
      return 'You were honest that faith sits lighter in practice than in identity. That clarity protects you from the specific heartbreak of marrying someone who expected a different home than the one you want.'
    }

    case 'family': {
      switch (a('family-role')) {
        case 'central':
          return 'You want your people in this from the beginning. That is not old-fashioned — it is protection. Look for someone who expects to meet them rather than someone who flinches.'
        case 'guided':
 return 'You bring family in once it is serious. Say that out loud early; the other person may be assuming something different.'
        case 'informed':
          return 'You keep your family informed and you lead the decision yourself. Hold that clearly, and say it early, so whoever you meet hears it from day one.'
        default:
          return 'You would rather keep this private until you are sure. That instinct is worth taking seriously — and worth knowing now whether it is protecting you or delaying a conversation you will still have to have.'
      }
    }

    case 'vision': {
      switch (a('children')) {
        case 'want':
          return 'You want children, God willing, and you said it without hedging. Say it that plainly to anyone you are serious about.'
        case 'no':
          return 'You do not see children in your future, and you said so plainly. That takes more courage to write than to think — and it belongs in the first serious conversation, not the fifth.'
        case 'open':
          return 'You are open to children with the right person. Watch for the version of that which is really "I will decide later", and say which one you mean, early.'
        default:
          return 'You are still unsure about children. That is an honest place to be at any age, and it is the one question where "we will figure it out" cannot stay the answer.'
      }
    }

    case 'character': {
      // Spelled out: a bare numeral in the middle of warm prose reads like a
      // form letter, which is the one thing this page cannot afford to sound like.
      const WORDS = ['no', 'one', 'two', 'three'] as const
      const count = nonNegotiables(answers).length
      const nn = count > 0 && count < WORDS.length ? WORDS[count] : ''
      switch (a('conflict')) {
        case 'talk':
          return `You talk things through even when it is hard${nn ? `, and you named ${nn} thing${count === 1 ? '' : 's'} you will not compromise on` : ''}. How someone handles the difficult hour is one of the clearest things you can learn about them.`
        case 'space':
          return 'You need space before you can come back to it. That is workable and healthy — as long as the person you choose knows it is a pause and not a punishment. Say it before the first argument, not during it.'
        case 'avoid':
          return 'You tend to let things pass rather than raise them. Nothing on this map is more worth working on: the things that matter do not leave on their own, and unsaid, they can surface years later wearing a different name.'
        default:
          return 'You get heated and then you repair. The repair is the part that matters, and it is a real skill — just make sure the person across from you experiences the repair as clearly as they felt the heat.'
      }
    }

    case 'emotional': {
      const h = a('healing')
      const att = a('attachment')
      const lean =
        att === 'anxious'
          ? ' When someone goes quiet you worry first. Read a silence slowly: reach for your salah, a walk, a friend, before you reach for the phone.'
          : att === 'avoidant'
            ? ' When someone gets close you pull back. Saying so — "I need a moment, I am not disappearing" — is what keeps that from reading as rejection.'
            : att === 'secure'
              ? ' You stay steady when someone goes quiet, and that is worth a lot to whoever you choose.'
              : ' For you it depends on the person, which means the person matters more than the pattern.'
      if (h === 'healed') return `What is behind you is behind you, and you said so.${lean}`
      if (h === 'healing') return `Something is still with you, and you know it. Knowing is most of it.${lean}`
      if (h === 'fresh')
        return `Something recent still hurts, and you said so plainly.${lean} Move gently. The right person will not need you to be finished.`
      return `You have not looked closely at what you might still be carrying.${lean} Worth an hour on your own before someone else finds it first.`
    }

    case 'selfAwareness': {
      const own = (answers['working-on'] as string | undefined)?.trim()
      const named = own ? ' And you wrote down what you are still working on, unprompted.' : ''
      switch (a('pattern')) {
        case 'unavailable':
          return `You see your pull toward people who cannot fully show up.${named} Let availability, not chemistry, be the first filter — it is the cheapest test there is.`
        case 'rushing':
          return `You know you move fast.${named} Let this slow you down; the right person is still there at a calmer pace.`
        case 'walls':
          return `You keep your walls up, and you said so.${named} Real closeness will ask you to lower one a little earlier than is comfortable — with someone who has earned it.`
        case 'settling':
          return `You have settled before and you do not want to again.${named} Your non-negotiables below are not too much to ask. Hold them.`
        case 'none':
          return `You have already changed the pattern you had.${named} Stay honest as new things surface — they will.`
        default:
          return `Knowing yourself is the ground everything else stands on.${named}`
      }
    }
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

/**
 * The honest mirror.
 *
 * This is the emotional centre of the map, so it must not restate the
 * self-awareness note directly above it — both used to be driven by `pattern`
 * alone and landed as the same observation twice.
 *
 * Instead it does the one thing a single answer cannot: it holds two of them
 * together. What she named as the hardest part, and the pattern she wants to
 * leave behind, are very often the same thing seen from opposite sides — and
 * saying so is the moment a reader stops skimming.
 */
function growthNote(answers: Answers): string {
  const hook = answers['hardest-part'] as string | undefined
  const pattern = answers['pattern'] as string | undefined
  const working = (answers['working-on'] as string | undefined)?.trim()

  const PAIRS: Record<string, string> = {
    'trust|walls':
      'You said the hardest part is trusting again, and that the pattern you want to leave behind is keeping your walls up. Those are not two problems. They are one thing seen from the inside and from the outside — and the way through is not to tear the wall down, it is to let one person earn a door.',
    'trust|unavailable':
 'You said trusting again is the hardest part, and that you tend to choose people who cannot fully show up. Be gentle with yourself about that: someone unavailable can never test your trust, which makes them feel safer than they are.',
    'serious|rushing':
      'You want to know whether someone is serious, and you know you tend to move fast. Those work against each other — speed is what makes seriousness hard to read. Slowness is not a delay here; it is the actual instrument.',
    'serious|settling':
      'You said the hardest part is knowing if someone is serious, and that you have settled before. That combination has a specific danger: when you have accepted less once, "serious enough" starts to sound like serious.',
    'family|rushing':
      'You named family pressure as the hardest part, and rushing as the pattern you want to leave. Those are connected — a clock you did not set can make anyone choose fast. The pace can be yours even when the questions are not.',
    'family|settling':
      'You said the pressure from family is the hardest part, and that you have settled before. Nobody settles in a vacuum. Your non-negotiables below exist precisely so that a decision made under that weight is still your own.',
    'ready|none':
      'You are asking whether you are ready, and you have already changed the pattern you had. Asking is part of the answer.',
    'finding|settling':
      'You said the hardest part is finding anyone serious at all, and that you have settled before. Scarcity is what makes settling feel reasonable. A thin room is a reason to wait, not a reason to lower the bar.',
  }

  const PATTERNS: Record<string, string> = {
    unavailable:
      'You see your pull toward people who cannot fully show up. Naming it is how you start choosing differently — let availability, not chemistry, be your first filter.',
    rushing:
      'You know you tend to move fast. Let this slow you down; the right person will still be there at a calmer pace.',
    walls:
      'You guard yourself closely. Real intimacy will ask you to lower the wall a little earlier than feels comfortable — gently, and with someone who earns it.',
    settling:
      'You have settled before. Your non-negotiables below are not too much to ask — hold them.',
    none: 'You have already changed the pattern you had. Stay honest as new things surface.',
  }

  let base =
    (hook && pattern ? PAIRS[`${hook}|${pattern}`] : undefined) ??
    (pattern ? PATTERNS[pattern] : undefined) ??
    'You answered these plainly, and it shows.'

  if (working) {
    base += ` In your own words, you’re still learning to ${working
      .replace(/^I'?m still learning to\s*/i, '')
      .replace(/\.$/, '')}.`
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

  // How she'd live — only when she has said. These are the Somali-specific
  // grounds no other map names, and the ones marriages are found out on late.
  const household = answers['household']
  if (household === 'with-family') parts.push('someone who pictures one household with family in it, as you do')
  else if (household === 'near-family') parts.push('someone who, like you, wants a front door of your own within reach of family')
  else if (household === 'separate') parts.push('someone at ease with a home that is fully your own')
  if (answers['money-home'] === 'expected') parts.push('someone who also sends money home, and can plan it with you')

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

/**
 * The headline comes from the pattern of the four rated grounds — intention,
 * character, steadiness, knowing yourself — never from a position she holds.
 * Nothing thin and most strong is steady ground; nothing thin is steady with
 * clarity to gain; up to two thin is a foundation being built; more is early —
 * and that is okay. It names where she stands, never a verdict that she is
 * "ready": the map cannot know that, and used to say it.
 */
type Shape = 'grounded' | 'clear' | 'building' | 'early'

function shapeOf(dimensions: DimensionReading[]): Shape {
  const thin = dimensions.filter((d) => d.state === 'thin').length
  const strong = dimensions.filter((d) => d.state === 'strong').length
  if (thin === 0 && strong >= 3) return 'grounded'
  if (thin === 0 && strong >= 1) return 'clear'
  if (thin <= 2) return 'building'
  return 'early'
}

function headlineFor(shape: Shape): string {
  switch (shape) {
    case 'grounded':
      return 'On steady ground'
    case 'clear':
      return 'Steady, with clarity to gain'
    case 'building':
      return 'Building your foundation'
    case 'early':
      return 'Early, and honest about it'
  }
}

function summaryFor(
  shape: Shape,
  top: DimensionReading,
  low: DimensionReading,
  answers: Answers,
): string {
  const opener =
    shape === 'grounded'
      ? 'You come to this with real clarity.'
      : shape === 'clear'
        ? 'You are clear on more of this than you might think.'
        : shape === 'building'
          ? 'You have a real foundation, with a few things still taking shape.'
          : 'You are early in this — and arriving honestly is worth more than arriving fast.'

  // Name back the question she answered before any of the others.
  //
  // The hook — "what's the hardest part for you right now?" — is the most
  // emotionally loaded thing this app asks, it arrives on the third screen, and
  // until now the map never mentioned it again. `HookOption.short` was written
  // for exactly this callback ("you said the hardest part is trusting again
  // after being hurt") and was read nowhere in the codebase.
  const hook = getHookOption(answers['hardest-part'] as string | undefined)
  const named = hook
    ? ` Before any of these questions, you told us the hardest part right now is ${hook.short} — so read the rest of this as an answer to that.`
    : ''

  return `${opener}${named} Your strongest ground is ${top.label.toLowerCase()}, and the place with the most room to grow is ${low.label.toLowerCase()} — not a flaw, just where a little more reflection will pay off most.`
}

/** Pure synthesis — deterministic, no I/O. */
export function buildReflection(answers: Answers): Reflection {
  const dimensions = DIMENSION_ORDER.map((d) => dimensionReading(d, answers))

  // Thinnest first, among the rated grounds only; the positions follow in the
  // map's own order, so their work is still offered but never as a gap.
  // Stable on ties, so two equally thin grounds keep the map's own order
  // rather than flickering between readings.
  const rated = DIMENSION_ORDER.filter((d) => !POSITIONS.has(d))
  const thinnest = [
    ...rated.sort((a, b) => strength(a, answers) - strength(b, answers)),
    ...DIMENSION_ORDER.filter((d) => POSITIONS.has(d)),
  ]
  const byDim = new Map(dimensions.map((d) => [d.dimension, d]))
  const low = byDim.get(thinnest[0])!
  const top = byDim.get(thinnest[rated.length - 1])!
  const shape = shapeOf(dimensions)

  const coreValues = collectTags(
    answers,
    ['intention', 'faith', 'vision', 'character'],
    6,
  )

  return {
    headline: headlineFor(shape),
    summary: summaryFor(shape, top, low, answers),
    dimensions,
    thinnest,
    coreValues,
    nonNegotiables: nonNegotiables(answers),
    growthNote: growthNote(answers),
    alignment: alignmentParagraph(answers),
  }
}

/** One dated reading, kept so the next one can say what changed. */
export function snapshotOf(answers: Answers, date: string): MapSnapshot {
  const r = buildReflection(answers)
  const grounds: Partial<Record<Dimension, GroundState>> = {}
  for (const d of r.dimensions) if (d.state) grounds[d.dimension] = d.state
  // Only the map's own answers — the hook is asked before the map and is not
  // part of it. How you'd live used to be excluded here too; it is in chapter
  // two now (docs/PRODUCT.md), so whose house she pictures is something the
  // next reading can say has changed.
  const own: Answers = {}
  for (const q of allQuestions) if (answers[q.id] !== undefined) own[q.id] = answers[q.id]
  return { date, headline: r.headline, grounds, answers: own }
}

/** One answer, as she would read it back. */
function answerLabel(q: Question, value: AnswerValue | undefined): string | null {
  if (value === undefined || value === null || value === '') return null
  if (q.type === 'scale' && typeof value === 'number' && q.scale) return `${value} of ${q.scale.max}`
  if (q.type === 'text') return typeof value === 'string' ? `“${value.trim()}”` : null
  if (q.type === 'multi' && Array.isArray(value)) {
    const labels = value.map((id) => optionById(q, id)?.label).filter((l): l is string => !!l)
    return labels.length ? labels.join(', ') : null
  }
  if (typeof value === 'string') return optionById(q, value)?.label ?? null
  return null
}

export interface AnswerChange {
  /** The question, as it was asked. */
  prompt: string
  then: string
  now: string
}

export interface GroundChange {
  label: string
  then: GroundState
  now: GroundState
}

/**
 * What changed between two readings — the honest form of growth.
 *
 * A delta on a number told her she had moved seven points and nothing about
 * what moved. This says it: the answer she gave then, and the one she gives
 * now. A legacy snapshot with no answers yields nothing, rather than a guess.
 */
export function changesBetween(
  then: MapSnapshot | undefined,
  now: MapSnapshot,
): { answers: AnswerChange[]; grounds: GroundChange[] } {
  if (!then || !then.answers || Object.keys(then.answers).length === 0) return { answers: [], grounds: [] }
  const answers: AnswerChange[] = []
  for (const q of allQuestions) {
    const a = answerLabel(q, then.answers[q.id])
    const b = answerLabel(q, now.answers[q.id])
    if (a && b && a !== b) answers.push({ prompt: q.prompt, then: a, now: b })
  }
  const grounds: GroundChange[] = []
  for (const dim of DIMENSION_ORDER) {
    const a = then.grounds?.[dim]
    const b = now.grounds?.[dim]
    if (a && b && a !== b) grounds.push({ label: DIMENSION_LABELS[dim], then: a, now: b })
  }
  return { answers, grounds }
}

/**
 * Async entry point used by the UI. Local synthesis — and it stays local; see
 * the seam note at the top of this file and docs/PRODUCT.md.
 */
export async function generateReflection(answers: Answers): Promise<Reflection> {
  // Small intentional pause — this moment should feel considered, not instant.
  await new Promise((r) => setTimeout(r, 1400))
  return buildReflection(answers)
}
