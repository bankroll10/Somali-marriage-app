// Core domain types for the guided intake + reflection.

/** The dimensions we read across to synthesize a readiness reflection. */
export type Dimension =
  | 'intention'
  | 'faith'
  | 'family'
  | 'vision'
  | 'character'
  | 'emotional'
  | 'selfAwareness'

export type Gender = 'woman' | 'man'

/** Where someone is in the whole arc — see data/stages.ts. */
export type Stage = 'preparing' | 'talking' | 'deciding' | 'married'

/** Nobody under this may use Niyyah. Marriage is an adults-only process. */
export const MIN_AGE = 18

export interface Identity {
  firstName?: string
  gender?: Gender
  /**
   * Confirmed 18 or older. Required to continue past the first screen — a
   * marriage platform cannot be ambiguous about this, and the confirmation is
   * deliberately an explicit act rather than a buried line of terms.
   */
  adult?: boolean
  /** Diaspora community / scene id (see data/scenes.ts). */
  scene?: string
  /**
   * Country id (see data/countries.ts). Only asked, and only meaningful, when
   * the scene is `other` — a named city already knows its country. It picks
   * her help line. It leaves the phone only inside a map she asks us to keep;
   * never on the progress record, never to the guide.
   */
  country?: string
}

export interface CoachMessage {
  id: string
  role: 'user' | 'coach'
  text: string
}

/**
 * The guide's voices. There used to be a sixth, the Profile Coach — "help me
 * write my bio", "what should my photos show", promising to make her
 * "unmistakable" and "magnetic". It optimised self-presentation for a
 * marketplace with nobody in it, which is the one lesson this product exists
 * to unteach. The Matchmaker went the same way on 2026-09-24: it could only
 * say there was nobody to introduce. Four voices are enough, and the router
 * already picks one.
 */
export type ModeId =
  | 'auntie'
  | 'brother'
  | 'therapist'
  | 'islamic'

/**
 * The one trust control that does what it says.
 *
 * This used to hold five more — an identity "verification" that recorded a
 * pledge, a serious-intention badge, wali-friendly, blur photos, a privacy
 * shield — and a score over them. Nothing enforced any of them; they were
 * promises wearing switches. They are gone.
 */
export interface TrustSettings {
  /**
   * Keep the Guide entirely on this device.
   *
   * The live Guide writes better answers, but doing so sends her question and a
   * summary of her map to Anthropic. Rather than bury that in a policy, this
   * makes it hers to decide: on, and nothing she writes to the Guide ever
   * leaves the phone. Off by default because the live answer is genuinely
   * better, and because a choice she never sees is not a choice.
   */
  guideOnDevice: boolean
  /**
   * Count me in the ladder.
   *
   * On, and each time she reaches a new rung — said what was happening, built
   * a map, took a read, had the conversation — that rung id and the date reach
   * our side under a random code that is not her map code, and for a few rungs
   * how it came out, as ids from closed lists (src/lib/facts.ts). Nothing
   * else: no answer in her words, no name, no message, and no way back to her.
   * The Trust screen enumerates every field. It is the only way
   * to know whether this product helps anyone, which is the only way to make it
   * help more. Off, and nothing is sent, ever — the control gates the call
   * itself, not a preference we promise to honour.
   */
  countMe: boolean
}

export const defaultTrust: TrustSettings = {
  guideOnDevice: false,
  countMe: true,
}

/**
 * Which questionnaires this person has begun — ids from src/data/instruments.ts.
 * A set, never a count: added once, never removed, so it can say whether an
 * instrument gets finished and can never say how often it was opened.
 */
export type BegunInstruments = string[]

/** Her side of a two-sided Before you say yes: the code the pair lives under. */
export interface CoupleState {
  code: string
  at: string
  /** When he answered, once we have seen the joint view. */
  answered?: string
  /**
   * Which side of the pair this phone is. Absent means the one who sent it;
   * 'second' is the one who answered her link — whose Home, until 2026-09-24,
   * never knew there was a pair at all (docs/PRODUCT.md).
   */
  side?: 'second'
  /**
   * The owner key the server handed back when she made it: what lets her
   * change her side before he answers. On this phone only — the kept map
   * leaves it out (src/lib/keep.ts).
   */
  key?: string
  /**
   * The joint, once seen. It cannot change after he answers — her side is
   * frozen and his was sent once — so it is kept, and shown from here after
   * the link has ended instead of "we couldn't check". On this phone only.
   */
  joint?: Record<string, 'both-agree' | 'both-not-talked' | 'one-thinks-talked' | 'differ-somewhere' | 'unknown-somewhere'>
}

export type QuestionType = 'single' | 'multi' | 'scale' | 'text'

export interface Option {
  id: string
  label: string
  /** Optional supporting line shown under the label. */
  hint?: string
  /** Short tags surfaced as "core values" / signals in the reflection. */
  tags?: string[]
  /** Contribution toward readiness for the question's dimension, 0–1. */
  weight?: number
}

export interface ScaleConfig {
  min: number
  max: number
  /** Labels for the endpoints (and optional midpoint). */
  minLabel: string
  maxLabel: string
}

export interface Question {
  id: string
  type: QuestionType
  /** Which readiness dimension this question informs. */
  dimension: Dimension
  prompt: string
  /** A gentle clarifying line under the prompt. */
  helper?: string
  options?: Option[]
  /** For multi-select: max selectable. */
  max?: number
  scale?: ScaleConfig
  /** For text: placeholder + whether it can be skipped. */
  placeholder?: string
  optional?: boolean
}

export interface Chapter {
  id: string
  /** Small uppercase eyebrow, e.g. "01 · Niyyah". */
  kicker: string
  title: string
  /** One or two sentences that set the tone before the questions. */
  intro: string
  questions: Question[]
}

