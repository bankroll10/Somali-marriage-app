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
  /**
   * 0–1. How much this answer says he is doing the thing this dimension
   * measures — an editorial ordering of the options, never measured against
   * an outcome (docs/PRODUCT.md S4). `null` when the answer says nothing
   * about him at all, which is not scored rather than scored as half.
   */
  weight: number | null
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

/**
 * Where his side of a question is not her side with the pronouns flipped.
 *
 * Most of the eleven transfer: whether the other person has named a timeline,
 * met you properly, or keeps the plans they make reads the same from either
 * side. Three do not, because the road itself is not symmetric — see the
 * `man` entries in TEMPLATE below.
 *
 * Options are merged by id, never replaced, so a variant can change what an
 * answer says and what it is worth but can never change which answers exist.
 * A read kept from either side therefore stays readable by the other, and
 * `src/lib/read.ts`'s named cases (`explicit`, `blames`, `nobody`) keep
 * meaning what they mean. Held by tests/invariants/both-sides.test.ts.
 */
interface ManVariant {
  prompt?: string
  helper?: string
  options?: Record<string, Partial<Omit<ReadOption, 'id'>>>
}

/**
 * `consistency` was labelled "Follow-through", but two of its three answers
 * are contact, not commitment: how soon {he} texts back, and how often you
 * have met. Only `plans` is follow-through. Pursuit reported as follow-through
 * tells her the most eager man is the most committed one (docs/DECISIONS.md,
 * the commitment audit). The label now names what is counted.
 */
