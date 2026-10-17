/**
 * The data model of the matching prototype (docs/MATCH-PROTOTYPE.md).
 *
 * Everything here is plain data. There is no score, no weight and no ranking:
 * a person either meets another's requirements or does not, and the rest is a
 * list of where two sets of answers are the same and where they differ.
 */

export type Side = 'woman' | 'man'

/**
 * The six points the prototype asks about. They are provisional prototype
 * choices, not launch policy. `qabiil`, `aroos-mahr`, `going-back` and
 * `families-disagree` are deliberately absent: the research ledger keeps them
 * as conversations that never become a matching signal (docs/DECISIONS.md).
 */
export const CRITERION_IDS = ['timeline', 'children', 'practice', 'city', 'work', 'household'] as const
export type CriterionId = (typeof CRITERION_IDS)[number]

/** How firm an ask is. The person chooses it, per point; no point is pre-sorted. */
export type Firmness = 'requirement' | 'preference' | 'any'

export type Answers = Record<CriterionId, string>

/** Which answers would work, and how firmly. `any` ignores `accept`. */
export interface Ask {
  accept: string[]
  firm: Firmness
}
export type Asks = Record<CriterionId, Ask>

export type PersonId = string

/** A made-up person. Ages are fictional and adult. */
export interface Person {
  id: PersonId
  firstName: string
  side: Side
  age: number
  answers: Answers
  asks: Asks
  /** Their written answers, first person. */
  words: string[]
  /** Whether this person has already chosen the tester. Hidden until both have chosen. */
  interestedInYou: boolean
  /** Lines the Prototype controls can send as this person. */
  replies: string[]
}

export type ScenarioId = 'three' | 'one' | 'none'

export interface Scenario {
  id: ScenarioId
  title: string
  /** What the tester should expect, in the tester's words. */
  expect: string
  name: string
  age: number
  answers: Answers
  asks: Asks
  words: string[]
}
