import type { Gender } from '../types'

/**
 * The read.
 *
 * The highest-pain problem we can actually solve today is "I can't tell whether
 * he's serious." She does not need a matchmaker for it — she already has the
 * man. She needs a straight answer about what he has actually shown her, and
 * the next question to ask him.
 *
 * Three rules hold this whole file together:
 *
 *   1. Every question is about BEHAVIOUR, never about feelings. "Has he told
 *      anyone" is knowable. "Does he love you" is not, and any product that
 *      pretends otherwise is lying to a woman who is already anxious.
 *   2. We never judge his character. We do not know him. We know what he has
 *      done, and we say only that. There is no "he's a player" in this file.
 *   3. The output is useless unless it ends in words she can actually say. Every
 *      path returns a script.
 */

export type ReadDimension = 'intent' | 'public' | 'family' | 'consistency' | 'pressure'

export interface ReadOption {
  id: string
  label: string
  hint?: string
  /** 0–1. How much this answer says he is doing the thing this dimension measures. */
  weight: number
  /** What he did, stated as fact, from her side. Read back in the result. */
  note: string
}

export interface ReadQuestion {
  id: string
  dimension: ReadDimension | 'context'
  prompt: string
  helper?: string
  options: ReadOption[]
}

export const DIMENSION_LABEL: Record<ReadDimension, string> = {
  intent: 'Stated intention',
  public: 'Whether you exist in his life',
  family: 'Moving toward family',
  consistency: 'Follow-through',
  pressure: 'How he handles hard things',
}

/**
 * Pronouns for the person being read — the opposite of the member's own gender.
 * Tokens {he} {him} {his} {himself} and their capitalised forms are substituted
 * at build time so the question text below stays readable.
 */
interface Voice {
  he: string
  him: string
  his: string
  He: string
  Him: string
  His: string
}
const VOICES: Record<Gender, Voice> = {
  // A woman is reading a man.
  woman: { he: 'he', him: 'him', his: 'his', He: 'He', Him: 'Him', His: 'His' },
  // A man is reading a woman.
  man: { he: 'she', him: 'her', his: 'her', He: 'She', Him: 'Her', His: 'Her' },
}

/** Longest tokens first, so {He} can never eat the start of {His}. */
function say(text: string, v: Voice): string {
  return text
    .replace(/\{His\}/g, v.His)
    .replace(/\{Him\}/g, v.Him)
    .replace(/\{He\}/g, v.He)
    .replace(/\{his\}/g, v.his)
    .replace(/\{him\}/g, v.him)
    .replace(/\{he\}/g, v.he)
}

/**
 * The questions, in the order she should meet them: easy and factual first,
 * hardest last, once she is already being honest.
 */
