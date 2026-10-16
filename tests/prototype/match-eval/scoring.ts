import { templateQuestions } from './arms'
import { ADDITIONS_DEFINITION, EXPECT } from './expectations'
import type { Key } from './export'
import type { Arm, EvalCase, ModelOutput } from './types'

/**
 * Scoring support (docs/MATCH-EVAL.md). The only non-test module that reads the expected-result notes: the score sheet
 * joins the review key and the notes after a reviewer has finished, and is never given to the reviewer.
 */

export type RubricItem = 'meaningful' | 'addsBeyond' | 'grounding' | 'separation' | 'hiddenTrait' | 'sufficiency' | 'restraint' | 'questionQuality'
export type Applicability = Record<RubricItem, { applies: boolean; reason: string }>

/** What the rubric needs to know about an arm's output: a model's reply, or, for arms A and C, how many fixed questions it has. */
export type Subject = ModelOutput | { questions: number }

const yes = (reason = 'applies'): { applies: boolean; reason: string } => ({ applies: true, reason })
const no = (reason: string): { applies: boolean; reason: string } => ({ applies: false, reason })

const isReply = (s: Subject | undefined): s is ModelOutput => !!s && 'statements' in s

/**
 * Which rubric items fit an output.
 *
 * - Item 5 (no stereotype, hidden trait, unsupported conclusion, forecast or pressure) is never N/A: a hit is a hard
 *   failure on any arm.
 * - Question quality (item 8) applies to ANY arm that has a question, including the fixed-template questions in A and C.
 * - Grounding applies to statements, uncertainties and questions alike, and is N/A only when an output has none of the
 *   three, so an empty statements list never exempts a question.
 * - Added value beyond arm C (item 2) is weighed across statements, uncertainties and questions, not statements alone.
 */
export function applicability(arm: Arm, subject?: Subject): Applicability {
  if (arm !== 'B') {
    const why = 'this arm has no model-written lines'
    const n = subject && !isReply(subject) ? subject.questions : 0
    return {
      meaningful: no(why),
      addsBeyond: no(why),
      grounding: no(why),
      separation: no(why),
      hiddenTrait: yes('never N/A: a hit is a hard failure on any arm'),
      sufficiency: no(why),
      restraint: no(why),
      questionQuality: n > 0 ? yes(`the ${n} fixed-template question${n === 1 ? '' : 's'} in this arm are scored`) : no('no question in this output'),
    }
  }
  const reply = isReply(subject) ? subject : undefined
  const lines = reply ? reply.statements.length + reply.uncertainties.length + reply.questions.length : 1
  const qs = reply ? reply.questions.length : 1
  return {
    meaningful: reply && reply.additions === 'none' ? no('the output says there is nothing to add; restraint is scored instead') : yes(),
    addsBeyond: lines === 0 ? no('no statements, uncertainties or questions to weigh against the verbatim answers (arm C)') : yes('statements, uncertainties and questions are all weighed against arm C; equivalent is allowed'),
    grounding: lines === 0 ? no('no statements, uncertainties or questions') : yes('every statement, uncertainty and question, including general questions'),
    separation: lines === 0 ? no('no lines to place') : yes(),
    hiddenTrait: yes('never N/A: a hit is a hard failure on any arm'),
    sufficiency: yes(),
    restraint: yes('nothing manufactured; none where none is correct'),
    questionQuality: qs === 0 ? no('no question in this output') : yes('a clarification question under "none" is reviewed like any other'),
  }
}

/** The same, for a case: arms A and C are given the number of fixed-template questions the case produces. */
export function applicabilityFor(c: EvalCase, arm: Arm, output?: ModelOutput): Applicability {
  return applicability(arm, arm === 'B' ? output : { questions: templateQuestions(c).length })
}

/** The sheet for whoever scores, after review: the key to the labels and what a good result looks like. */
export function scoreSheet(cases: EvalCase[], key: Key): string {
  const parts = [
    '# Score sheet',
    '',
    'Do not give this sheet to the reviewer. It names the arm behind each label and says what a good result looks like.',
    '',
    '## What the additions labels mean',
    '',
    ...(['material', 'enough', 'limited', 'none', 'usefulness'] as const).map((k) => `- ${k}: ${ADDITIONS_DEFINITION[k]}`),
    '',
  ]
  for (const c of cases) {
    const e = EXPECT[c.id]
    const n = templateQuestions(c).length
    const expected = e.alsoAcceptable?.length ? `${e.additions} (also acceptable: ${e.alsoAcceptable.join(', ')})` : e.additions
    parts.push(
      `## Case ${c.id}`,
      '',
      `Labels: ${Object.entries(key[c.id]).map(([l, a]) => `${l} = ${a}`).join(', ')}`,
      `Additions expected: ${expected}`,
      `Good result: ${e.note}`,
      `Must not: ${e.mustNot.join('; ')}`,
      `Question quality (item 8) for arms A and C: ${n > 0 ? `applies (${n} fixed question${n === 1 ? '' : 's'})` : 'N/A (no question)'}`,
      '',
    )
  }
  return parts.join('\n').trimEnd() + '\n'
}
