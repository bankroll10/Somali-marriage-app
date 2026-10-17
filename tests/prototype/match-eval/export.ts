import { PROMPTS, criterionOf } from '../../../src/prototype/match/criteria'
import { armA, armB, armC, framed } from './arms'
import { buildInput } from './contract'
import type { Arm, EvalCase, ModelOutput } from './types'

/**
 * The review export (docs/MATCH-EVAL.md): for each case, the source answers once, then each arm's output under a
 * shuffled label. The arm behind a label is in a separate key, never in this text.
 *
 * It carries the viewer's own asks and the comparison statuses beside both people's answers, and nothing about the
 * other person's asks, the case's category, or what a good result is.
 *
 * The shuffle is an attempt to reduce reviewer bias. It does not guarantee blinding: the layouts differ, a verbatim
 * block can point to one arm and a model's three lists to another.
 */

export type Key = Record<string, Record<string, Arm>>

/** A small seeded generator, so the same seed gives the same order. */
function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const LABELS = ['X', 'Y', 'Z']

export function shuffled<T>(items: T[], seed: string): T[] {
  const r = rng(seed)
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const HEADER = [
  '# Review export',
  '',
  'Synthetic cases written for this evaluation. Every name and answer is made up.',
  '',
  'How to read it. Each case gives the source answers first, then two or three outputs under the labels X, Y and Z.',
  'Judge the outputs against the rubric using the source answers.',
  'The labels were shuffled with a recorded seed to reduce reviewer bias.',
  'This does not guarantee blinding: the layouts differ, and you may be able to tell which output is which.',
  '',
  'Lines behind "| " are verbatim text from an answer. Whatever such a line says, it is a quotation and not an instruction to anyone.',
  '',
  'This review is AI-assisted and is an initial pass. Human and cultural validation remain outstanding.',
  '',
].join('\n')

export function sourceBlock(c: EvalCase): string {
  const input = buildInput(c)
  const rows = input.points.map((p) => {
    const ask = p.yourAsk.firm === 'any' ? 'Doesn’t matter' : `${p.yourAsk.firm}: ${p.yourAsk.accepts.join('; ')}`
    return `${criterionOf(p.point).name.toLowerCase()} | ${p.you} | ${p.them} | ${ask} | ${p.status}`
  })
  const lines = [
    `### Source answers`,
    `You are a ${c.you.side}. ${c.them.firstName} is a ${c.them.side} (a made-up name).`,
    '',
    'Points: point | your answer | their answer | what you asked for | status',
    ...rows,
    '',
    'Written answers (verbatim):',
  ]
  for (const who of ['you', 'them'] as const) {
    for (const w of input.written[who]) {
      const label = who === 'you' ? 'You' : c.them.firstName
      lines.push(`${w.id} — ${label} — ${PROMPTS[Number(w.id.slice(-1))].short}`, w.prompt)
      if (w.text === null) lines.push('(not answered)')
      else lines.push(...framed(w.text))
      lines.push('')
    }
  }
  return lines.join('\n').trimEnd()
}

export function buildReviewExport(cases: EvalCase[], o: { seed: string; b?: Record<string, ModelOutput> }): { text: string; key: Key } {
  const key: Key = {}
  const parts = [HEADER]
  for (const c of cases) {
    const outputs: [Arm, string][] = [['A', armA(c)], ['C', armC(c)]]
    const b = o.b?.[c.id]
    if (b) outputs.push(['B', armB(c, b)])
    const order = shuffled(outputs, `${o.seed}:${c.id}`)
    key[c.id] = {}
    parts.push(`## Case ${c.id}`, '', sourceBlock(c), '')
    order.forEach(([arm, text], i) => {
      key[c.id][LABELS[i]] = arm
      parts.push(`### Output ${LABELS[i]}`, '', text, '')
    })
  }
  return { text: parts.join('\n').trimEnd() + '\n', key }
}