const TEMPLATE: ReadQuestion[] = [
  {
    id: 'duration',
    dimension: 'context',
    prompt: 'How long have you been talking?',
    helper: 'From the first real conversation, not the first message.',
    options: [
      { id: 'weeks-0', label: 'Less than two weeks', weight: 0, note: 'you are less than two weeks in' },
      { id: 'weeks-6', label: 'Two to six weeks', weight: 0, note: 'you are a few weeks in' },
      { id: 'months-3', label: 'Two or three months', weight: 0, note: 'you are a few months in' },
      { id: 'months-plus', label: 'Longer than three months', weight: 0, note: 'you are past three months' },
    ],
  },
  {
    id: 'named',
    dimension: 'intent',
    prompt: 'Has {he} said the word marriage — without you raising it first?',
    options: [
      {
        id: 'early',
        label: 'Yes, early and clearly',
        weight: 1,
        note: '{he} named marriage {himself}, before you had to ask',
      },
      {
        id: 'after',
        label: 'Yes, but only after I brought it up',
        weight: 0.5,
        note: '{he} agreed about marriage once you raised it, but did not raise it {himself}',
      },
      {
        id: 'around',
        label: '{He} talks around it',
        hint: '“One day”, “when the time is right”, “inshaAllah”',
        weight: 0.2,
        note: '{he} talks around marriage without ever landing on it',
      },
      { id: 'no', label: 'No, never', weight: 0, note: 'the word marriage has not been said' },
    ],
  },
  {
    id: 'timeline',
    dimension: 'intent',
    prompt: 'Has {he} given you a timeline you could actually hold {him} to?',
    options: [
      {
        id: 'dated',
        label: 'Yes — a real window, with a reason behind it',
        hint: '“After I finish in June”, “before next Ramadan”',
        weight: 1,
        note: '{he} gave you a timeline with an actual date attached to it',
      },
      {
        id: 'soft',
        label: 'Roughly — “this year”, “soon”',
        weight: 0.55,
        note: '{he} has given you a rough sense of when, but nothing firm',
      },
      {
        id: 'conditional',
        label: 'Only conditions, no dates',
        hint: '“After I sort myself out”, “once work settles”',
        weight: 0.25,
        note: '{his} timeline is a list of conditions with no dates on them',
      },
      { id: 'none', label: 'No timeline at all', weight: 0, note: 'there is no timeline' },
    ],
  },
  {
    id: 'known',
    dimension: 'public',
    prompt: 'Who in {his} life knows you exist?',
    helper: 'Not by name to everyone — just, does anyone know there is someone.',
    options: [
      {
        id: 'family',
        label: '{His} family — a parent, or a sibling',
        weight: 1,
        note: '{his} family knows about you',
      },
      { id: 'friends', label: 'Close friends', weight: 0.7, note: '{his} close friends know about you' },
      { id: 'one', label: 'One friend, maybe', weight: 0.35, note: 'perhaps one friend knows about you' },
      { id: 'nobody', label: 'Nobody, as far as I know', weight: 0, note: 'nobody in {his} life knows you exist' },
    ],
  },
  {
    id: 'secret',
    dimension: 'public',
    prompt: 'Has {he} asked you to keep this between the two of you?',
    options: [
      { id: 'no', label: 'No', weight: 1, note: '{he} has never asked you to keep this hidden' },
      {
        id: 'soft',
        label: 'Sort of — “let’s not tell people yet”',
        weight: 0.4,
        note: '{he} has asked you to hold off telling people',
      },
      {
        id: 'explicit',
        label: 'Yes, clearly, and more than once',
        weight: 0,
        note: '{he} has asked you more than once to keep this hidden',
      },
    ],
  },
  {
    id: 'family',
    dimension: 'family',
    prompt: 'Has {he} asked about your family?',
    helper: 'How to approach them, who to speak to, what they would expect.',
    options: [
      {
        id: 'how',
        label: 'Yes — {he} asked how to approach them',
        weight: 1,
        note: '{he} has asked how to approach your family',
      },
      {
        id: 'passing',
        label: 'In passing, once',
        weight: 0.45,
        note: '{he} has asked about your family once, in passing',
      },
      { id: 'no', label: 'No', weight: 0, note: '{he} has not asked about your family' },
      {
        id: 'avoids',
        label: '{He} changes the subject when it comes up',
        weight: 0,
        note: '{he} moves away from the subject of your family when it comes up',
      },
    ],
  },
  {
    id: 'initiative',
    dimension: 'consistency',
    prompt: 'If you stop texting first, what happens?',
    helper: 'Be honest. Most of us have tested this at least once.',
    options: [
      { id: 'same-day', label: '{He} reaches out the same day', weight: 1, note: '{he} reaches out first when you stop' },
      { id: 'day-two', label: 'Within a day or two', weight: 0.75, note: '{he} comes back within a day or two on {his} own' },
      { id: 'eventually', label: 'Eventually — days later', weight: 0.3, note: 'it takes days for {him} to come back' },
      { id: 'silence', label: 'It just goes quiet', weight: 0, note: 'when you stop, it goes quiet' },
    ],
  },
  {
    id: 'in-person',
    dimension: 'consistency',
    prompt: 'Have you met in person, properly?',
    helper: 'Arranged, in a way you were both comfortable with — not a passing hello.',
    options: [
      { id: 'several', label: 'Yes, more than once', weight: 1, note: 'you have met properly, more than once' },
      { id: 'once', label: 'Once', weight: 0.6, note: 'you have met properly once' },
      { id: 'passing', label: 'Only in passing, at something else', weight: 0.25, note: 'you have only crossed paths, never met properly' },
      { id: 'never', label: 'No — it is all messages', weight: 0, note: 'you have never met in person' },
    ],
  },
  {
    id: 'plans',
    dimension: 'consistency',
    prompt: 'Has {he} ever moved or cancelled a plan {he} made?',
    options: [
      { id: 'never', label: 'Never', weight: 1, note: '{he} keeps the plans {he} makes' },
      {
        id: 'rescheduled',
        label: 'Once — and {he} rescheduled it {himself}',
        weight: 0.85,
        note: '{he} moved a plan once and fixed it {himself} without being chased',
      },
      { id: 'few', label: 'More than once', weight: 0.2, note: '{he} has moved plans more than once' },
      { id: 'no-plans', label: '{He} does not really make plans', weight: 0, note: '{he} does not make plans in the first place' },
    ],
  },
  {
    id: 'nonneg',
    dimension: 'pressure',
    prompt: 'Does {he} know what you will not compromise on?',
    helper: 'The one or two things that decide it for you.',
    options: [
      { id: 'straight', label: 'Yes — and {he} answered straight', weight: 1, note: '{he} knows your non-negotiables and answered them straight' },
      { id: 'deflected', label: 'Yes — but {he} changed the subject', weight: 0.2, note: '{he} moved away from your non-negotiables rather than answering them' },
      { id: 'pushed', label: 'Yes — and {he} pushed back on them', weight: 0.1, note: '{he} has pushed back on the things you said you would not compromise on' },
      { id: 'untold', label: 'I have not told {him}', weight: 0.5, note: 'you have not told {him} your non-negotiables yet' },
    ],
  },
  {
    id: 'hard',
    dimension: 'pressure',
    prompt: 'When you raise something difficult, what does {he} do?',
    options: [
      { id: 'listens', label: 'Listens, and comes back to it', weight: 1, note: '{he} can sit with a hard conversation and return to it' },
      { id: 'defensive', label: 'Gets defensive, but comes back', weight: 0.7, note: '{he} gets defensive at first but does come back' },
      { id: 'quiet', label: 'Goes quiet for a while', weight: 0.3, note: '{he} goes quiet when something hard is raised' },
      { id: 'blames', label: 'I end up feeling like the problem', weight: 0, note: 'you come away from hard conversations feeling like the problem' },
    ],
  },
]