export const DIMENSION_LABEL: Record<ReadDimension, string> = {
  intent: 'Stated intention',
  public: 'Whether you exist in {his} life',
  family: 'Moving toward family',
  consistency: 'Steady contact, and plans kept',
  pressure: 'How {he} handles hard things',
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
const TEMPLATE: (ReadQuestion & { man?: ManVariant })[] = [
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
 prompt: 'Has {he} given you a timeline you could hold {him} to?',
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
    // Hidden is the sharpest signal there is for a woman, and it is not the
    // same signal for a man. Before the families have met, a woman asking for
    // discretion is usually protecting her own name in a community that will
    // discuss her either way. So his weights do not read discretion alone as
    // non-seriousness. Discretion AND nobody in her life knowing him is a
    // different thing, and src/lib/read.ts still names that combination for
    // either side.
    man: {
      helper: 'Before the families have met, some discretion is her protecting her own name. Repeated, with nobody in her life knowing you, is something else.',
      options: {
        soft: { weight: 0.65, note: 'she has asked you to hold off telling people for now' },
        explicit: { weight: 0.3, note: 'she has asked you more than once to keep this between the two of you' },
      },
    },
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
    // Asked of a man, her question inverts: it is his people who go to hers,
    // so "has she asked how to approach my family" marks him down for her
    // waiting on the step that is his. His version asks the same thing about
    // her — whether she will tell him who to speak to, and when.
    man: {
      prompt: 'When approaching her family comes up, what happens?',
      helper: 'Who you would speak to, and when. In our families this step is yours to take — what you are reading is whether she will hand it to you.',
      options: {
        how: {
          label: 'She told me who to speak to, and roughly when',
          note: 'she has told you who to approach in her family, and roughly when',
        },
        passing: {
          label: 'She is open to it — no name, no time yet',
          note: 'she is open to your approaching her family, without a name or a time yet',
        },
        no: { label: 'It has not come up', note: 'approaching her family has not come up' },
        avoids: {
          label: 'She changes the subject when it comes up',
          note: 'she moves away from the subject of her family when it comes up',
        },
      },
    },
  },
  {
    id: 'initiative',
    dimension: 'consistency',
    prompt: 'If you stop texting first, what happens?',
    helper: 'Be honest. It is a fair thing to have tested.',
    options: [
      { id: 'same-day', label: '{He} reaches out the same day', weight: 1, note: '{he} reaches out first when you stop' },
      { id: 'day-two', label: 'Within a day or two', weight: 0.75, note: '{he} comes back within a day or two on {his} own' },
      { id: 'eventually', label: 'Eventually — days later', weight: 0.3, note: 'it takes days for {him} to come back' },
      { id: 'silence', label: 'It just goes quiet', weight: 0, note: 'when you stop, it goes quiet' },
    ],
    // Her not texting first is not his red flag. Plenty of practising women
    // never open a conversation on purpose, and scoring that at zero would
    // read modesty as disinterest. Hearing nothing at all still counts — it
    // is just no longer the bottom of the scale.
    man: {
      helper: 'Be honest. Some people never text first, by habit — what you are reading is whether you hear from her at all.',
      options: {
        'day-two': { weight: 0.85 },
        eventually: { weight: 0.55 },
        silence: { label: 'It stays quiet until I start again', weight: 0.15, note: 'when you stop, it stays quiet until you start again' },
      },
    },
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
  // Not a measure of seriousness, and weighted as nothing: a man running a
  // romance scam can look like the most serious man she has met. Asked
  // because it is the one thing the worst people on a marriage platform do
  // most, and nothing else in the product could see it (docs/SECURITY.md).
  // src/lib/read.ts names `yes` whatever else he has shown.
  {
    id: 'money',
    dimension: 'context',
    prompt: 'Has {he} asked you for money — a loan, a bill, a ticket, an investment?',
    helper: 'Before your families have met.',
    options: [
      { id: 'no', label: 'No', weight: 0, note: '{he} has not asked you for money' },
      { id: 'once-small', label: 'Once, something small, and paid it back', weight: 0, note: '{he} once asked for something small, and paid it back' },
      { id: 'yes', label: 'Yes', weight: 0, note: '{he} has asked you for money before your families have met' },
    ],
  },
  {
    id: 'nonneg',
    dimension: 'pressure',
    prompt: 'Does {he} know what you will not compromise on?',
    // A plain answer that is not hers is still a straight answer. "Pushed back"
    // put honest disagreement ("that isn't me") in the same box as pressure,
    // and scored it below changing the subject (docs/DECISIONS.md Part 8).
    // The ids and weights are unchanged; the labels say what each measures.
    helper: 'The one or two things that decide it for you. A plain answer counts, even one that isn’t yours.',
    options: [
      {
        id: 'straight',
        label: 'Yes — and {he} answered straight',
        weight: 1,
        note: '{he} knows your non-negotiables and gave you a straight answer, whatever it was',
      },
      { id: 'deflected', label: 'Yes — but {he} changed the subject', weight: 0.2, note: '{he} moved away from your non-negotiables rather than answering them' },
      {
        id: 'pushed',
        label: 'Yes — and {he} keeps trying to talk me out of them',
        weight: 0.1,
        note: '{he} keeps trying to talk you out of the things you said you would not compromise on',
      },
      // Says nothing about {him}, so it is not scored — it used to count as 0.5.
      { id: 'untold', label: 'I have not told {him}', weight: null, note: 'you have not told {him} your non-negotiables yet' },
    ],
  },
  {
    id: 'hard',
    dimension: 'pressure',
    prompt: 'When you raise something difficult, what does {he} do?',
    options: [
      { id: 'listens', label: 'Listens, and comes back to it', weight: 1, note: '{he} can sit with a hard conversation and return to it' },
      // A pause that comes back is the same thing her own map calls "workable
      // and healthy" in her (src/lib/reflection.ts); "Goes quiet for a while"
      // scored it as a gap in him. Coming back is what this measures, so the
      // pause sits with coming back, and withdrawal is named as withdrawal.
      {
        id: 'defensive',
        label: 'Gets defensive or goes quiet, but comes back',
        weight: 0.7,
        note: '{he} can get defensive or go quiet at first, but does come back',
      },
      {
        id: 'quiet',
        label: 'Goes quiet, and it doesn’t come back up',
        weight: 0.3,
        note: '{he} goes quiet when something hard is raised, and it is not raised again',
      },
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

/** The questions, with pronouns resolved for whoever is reading. */
export function readQuestions(memberGender: Gender = 'woman'): ReadQuestion[] {
  const fix = speak(memberGender)
  return TEMPLATE.map(({ man, ...q }) => {
    const v = memberGender === 'man' ? man : undefined
    const helper = v?.helper ?? q.helper
    return {
      ...q,
      prompt: fix(v?.prompt ?? q.prompt),
      helper: helper ? fix(helper) : undefined,
      options: q.options.map((o) => {
        // Merged by id: a variant never adds or removes an answer.
        const merged = { ...o, ...v?.options?.[o.id] }
        return {
          ...merged,
          label: fix(merged.label),
          hint: merged.hint ? fix(merged.hint) : undefined,
          note: fix(merged.note),
        }
      }),
    }
  })
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
      'An answer, even “further out than you want”, is something you can plan around. A reply that makes the question itself feel unreasonable is an answer too. Note which one you get.',
  },
  family: {
    why: 'This step is not a formality, and asking how they would take it is how you find out whether they have thought about it.',
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
    why: 'How someone handles you at your most inconvenient is one of the clearest signs you can see before a marriage.',
    words:
      'When I bring up something that is bothering me, I come away feeling like I have done something wrong. I do not think you mean it that way — but I need you to hear that it lands like that.',
    tells:
      'Someone who can sit inside that without turning it around has just shown you, live, what this list could only ask about. Someone who cannot has shown you that too.',
  },
  early: {
    why: 'You are early. That is not a problem — it is the best time to ask, before either of you has spent months.',
    words:
      'Before we go further — can I ask what you are looking for? I would rather know now than in three months.',
    tells:
      'It is completely fair to ask this in week one, and it costs you nothing. If it is too much for them this early, you have learned that in week one rather than month six.',
  },
}

/**
 * Where his side of the script is not the mirror of hers.
 *
 * `family` is the one that cannot be flipped by pronouns: "How would you want
 * to approach my family?" is the right sentence for a woman and the wrong one
 * for a man, because in this culture it is his people who go to hers. The
 * product's own family scripts say so — src/data/families.ts has a woman
 * asking him to send his people — so handing a man her sentence would tell
 * him to wait for a step that is his to take.
 */
const SCRIPTS_MAN: Partial<Record<ReadDimension | 'early', Script>> = {
  family: {
    why: 'This step is yours to take, and asking how is not a delay. It is the step.',
    words:
      'I would rather ask you than guess. How would you want me to approach your family — who should I speak to, and when would be the right time?',
    tells:
      'Listen for whether she can tell you who. Someone who has thought about this has a name and a rough when. "Not yet" is an answer too — ask what would have to be true for it to be yet, and note whether the answer has a month in it.',
  },
}

/**
 * The script for this gap, for whoever is reading. Falls back to the shared
 * one, so a new dimension needs a man's variant only where the road differs.
 */
/**
 * The words when the thin ground is her non-negotiables — he changed the
 * subject, or keeps trying to talk her out of them — rather than how he meets
 * a complaint. SCRIPTS.pressure is written for being made to feel like the
 * problem; handed to a woman whose line he is arguing with, it asked the wrong
 * thing. Not a key of SCRIPTS: the server's list of read topics is unchanged
 * (netlify/shared/vocab.ts READ_TOPICS). Chosen in src/lib/read.ts.
 */
export const NONNEG_SCRIPT: Script = {
  why: 'What you will not compromise on is not a position to be argued down. What you need is a plain answer about where the other person stands.',
  words:
    'I’ve told you the things I won’t compromise on, and I need a plain answer — not agreement, and not an argument. Just where you stand.',
  tells:
    'Listen for a plain answer. “That’s where I am too” is one. “That isn’t me” is another, and it is one you can decide with. Changing the subject again, or arguing you out of it again, is an answer as well.',
}

export function scriptFor(key: ReadDimension | 'early', gender: Gender = 'woman'): Script {
  return (gender === 'man' ? SCRIPTS_MAN[key] : undefined) ?? SCRIPTS[key]
}

/**
 * One made-up set of answers, for the example on the tool's introduction.
 *
 * The example is built from these by the real engine every time it renders,
 * so it can never say something the read would not — a change to a weight
 * changes the example with it. Chosen to land in the middle band with the
 * timeline as the thinnest ground: real signals, one gap, and a question worth
 * asking. `src/lib/read.test.ts` pins the band, so a future change to the
 * engine cannot quietly turn the landing example into a warning.
 */
export const EXAMPLE_ANSWERS: Record<string, string> = {
  duration: 'months-3',
  named: 'after',
  timeline: 'soft',
  known: 'friends',
  secret: 'no',
  family: 'passing',
  initiative: 'day-two',
  'in-person': 'several',
  plans: 'rescheduled',
  nonneg: 'untold',
  hard: 'defensive',
  money: 'no',
}
