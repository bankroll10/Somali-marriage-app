import type { Answers, Asks, CriterionId, Side } from '../../../src/prototype/match/types'

/**
 * The shapes the MATCH-05 evaluation passes around (docs/MATCH-EVAL.md).
 *
 * Nothing here is product code: it lives under tests/ so the production build is untouched.
 */

export type CategoryId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'

/** One person's side of a synthetic pair. `words` has one slot per written prompt; `null` is "not answered". */
export interface EvalPerson {
  side: Side
  answers: Answers
  asks: Asks
  words: (string | null)[]
}

/**
 * A synthetic pair, authored for this evaluation. `them.asks` exists only so the harness can decide eligibility
 * before anything is sent; it is never shown to a model or a reviewer.
 */
export interface EvalCase {
  id: string
  category: CategoryId | 'gate'
  you: EvalPerson
  them: EvalPerson & { firstName: string }
}

export type Who = 'you' | 'them'

/** An explicit reference to an answer: one of the six points, or one of the three written answers. */
export type EvalRef = { who: Who; pick: CriterionId; quote?: string } | { who: Who; words: 0 | 1 | 2; quote?: string }

/** Whether the written answers add anything beyond the rules comparison. `none` is a correct result. */
export type Additions = 'enough' | 'limited' | 'none'

export type PointStatus = 'same' | 'different-accepted' | 'differs-preference' | 'not-compared'

export interface ModelInput {
  schema: 'match-eval-input/1'
  caseId: string
  you: { side: Side }
  them: { firstName: string; side: Side }
  points: {
    point: CriterionId
    you: string
    them: string
    yourAsk: { firm: 'requirement' | 'preference' | 'any'; accepts: string[] }
    status: PointStatus
  }[]
  written: Record<Who, { id: string; prompt: string; text: string | null }[]>
}

export interface Line {
  text: string
  basis: EvalRef[]
}
export interface QuestionLine {
  text: string
  basis: EvalRef[] | 'general'
}

export interface ModelOutput {
  schema: 'match-eval-output/1'
  caseId: string
  additions: Additions
  because: string | null
  statements: Line[]
  uncertainties: Line[]
  questions: QuestionLine[]
}

/** Soft limits: exceeding one is flagged and lowers a rating; it never rejects an output. */
export const SOFT = { statements: 4, uncertainties: 2, questions: 3, words: 40 } as const

/** The hard failures H1 to H9 (docs/MATCH-EVAL.md). A few are caught mechanically; the rest are for a reviewer. */
export type HardCode = 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7' | 'H8' | 'H9'

export const ARMS = ['A', 'B', 'C'] as const
export type Arm = (typeof ARMS)[number]

/** A request as a provider would receive it. */
export interface ProviderRequest {
  system: string
  user: string
  maxTokens: number
}
