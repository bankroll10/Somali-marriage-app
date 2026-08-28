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
  /** A short, self-written headline for the profile. */
  bio?: string
}

export interface CoachMessage {
  id: string
  role: 'user' | 'coach'
  text: string
}

export interface ConvMessage {
  id: string
  from: 'me' | 'them' | 'system'
  text: string
}

/** Daily check-in moods ("How's your heart today?"). */
export type MoodId = 'steady' | 'hopeful' | 'heavy' | 'overthinking'

/** One-tap daily check-in. */
export interface CheckIn {
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  mood: MoodId
}

export type ModeId =
  | 'auntie'
  | 'brother'
  | 'therapist'
  | 'islamic'
  | 'matchmaker'
  | 'profile'

export interface TrustSettings {
  identityVerified: boolean
  seriousIntention: boolean
  waliFriendly: boolean
  blurPhotos: boolean
  privacyShield: boolean
}

export const defaultTrust: TrustSettings = {
  identityVerified: false,
  seriousIntention: false,
  waliFriendly: false,
  blurPhotos: false,
  privacyShield: false,
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

export interface DimensionReading {
  dimension: Dimension
  label: string
  /** 0–100 */
  score: number
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
 * A saved place in a city that hasn't opened yet — and the only way this app can
 * reach a person again once they close the tab.
 */
export interface WaitlistState {
  email: string
  /** Diaspora community id — the demand-by-city signal. */
  scene?: string
  joinedAt: string
}

/**
 * Niyyah+ state. The trial takes no card, so there is no billing to model and
 * nothing that can lapse into a charge — it simply runs out.
 */
export interface PlusState {
  /** Day the free trial began (YYYY-MM-DD), or null when it isn't running. */
  trialStarted: string | null
  /**
   * Whether the trial has ever been taken. Separate from `trialStarted` on
   * purpose: ending early clears the run but not the record, so cancelling
   * can't be used to farm an endless string of free weeks.
   */
  trialTaken: boolean
  /** Guide replies spent this calendar month — the free allowance. */
  usage: { month: string; used: number }
}

export const defaultPlus: PlusState = {
  trialStarted: null,
  trialTaken: false,
  usage: { month: '', used: 0 },
}

/** A dated readiness reading, kept so the map can show growth over time. */
export interface MapSnapshot {
  /** Date key (YYYY-MM-DD) this reading was made. */
  date: string
  overall: number
  headline: string
}

export interface Reflection {
  /** Overall headline reading, e.g. "Grounded and ready". */
  headline: string
  /** A warm paragraph synthesizing where they are. */
  summary: string
  /** 0–100 overall readiness. */
  overall: number
  dimensions: DimensionReading[]
  /** Surfaced core values (from tags). */
  coreValues: string[]
  /** Their stated non-negotiables. */
  nonNegotiables: string[]
  /** A gentle growth note — the honest mirror. */
  growthNote: string
  /** What alignment looks like for this person. */
  alignment: string
}