/** A single answer: index/id for single, ids for multi, number for scale, string for text. */
export type AnswerValue = string | string[] | number

export type Answers = Record<string, AnswerValue>

/**
 * Where a person stands on one ground, in a word.
 *
 * This used to be a number out of a hundred, and the map added seven of them
 * up into an overall "readiness" that animated onto the screen and was posted
 * to the server. The weights behind it were an answer key: the woman who
 * answered most honestly — returning to her deen, still healing, anxiously
 * attached — scored lowest, and then read that the number decided who she
 * meets. The read already refuses to put a number on a person. This is the
 * same rule, applied to her.
 */
export type GroundState = 'thin' | 'steady' | 'strong'

export interface DimensionReading {
  dimension: Dimension
  label: string
  /**
   * Where she stands, in a word — or `null` for a ground that is a position
   * she holds (faith, family, vision), which the map describes and never
   * rates (docs/PRODUCT.md S5).
   */
  state: GroundState | null
  /** A short, human reading of where they stand. */
  note: string
}

/**
 * A read she took on someone.
 *
 * Only her answers are kept, never the conclusion — the reading is recomputed
 * from them, so a change to how we read never leaves an old verdict frozen on
 * her screen. There is no name in here: we deliberately never ask who he is.
 */
/**
 * Something the product told her to do, and whether she did it.
 *
 * The only record here that is a claim about the world rather than about the
 * app — see src/lib/followup.ts.
 */
export interface FollowUp {
  id: string
  source: 'read' | 'beforeYes' | 'couple' | 'guide' | 'family'
  /** A topic id from data/beforeYes.ts, a read dimension, a family script id, or — from the guide — what she asked. */
  topic: string
  /**
   * The words the guide handed her, when the source is the guide. The other
   * sources look their script up by topic; the guide's words exist only in the
   * reply she was given, so they are kept here, on the device like everything
   * else in this record.
   */
  words?: string
  /** When we told her. */
  at: string
  /** 'asked' means the conversation actually happened. */
  outcome?: 'asked' | 'not-yet' | 'differently'
  outcomeAt?: string
  /**
   * A "not yet" that is not asked about again: she put it away, or it was
   * already asked a second time. An unsettled "not yet" is asked once more a
   * week later (src/lib/followup.ts).
   */
  settled?: boolean
}

/**
 * The ending — what she told us on the way out.
 *
 * The success state of this product is that someone leaves because it worked,
 * and this is the only record of that ever happening. Every field is optional:
 * an exit that charges a toll in answers is not an exit. `who` is the single
 * question this company cannot answer any other way — whether the instruments
 * helped a relationship she brought with her, or one that began elsewhere.
 */
export interface EndingRecord {
  at: string
  who?: string
  mattered?: string
  used?: string[]
  /** One line for whoever is where she was. Hers, unless she chooses to send it. */
  advice?: string
}

/**
 * A courtship that ended — what she told us on the way back to preparing.
 *
 * `from` is which stage she was in; `reason` is one of ten ids from
 * src/data/ended.ts; `which` is a second id for the three reasons that take
 * one. Every field but `at` and `from` is optional: saying why is never a
 * condition of moving on. No field here could hold his name, and none is added
 * without the Trust screen saying so in the same commit.
 */
export interface EndedRecord {
  at: string
  from: 'talking' | 'deciding'
  reason?: string
  which?: string
}

export interface ReadRecord {
  at: string
  answers: Record<string, string>
  /**
   * When she last said the read still stands. A read is about behaviour over
   * time, and a month later the behaviour may have changed; Home asks once,
   * and "still the same" is recorded here so it is not asked again for a while.
   */
  checkedAt?: string
  /**
   * The read before this one, when she took it again — so the result can say
   * what moved. Kept on this phone only: the kept map leaves it out
   * (src/lib/keep.ts), and nothing about it is sent anywhere.
   */
  previous?: { at: string; answers: Record<string, string> }
}

/**
 * How much of the guide she has used, ever.
 *
 * This used to be a monthly allowance and a no-card trial: twenty replies a
 * month, a counter in the header from ten, a wall at zero, and "no counter" as
 * the thing Niyyah+ sold. That priced the guide per reply, which means the
 * product earned when she spiralled. What is kept now is one number — replies
 * spent — and the budget it is measured against comes from her progress, not
 * from the calendar. See src/lib/budget.ts.
 */
export interface GuideUse {
  replies: number
}

export const defaultGuideUse: GuideUse = { replies: 0 }

/**
 * A dated reading, kept so the map can say what changed.
 *
 * Growth is shown as the difference between her answers then and now — "last
 * time: still healing; this time: at peace with it" — never as a delta on a
 * number. So the snapshot keeps the answers themselves; they are sixteen
 * short values and they never leave the device.
 */
export interface MapSnapshot {
  /** Date key (YYYY-MM-DD) this reading was made. */
  date: string
  headline: string
  grounds: Partial<Record<Dimension, GroundState>>
  answers: Answers
}

export interface Reflection {
  /** Overall headline reading, e.g. "On steady ground". */
  headline: string
  /** A warm paragraph synthesizing where they are. */
  summary: string
  dimensions: DimensionReading[]
  /**
   * The grounds ordered thinnest first. Internal ordering for the work card
   * and the daily reflection — it decides what to offer next, and is never
   * rendered as a ranking.
   */
  thinnest: Dimension[]
  /** Surfaced core values (from tags). */
  coreValues: string[]
  /** Their stated non-negotiables. */
  nonNegotiables: string[]
  /** A gentle growth note — the honest mirror. */
  growthNote: string
  /** What alignment looks like for this person. */
  alignment: string
}
