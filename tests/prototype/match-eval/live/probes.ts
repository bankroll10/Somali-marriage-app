import type { EvalCase, ModelOutput } from '../types'

/**
 * Representative large replies, built by hand from word lists and the frozen cases' own answers, for sizing the output
 * ceiling. No model output is used. They are counted by the counting endpoint as plain user text, which adds only a few
 * tokens of message framing.
 *
 * WHAT THE COUNTS CAN ESTABLISH. The token size of these specific strings under this model's tokenizer, and so whether a
 * proposed ceiling would hold a reply that obeys every cap the prompt states (`caps-quotes`), and by how much a reply
 * that ignores the caps (`beyond-caps`) would exceed it.
 *
 * WHAT THEY CANNOT. The contract has no finite maximal reply: only the line counts and the line length are capped, and
 * both are soft; a quotation, a basis list and a `because` have no cap at all. So no count here is an upper bound on what
 * a model may write. The ceiling bounds COST (billed output cannot exceed `max_tokens`); it does not guarantee a valid
 * reply. A truncated reply is recorded as its own status and is never retried or repaired. The ceiling stays provisional.
 */

export interface SizeProbe {
  id: string
  description: string
  text: string
}

const WORDS =
  'time plan home work city family question answer later soon open clear plain simple careful steady quiet daily weekly yearly small large near far first second third early late often rarely kept shared written chosen noted listed asked raised named stated'.split(
    ' ',
  )

/** `n` words, cycling the list from a start offset, so lines differ and the text is not one repeated token. */
const words = (n: number, from: number): string => Array.from({ length: n }, (_, i) => WORDS[(from + i) % WORDS.length]).join(' ')

type Ref = { who: 'you' | 'them'; words: 0 | 1 | 2; quote?: string }

function reply(counts: { s: number; u: number; q: number }, wordsPerLine: number, refs: (i: number) => Ref[]): ModelOutput {
  let k = 0
  const line = () => {
    const i = k++
    return { text: words(wordsPerLine, i * 7), basis: refs(i) }
  }
  return {
    schema: 'match-eval-output/1',
    caseId: 'PROBE',
    additions: 'enough',
    because: null,
    statements: Array.from({ length: counts.s }, line),
    uncertainties: Array.from({ length: counts.u }, line),
    questions: Array.from({ length: counts.q }, line),
  }
}

/** The longest single written answer in the cases, with who wrote it and which prompt it answers. */
export function longestAnswer(cases: EvalCase[]): { who: 'you' | 'them'; words: 0 | 1 | 2; text: string } {
  let best = { who: 'you' as 'you' | 'them', words: 0 as 0 | 1 | 2, text: '' }
  for (const c of cases) {
    for (const who of ['you', 'them'] as const) {
      c[who].words.forEach((t, i) => {
        if (t !== null && t.length > best.text.length) best = { who, words: i as 0 | 1 | 2, text: t }
      })
    }
  }
  return best
}

export function buildProbes(cases: EvalCase[]): SizeProbe[] {
  const long = longestAnswer(cases)
  const quoted = (): Ref[] => [
    { who: long.who, words: long.words, quote: long.text },
    { who: long.who, words: long.words, quote: long.text },
  ]
  const pretty = (o: ModelOutput) => JSON.stringify(o, null, 2)
  const small: ModelOutput = {
    schema: 'match-eval-output/1',
    caseId: 'PROBE',
    additions: 'limited',
    because: null,
    statements: [{ text: words(18, 3), basis: [{ who: 'them', words: 0 }] }],
    uncertainties: [],
    questions: [{ text: words(14, 9), basis: 'general' as never }],
  }
  const typographic: ModelOutput = {
    schema: 'match-eval-output/1',
    caseId: 'PROBE',
    additions: 'enough',
    because: null,
    statements: Array.from({ length: 4 }, (_, i) => {
      const t = `She wrote “I’ll decide — later, not now” and he wrote “we’ll see” (note ${i + 1}: café, naïve, façade, résumé); path C:\\notes\\${i} and a "quoted" word.\nSecond line.`
      return { text: t, basis: [{ who: 'you' as const, words: 0 as const, quote: t }] }
    }),
    uncertainties: [],
    questions: [],
  }
  return [
    { id: 'small', description: 'One statement and one general question: a typical small reply.', text: pretty(small) },
    {
      id: 'caps-short',
      description: 'Every stated cap used in full (4 statements, 2 uncertainties, 3 questions, 40 words a line), one short reference per line and no quotations.',
      text: pretty(reply({ s: 4, u: 2, q: 3 }, 40, (i) => [{ who: i % 2 === 0 ? 'you' : 'them', words: (i % 3) as 0 | 1 | 2 }])),
    },
    {
      id: 'caps-quotes',
      description: `Every stated cap used in full, and every line citing two references that each quote in full the longest written answer in the cases (${long.text.length} characters). A heavier reply that still obeys every stated line cap. Quotations are not capped, so it is not a maximum.`,
      text: pretty(reply({ s: 4, u: 2, q: 3 }, 40, quoted)),
    },
    {
      id: 'beyond-caps',
      description: 'A reply that ignores the line caps (8 statements, 4 uncertainties, 6 questions) with the same quoted references. Shows how far past a ceiling an unconstrained reply could run; it is not a maximum.',
      text: pretty(reply({ s: 8, u: 4, q: 6 }, 40, quoted)),
    },
    { id: 'typographic', description: 'Curly quotes, dashes, accents, escaped quotes, a backslash path and a newline: characters that cost more tokens than plain words.', text: pretty(typographic) },
  ]
}

/** The probe whose count sets the minimum ceiling: every stated cap used in full, with short references. A ceiling below it would truncate an ordinary full-size reply. */
export const CEILING_PROBE = 'caps-short'
