import { allQuestions } from '../data/intake'
import { getHookOption } from '../data/hook'
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

function dimensionReading(dim: Dimension, answers: Answers): DimensionReading {
  const qs = questionsFor(dim)
  const scores: number[] = []
  for (const q of qs) {
    const s = scoreAnswer(q, answers[q.id])
    if (s != null) scores.push(s)
  }
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5
  const score = Math.round(avg * 100)
  return { dimension: dim, label: DIMENSION_LABELS[dim], score, note: dimensionNote(dim, answers) }
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
          : 'You said the expectation comes from around you rather than from inside you. That is an honest place to start, and the reason to go slowly is that a marriage entered to quiet the questions is the hardest one to leave.'
      if (why === 'ready')
        return soon
          ? 'You know why you are here and roughly when. Wanting to build a life with someone, and being able to say it plainly, is rarer than the people around you make it seem.'
          : 'You feel genuinely ready, and you are giving yourself room on the timing. That combination — clear on the why, unhurried on the when — is the strongest place anyone starts from.'
      if (why === 'lonely')
        return 'You were honest that companionship is a real part of this. It is not a lesser reason, but it is worth watching: loneliness makes almost anyone look like an answer, so let your standards do the filtering rather than your evenings.'
      return 'You are still working out whether you are ready, and you said so instead of performing certainty. Arriving honestly is worth more than arriving fast.'
    }

    case 'faith': {
      const p = a('practice')
      const central = typeof answers['faith-role'] === 'number' && (answers['faith-role'] as number) >= 4
      if (p === 'devout')
        return 'Your deen shapes your day, not just your identity. Look for someone whose practice is already theirs — you should not have to carry two people\u2019s iman.'
      if (p === 'consistent')
        return central
          ? 'You hold the core steadily and you want faith at the center of your home. Say that early; it filters more honestly than any list of qualities.'
          : 'You are consistent in the core and growing in the rest — the place most people actually are, and rarely admit to.'
      if (p === 'returning')
        return 'You said you are on the way back to your deen. That is a harder thing to write down than to feel, and the right person will meet you on that road rather than judge you for being on it.'
      return 'You were honest that faith sits lighter in practice than in identity. That clarity protects you from the specific heartbreak of marrying someone who expected a different home than the one you want.'
    }

    case 'family': {
      switch (a('family-role')) {
        case 'central':
          return 'You want your people in this from the beginning. That is not old-fashioned — it is protection, and it tells us to look for someone who expects to meet them rather than someone who flinches.'
        case 'guided':
          return 'You bring family in once it is serious. That is the balance most of this community is actually looking for, and it needs saying out loud early — quietly assuming it is how the first real clash starts.'
        case 'informed':
          return 'You keep your family informed and you lead the decision yourself. Hold that clearly: the person who respects it will respect it from day one, and the person who does not will test it slowly.'
        default:
          return 'You would rather keep this private until you are sure. That instinct usually comes from somewhere real — and it is worth knowing now whether it is protecting your peace or delaying a conversation you will still have to have.'
      }
    }

    case 'vision': {
      switch (a('children')) {
        case 'want':
          return 'You want children, God willing, and you said it without hedging. That single line quietly rules out more mismatches than any other answer on this map.'
        case 'no':
          return 'You do not see children in your future, and you said so plainly. That takes more courage to write than to think — and it belongs in the first serious conversation, not the fifth.'
        case 'open':
          return 'You are open to children with the right person. Watch for the version of that which is really "I will decide later" — the people this hurts are the ones who never said which they meant.'
        default:
          return 'You are still unsure about children. That is an honest place to be at any age, and it is the one question where "we will figure it out" has ended the most marriages.'
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
          return `You talk things through even when it is hard${nn ? `, and you named ${nn} thing${count === 1 ? '' : 's'} you will not compromise on` : ''}. How someone handles the difficult hour predicts more than how they behave in the easy ones.`
        case 'space':
          return 'You need space before you can come back to it. That is workable and healthy — as long as the person you choose knows it is a pause and not a punishment. Say it before the first argument, not during it.'
        case 'avoid':
          return 'You tend to let things pass rather than raise them. Nothing on this map is more worth working on: the things that go unsaid do not leave, they accumulate — and they surface years later wearing a different name.'
        default:
          return 'You get heated and then you repair. The repair is the part that matters, and it is a real skill — just make sure the person across from you experiences the repair as clearly as they felt the heat.'
      }
    }

    case 'emotional': {
      const h = a('healing')
      const att = a('attachment')
      const lean =
        att === 'anxious'
          ? ' Your heart leans anxious, so silence will feel like danger before it is danger — reach for your salah, a walk, a friend, before you reach for his phone.'
          : att === 'avoidant'
            ? ' You lean toward pulling back to protect your independence. Naming it out loud — "I need a moment, I am not disappearing" — is what keeps that instinct from reading as rejection.'
            : att === 'secure'
              ? ' You meet closeness steadily, which is a real gift to whoever you choose.'
              : ' Your heart moves differently depending on the person, which means the person matters more than the pattern.'
      if (h === 'healed') return `You have done the work and you are at peace with it.${lean}`
      if (h === 'healing') return `You are still healing and you know it — which is the part most people skip.${lean}`
      if (h === 'fresh')
        return `Something recent still aches, and you said so rather than performing recovery.${lean} Move gently. The right person will not need you to be finished.`
      return `You have not looked closely at what you might still be carrying.${lean} That is worth an honest hour with yourself before it becomes someone else's to discover.`
    }

    case 'selfAwareness': {
      const own = (answers['working-on'] as string | undefined)?.trim()
      const named = own ? ' And you wrote down what you are still working on, unprompted — that is the single most attractive thing on this whole map.' : ''
      switch (a('pattern')) {
        case 'unavailable':
          return `You see your pull toward people who cannot fully show up.${named} Let availability, not chemistry, be the first filter — it is the cheapest test there is.`
        case 'rushing':
          return `You know you move fast.${named} Let this process slow you down on purpose; the right person is still there at a calmer pace.`
        case 'walls':
          return `You keep your walls up, and you said so.${named} Real closeness will ask you to lower one a little earlier than is comfortable — with someone who has earned it.`
        case 'settling':
          return `You have settled before and you do not want to again.${named} Your non-negotiables below are not too much to ask. Hold them.`
        case 'none':
          return `You have already done real work on yourself.${named} Stay honest as new things surface — they will, and that is not a failure.`
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
      'You said trusting again is the hardest part, and that you tend to choose people who cannot fully show up. Be gentle with yourself about that: someone unavailable can never actually test your trust, which makes them feel safer than they are.',
    'serious|rushing':
      'You want to know whether someone is serious, and you know you tend to move fast. Those work against each other — speed is what makes seriousness impossible to read. Slowness is not a delay here; it is the actual instrument.',
    'serious|settling':
      'You said the hardest part is knowing if someone is serious, and that you have settled before. That combination has a specific danger: when you have accepted less once, "serious enough" starts to sound like serious.',
    'family|rushing':
      'You named family pressure as the hardest part, and rushing as the pattern you want to leave. Those are connected — a clock you did not set is the most common reason good people choose fast. The pace can be yours even when the questions are not.',
    'family|settling':
      'You said the pressure from family is the hardest part, and that you have settled before. Nobody settles in a vacuum. Your non-negotiables below exist precisely so that a decision made under that weight is still your own.',
    'ready|none':
      'You are asking whether you are even ready, and you have already done real work on yourself. Notice the contradiction: people who have not done the work almost never ask that question.',
    'finding|settling':
      'You said the hardest part is finding anyone serious at all, and that you have settled before. Scarcity is what makes settling feel reasonable. A thin room is a reason to wait, not a reason to lower the bar.',
  }

  const PATTERNS: Record<string, string> = {
    unavailable:
      'You see your pull toward people who cannot fully show up. Naming it is how you start choosing differently — let availability, not chemistry, be your first filter.',
    rushing:
      'You know you tend to move fast. Let this process slow you down on purpose; the right person will still be there at a calmer pace.',
    walls:
      'You guard yourself closely. Real intimacy will ask you to lower the wall a little earlier than feels comfortable — gently, and with someone who earns it.',
    settling:
      'You have settled before. Your non-negotiables below are not too much to ask — hold them.',
    none: 'You have already done meaningful work on yourself. Stay honest as new things surface.',
  }

  let base =
    (hook && pattern ? PAIRS[`${hook}|${pattern}`] : undefined) ??
    (pattern ? PATTERNS[pattern] : undefined) ??
    'You are doing the inner work, and it shows.'

  if (working) {
    base += ` In your own words, you’re still learning to ${working
      .replace(/^I'?m still learning to\s*/i, '')
      .replace(/\.$/, '')}. That honesty is exactly what a good marriage is built on.`
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
  if (answers['money-home'] === 'expected') parts.push('someone who sends money home too, and will never resent that you do')

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

function summaryFor(
  overall: number,
  top: DimensionReading,
  low: DimensionReading,
  answers: Answers,
): string {
  const opener =
    overall >= 80
      ? 'You come to this with rare clarity.'
      : overall >= 65
        ? 'You are closer to ready than most who start this.'
        : overall >= 50
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
    summary: summaryFor(overall, top, low, answers),
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
