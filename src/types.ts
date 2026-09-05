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
/** Upper bound on the profile age field — a two-digit sanity guard, not a limit on who belongs. */
export const MAX_AGE = 99

export interface Identity {
  firstName?: string
  gender?: Gender
  /**
   * Confirmed 18 or older. Required to continue past the first screen — a
   * marriage platform cannot be ambiguous about this, and the confirmation is
   * deliberately an explicit act rather than a buried line of terms.
   */
  adult?: boolean
  age?: number
  /** Diaspora community / scene id (see data/scenes.ts). */
  scene?: string
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
 * to unteach. Five voices are enough, and the router already picks one.
 */
export type ModeId =
  | 'auntie'
  | 'brother'
  | 'therapist'
  | 'islamic'
  | 'matchmaker'

/**
 * The one trust control that does what it says.
 *
 * This used to hold five more — an identity "verification" that recorded a
 * pledge, a serious-intention badge, wali-friendly, blur photos, a privacy
 * shield — and a score over them. Nothing enforced any of them; they were
 * promises wearing switches. They are gone. What a serious person has actually
 * done here is the ledger (src/lib/ledger.ts), and it cannot be tapped.
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

/** Her side of a two-sided Before you say yes: the code the pair lives under. */
export interface CoupleState {
  code: string
  at: string
  /** When he answered, once we have seen the joint view. */
  answered?: string
}

/** A family member has vouched for her. Only what any screen may ever show. */
export interface VouchState {
  relationship: string
  firstName: string
  at: string
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
  state: GroundState
  /** A short, human reading of where they stand. */
  note: string
}

/**
 * One piece of real work, taken up from the map's thinnest ground.
 *
 * The map names where you're thin; a step is the one honest thing you do about
 * it. Kept because a record of what you've actually done is the only evidence
 * of change the app can offer that isn't a number.
 */
export interface StepRecord {
  dimension: Dimension
  /** Day it was taken on (YYYY-MM-DD). */
  taken: string
  /** Day it was marked done — absent while it's still open. */
  done?: string
}

/**
 * Her place in the founding cohort — and the only way this app can reach a
 * person again once they close the tab.
 */
export interface WaitlistState {
  /** Email or phone, whichever she gave. */
  contact: string
  /** Diaspora community id — the city she is counted in. */
  scene?: string
  /** The code her kept map lives under, so the founder can link the two. */
  code?: string
  joinedAt: string
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
}

/**
 * The ending — what she told us on the way out.
 *
 * The success state of this product is that someone leaves because it worked,
 * and this is the only record of that ever happening. Every field is optional:
 * an exit that charges a toll in answers is not an exit. `who` is the single
 * question this company cannot answer any other way — whether the marketplace
 * caused a marriage or the instruments helped one that already existed.
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
 * number. So the snapshot keeps the answers themselves; they are thirteen
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
  /** Overall headline reading, e.g. "Grounded and ready". */
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
