import { PROMPTS, criterionOf } from '../../../src/prototype/match/criteria'
import { compare, orList } from '../../../src/prototype/match/suggest'
import { CRITERION_IDS, type CriterionId } from '../../../src/prototype/match/types'
import { personOf, selfOf } from './cases'
import { resolveText } from './checks'
import { buildInput } from './contract'
import type { EvalCase, EvalRef, ModelOutput } from './types'

/**
 * The three arms as plain text (docs/MATCH-EVAL.md).
 *
 * - A: the rules comparison, then up to three fixed-template questions. No model, no written answers.
 * - C: A, then both people's written answers unchanged.
 * - B: the same rules comparison, then what a model wrote about the written answers.
 *
 * All three open with the same rules block, which the harness writes from the existing comparison code. A model
 * cannot change or omit it.
 *
 * Written answers are data. Nothing here evaluates, interpolates or re-parses them: lines are copied one by one behind
 * a prefix, with plain string concatenation, so an answer that looks like a heading, a template or a replacement
 * pattern is still just a quotation.
 */

/** Every verbatim line is shown behind this, so text inside an answer can never read as the document's own structure. */
export const QUOTE = '| '

/** The verbatim lines of an answer, framed. */
export function framed(text: string): string[] {
  return text.split('\n').map((line) => QUOTE + line)
}

export function rulesBlock(c: EvalCase): string {
  const cmp = compare(selfOf(c), personOf(c))
  const first = c.them.firstName
  const lines = ['Rules comparison']
  for (const id of CRITERION_IDS) {
    const name = criterionOf(id).name
    const up = cmp.lineUp.find((x) => x.id === id)
    const diff = cmp.differ.find((x) => x.id === id)
    if (up) lines.push(c.them.answers[id] === c.you.answers[id] ? `${name}: you both said “${up.theirs}”.` : `${name}: ${first} said “${up.theirs}”. That works for you.`)
    else if (diff) lines.push(`${name}: ${first} said “${diff.theirs}”. You preferred: ${orList(diff.preferred)}.`)
    else lines.push(`${name}: not compared (you marked it Doesn’t matter).`)
  }
  const missing: string[] = []
  PROMPTS.forEach((p, i) => {
    if (c.you.words[i] == null || c.you.words[i]!.trim() === '') missing.push(`You — ${p.short}`)
  })
  PROMPTS.forEach((p, i) => {
    if (c.them.words[i] == null || c.them.words[i]!.trim() === '') missing.push(`${first} — ${p.short}`)
  })
  if (missing.length > 0) lines.push(`Not answered: ${missing.join('; ')}.`)
  return lines.join('\n')
}

/**
 * One clear, neutral question for each structured topic, addressed to both people. Arm A and arm C use these same
 * questions from this one table, so they cannot drift apart. They ask; they do not steer toward an answer, name a
 * difference, or suggest what anyone should do.
 */
export const TOPIC_QUESTIONS: Record<CriterionId, string> = {
  timeline: 'When would each of you like to be married?',
  children: 'Where is each of you on children?',
  practice: 'How would each of you describe your practice day to day?',
  city: 'Where would each of you want to live?',
  work: 'What does each of you expect for your own work after marriage?',
  household: 'Who would each of you want to live with at first, if anyone?',
}

/** Fixed-template questions: one per point where the person differs from what the viewer preferred, at most three. */
export function templateQuestions(c: EvalCase): string[] {
  const cmp = compare(selfOf(c), personOf(c))
  return cmp.differ.slice(0, 3).map((d) => TOPIC_QUESTIONS[d.id])
}

export function armA(c: EvalCase): string {
  const qs = templateQuestions(c)
  const body = qs.length > 0 ? qs.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'No question comes from the rules.'
  return `${rulesBlock(c)}\n\nQuestions\n${body}`
}

function writtenBlock(c: EvalCase): string {
  const out: string[] = []
  const sides: [string, (string | null)[]][] = [['You', c.you.words], [c.them.firstName, c.them.words]]
  for (const [label, words] of sides) {
    PROMPTS.forEach((p, i) => {
      out.push(`${label} — ${p.short}`, p.label)
      const w = words[i]
      if (w == null || w.trim() === '') out.push('(not answered)')
      else out.push(...framed(w))
      out.push('')
    })
  }
  return out.join('\n').trimEnd()
}

export function armC(c: EvalCase): string {
  return `${armA(c)}\n\nWritten answers, unchanged\n${writtenBlock(c)}`
}

/** What a cited reference points at, with its owner, for a reviewer to read beside the line that cites it. */
export function citation(c: EvalCase, ref: EvalRef): string[] {
  const who = ref.who === 'you' ? 'You' : c.them.firstName
  const text = resolveText(buildInput(c), ref)
  const head = 'words' in ref ? `${who} — ${PROMPTS[ref.words].short}` : `${who} — ${criterionOf(ref.pick).name}`
  if (text === null) return [head, '(not answered)']
  return [head, ...framed(text)]
}

export function armB(c: EvalCase, out: ModelOutput): string {
  const parts = [rulesBlock(c), '', 'Additions from the written answers', `Additions: ${out.additions}${out.because ? ` — ${out.because}` : ''}`]
  const lists: [string, { text: string; basis: EvalRef[] | 'general' }[]][] = [['Statements', out.statements], ['Uncertainties', out.uncertainties], ['Questions', out.questions]]
  for (const [title, items] of lists) {
    parts.push('', title)
    if (items.length === 0) parts.push('None.')
    items.forEach((it, i) => {
      parts.push(`${i + 1}. ${it.text}`)
      if (it.basis === 'general') parts.push('   General question. Not drawn from either person’s answers.')
      else {
        parts.push('   Based on:')
        for (const ref of it.basis) for (const l of citation(c, ref)) parts.push(`   ${l}`)
      }
    })
  }
  return parts.join('\n')
}
