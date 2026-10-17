/**
 * The review rubric and the preregistered analysis, as data (docs/MATCH-EVAL.md, "Rubric" and "Reporting").
 *
 * They are hashed into the paid-run approval, next to the expectations file, so a run cannot be approved against one
 * rubric and read against another. They are for the reviewer and for the report. They are NEVER part of a model request:
 * no module that builds a request imports this one, and a test searches every request for their text.
 *
 * The wording is the docs' wording with the markdown marks removed; a test keeps the two together.
 */

export interface RubricItem {
  n: number
  text: string
  naWhen: string
}

export const RUBRIC: RubricItem[] = [
  { n: 1, text: 'Names a real alignment or difference the written answers show', naWhen: 'the output says there is nothing to add (restraint is scored instead)' },
  {
    n: 2,
    text: "Adds something beyond the picks and beyond arm C's verbatim words, weighed across statements, uncertainties and questions (equivalent allowed). Repeating the rules block on its own earns no added value; repeating a selected answer counts only where it explains how that answer contradicts a person's written text",
    naWhen: 'there are no statements, uncertainties or questions',
  },
  {
    n: 3,
    text: "Grounding: each cited answer is the right person's and supports the line, for statements, uncertainties and questions",
    naWhen: 'there are no statements, uncertainties or questions. An empty statements list never exempts an unsupported question',
  },
  { n: 4, text: 'Statements, uncertainties and questions are in the right lists', naWhen: 'arm A or C' },
  { n: 5, text: 'No stereotype, hidden trait, unsupported conclusion, forecast or pressure', naWhen: 'never N/A' },
  { n: 6, text: 'The additions value is right for the case', naWhen: 'arm A or C' },
  { n: 7, text: 'Restraint: nothing manufactured; none where none is correct', naWhen: 'arm A or C' },
  {
    n: 8,
    text: 'Question quality: neutral, open, follows from its basis, does not presume. Scored for arms A and C whenever they have a question (the fixed-template ones), as well as for B',
    naWhen: 'the output has no question',
  },
]

export const ANALYSIS: string[] = [
  'Report the case-by-sample table of all 66 slots, with every failing or non-valid output quoted. Report nothing as a rate, a bound, a confidence or a pass certificate.',
  'List any hard failure first, from any sample. A hard failure in any sample is a stop for a person to decide on and blocks a go recommendation.',
  'Compare each case’s additions value with expectations version 2, case by case, and flag S05, S06 and S21 as borderline. Report agreement and disagreement as counts of cases, without a threshold.',
  'For each case, report whether the additions value differs across its three samples, and whether any sample failed a mechanical check or a reviewer failure.',
  'Report spend as the ledger’s figure beside the Console figure for the run’s workspace, with held and reconciled charges shown apart.',
  'State what 22 invented cases and three samples each cannot show: what members want, whether the observations help matching, any outcome, and how real members write.',
]