/**
 * Resolve every pronoun token for the person a member of this gender is
 * reading. Shared by every instrument that talks about "him" — the Read,
 * Before you say yes, the families' scripts — so the voice never drifts.
 */
export function speak(memberGender: Gender = 'woman'): (text: string) => string {
  const v = memberGender === 'man' ? VOICES.man : VOICES.woman
  // {himself} is the one reflexive we need and it is not worth a token of its own.
  const reflexive = memberGender === 'man' ? 'herself' : 'himself'
  return (text) => say(text.replace(/\{himself\}/g, reflexive), v)
}

/** The questions, with pronouns resolved for who she is reading. */
export function readQuestions(memberGender: Gender = 'woman'): ReadQuestion[] {
  const fix = speak(memberGender)
  return TEMPLATE.map((q) => ({
    ...q,
    prompt: fix(q.prompt),
    helper: q.helper ? fix(q.helper) : undefined,
    options: q.options.map((o) => ({
      ...o,
      label: fix(o.label),
      hint: o.hint ? fix(o.hint) : undefined,
      note: fix(o.note),
    })),
  }))
}

export const READ_QUESTION_COUNT = TEMPLATE.length

/**
 * The one question to ask next, per thin dimension.
 *
 * These are the whole point. A verdict she cannot act on is a horoscope; a
 * sentence she can say on Thursday is a product. Written to be said out loud by
 * a real person, which is why they are long and a little awkward — real ones are.
 */
export interface Script {
  /** Why this is the question that matters right now. */
  why: string
  /** Word for word. */
  words: string
  /** How to read whatever comes back. */
  tells: string
}

export const SCRIPTS: Record<ReadDimension | 'early', Script> = {
  public: {
    why: 'Everything else can wait. A person who is serious about you lets you exist in their life.',
    words:
      'I want to ask you something straight, because I would rather ask than wonder. Does anyone in your life know about me? I am not asking you to announce it tomorrow — I am asking whether you plan to, and roughly when.',
    tells:
      'A month is an answer. “Soon, inshaAllah” with nothing attached is also an answer — it is just not the one you were hoping for. Do not argue with either. Just note which one you got.',
  },
  intent: {
    why: 'You are not asking for a promise. You are asking whether you are both imagining the same thing.',
    words:
      'When you picture being married — is that this year, next year, or further out? I am not trying to hold you to a date. I just need to know whether we are imagining the same thing.',
    tells:
      'Someone who has thought about it will tell you, even if the answer is “further out than you want”. Someone who has not will make the question itself feel unreasonable. Watch which one happens.',
  },
  family: {
    why: 'In our families, this is not a formality — it is the whole road. Someone who intends to walk it has already thought about how.',
    words:
      'How would you want to approach my family? I would rather hear how you would do it than wonder whether you would.',
    tells:
      'Listen for a question back — about your father, your brother, what your family would expect. Curiosity about the how is the tell. A compliment about your family is not an answer.',
  },
  consistency: {
    why: 'You already know the words. What you need to know is whether the behaviour matches them.',
    words:
      'Can I say something? I have noticed I am usually the one who starts, and the one keeping plans moving. I am not keeping score — I just want to know whether it looks that way from your side too.',
    tells:
      'The reply matters less than the fortnight after it. Say it once, then stop starting, and watch what happens. That is your answer, and it does not require anyone to be honest with you.',
  },
  pressure: {
    why: 'How someone handles you at your most inconvenient is the single best prediction of a marriage.',
    words:
      'When I bring up something that is bothering me, I come away feeling like I have done something wrong. I do not think you mean it that way — but I need you to hear that it lands like that.',
    tells:
      'Someone who can sit inside that without turning it around has just shown you the most important thing on this whole list. Someone who cannot has shown you that too.',
  },
  early: {
    why: 'You are early. That is not a problem — it is the best time to ask, before either of you has spent months.',
    words:
      'Before we go further — can I ask what you are looking for? I would rather know now than in three months.',
    tells:
      'It is completely fair to ask this in week one, and it costs you nothing. Anyone who finds it too much this early was never going to find it comfortable later.',
  },
}
