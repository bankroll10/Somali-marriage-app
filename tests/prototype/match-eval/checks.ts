import { CRITERION_IDS } from '../../../src/prototype/match/types'
import { BANNED } from '../../voice-rules'
import { SOFT, type EvalRef, type HardCode, type ModelInput, type ModelOutput, type Who } from './types'

/**
 * The mechanical checks on a model's reply (docs/MATCH-EVAL.md). They are free, deterministic and run on every output.
 *
 * What they can and cannot see:
 * - They CAN see a reply outside the schema, an eligibility or score field, a reference to an answer that is missing or
 *   blank, a quotation that is not in the cited answer, and score or percentage language in what the model wrote.
 * - They CANNOT see a sentence that gives a valid reference to the wrong person. If both people answered Work, a
 *   `who: "you"` reference can sit under text that describes the other person, and every check here passes. That is a
 *   reviewer's failure to record.
 * - They cannot see a stereotype, a hidden trait, advice to relax a requirement, an obeyed instruction or invented
 *   content. The H2 pattern list is a proxy: "an ideal pairing" gets through it.
 *
 * Rejections are hard failures and are final. Soft flags only lower a rating.
 */

export type RejectionCode =
  | 'not-json'
  | 'schema'
  | 'extra-field'
  | 'forbidden-field'
  | 'none-with-statements'
  | 'none-without-because'
  | 'missing-basis'
  | 'ref-unanswered'
  | 'quote-not-in-cited-answer'
  | 'quote-in-other-persons-answer'
  | 'h2-pattern'

export interface Rejection {
  code: RejectionCode
  hard: Extract<HardCode, 'H2' | 'H5' | 'H9'>
  detail: string
}

export type FlagCode = 'over-length' | 'array-cap' | 'voice-list' | 'enough-without-content' | 'none-many-questions'
export interface Flag {
  code: FlagCode
  detail: string
}

export type CheckResult = { ok: true; output: ModelOutput; flags: Flag[] } | { ok: false; rejections: Rejection[]; flags: Flag[] }

const HARD_OF: Record<RejectionCode, Rejection['hard']> = {
  'not-json': 'H9',
  schema: 'H9',
  'extra-field': 'H9',
  'forbidden-field': 'H9',
  'none-with-statements': 'H9',
  'none-without-because': 'H9',
  'missing-basis': 'H9',
  'ref-unanswered': 'H5',
  'quote-not-in-cited-answer': 'H5',
  'quote-in-other-persons-answer': 'H5',
  'h2-pattern': 'H2',
}

/** A proxy for H2, not a definition of it. */
export const H2_PATTERNS: [RegExp, string][] = [
  [/\d\s?%|\bper ?cent\b/i, 'a percentage'],
  [/\bcompatib/i, 'compatibility'],
  [/\b(?:perfect|great|good|strong|ideal|best|top|excellent)\s+(?:match|fit)\b/i, 'a match claim'],
  [/\b(?:likely|unlikely|bound|sure|certain|destined|set)\s+to\s+(?:last|succeed|work|fail|be happy)\b|\bwill\s+(?:last|work out|succeed|fail)\b/i, 'a forecast'],
  [/\bscor(?:e|es|ed|ing)\b|\brank(?:s|ed|ing)?\b/i, 'a score or ranking'],
  [/\b\d+\s*(?:out of|\/)\s*(?:10|ten|100)\b|\bout of (?:10|ten|100)\b/i, 'a rating out of ten or a hundred'],
  [/soulmate|made for each other/i, 'a destiny claim'],
]

const FORBIDDEN_NAME = /elig|score|rank|compat|predict|likel|percent|probab|match/i

const TOP = ['schema', 'caseId', 'additions', 'because', 'statements', 'uncertainties', 'questions']
const LINE = ['text', 'basis']
const REF = ['who', 'pick', 'words', 'quote']

/** A way to reach someone. An additional check on authored text, not proof that none is present. */
export function containsContactPattern(text: string): string | null {
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return 'email'
  if (/(?:^|\s)@\w{2,}/.test(text)) return 'handle'
  if (/(?:\+?\d[\s().-]*){7,}/.test(text)) return 'phone'
  if (/https?:\/\/|www\.|\b\w+\.(?:com|net|org|io|me|example)\b/i.test(text)) return 'link'
  return null
}

/** The text a reference points at, or null when that answer is blank. A pick is read as its label. */
export function resolveText(input: ModelInput, ref: EvalRef): string | null {
  if ('words' in ref) return input.written[ref.who][ref.words]?.text ?? null
  const p = input.points.find((x) => x.point === ref.pick)
  return p ? p[ref.who] : null
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const words = (t: string): number => t.trim().split(/\s+/).filter(Boolean).length
const other = (w: Who): Who => (w === 'you' ? 'them' : 'you')

export function checkOutput(raw: string, input: ModelInput): CheckResult {
  const rejections: Rejection[] = []
  const flags: Flag[] = []
  const reject = (code: RejectionCode, detail: string) => rejections.push({ code, hard: HARD_OF[code], detail })

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    reject('not-json', 'the reply is not a single JSON object')
    return { ok: false, rejections, flags }
  }
  if (!isObj(data)) {
    reject('not-json', 'the reply is not a JSON object')
    return { ok: false, rejections, flags }
  }

  const fieldNames = (o: Record<string, unknown>, allowed: string[], where: string) => {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) reject(FORBIDDEN_NAME.test(k) ? 'forbidden-field' : 'extra-field', `${where}: "${k}"`)
  }

  fieldNames(data, TOP, 'reply')
  if (data.schema !== 'match-eval-output/1') reject('schema', 'schema must be "match-eval-output/1"')
  if (data.caseId !== input.caseId) reject('schema', `caseId must be "${input.caseId}"`)
  if (data.additions !== 'enough' && data.additions !== 'limited' && data.additions !== 'none') reject('schema', 'additions must be enough, limited or none')
  if (data.because !== null && typeof data.because !== 'string') reject('schema', 'because must be a string or null')

  type Parsed = { text: string; basis: EvalRef[] | 'general'; list: 'statements' | 'uncertainties' | 'questions' }
  const lines: Parsed[] = []

  const readRef = (r: unknown, where: string): EvalRef | null => {
    if (!isObj(r)) {
      reject('schema', `${where}: a reference must be an object`)
      return null
    }
    fieldNames(r, REF, where)
    const who = r.who
    if (who !== 'you' && who !== 'them') {
      reject('schema', `${where}: who must be "you" or "them"`)
      return null
    }
    const hasPick = 'pick' in r
    const hasWords = 'words' in r
    if (hasPick === hasWords) {
      reject('schema', `${where}: give exactly one of pick or words`)
      return null
    }
    if (r.quote !== undefined && (typeof r.quote !== 'string' || r.quote === '')) {
      reject('schema', `${where}: quote must be a non-empty string`)
      return null
    }
    const quote = r.quote as string | undefined
    if (hasPick) {
      if (typeof r.pick !== 'string' || !(CRITERION_IDS as readonly string[]).includes(r.pick)) {
        reject('schema', `${where}: pick must be one of the six points`)
        return null
      }
      return { who, pick: r.pick as (typeof CRITERION_IDS)[number], ...(quote !== undefined ? { quote } : {}) }
    }
    if (r.words !== 0 && r.words !== 1 && r.words !== 2) {
      reject('schema', `${where}: words must be 0, 1 or 2`)
      return null
    }
    return { who, words: r.words, ...(quote !== undefined ? { quote } : {}) }
  }

  const readList = (key: 'statements' | 'uncertainties' | 'questions') => {
    const arr = data[key]
    if (!Array.isArray(arr)) {
      reject('schema', `${key} must be an array`)
      return
    }
    arr.forEach((item, i) => {
      const where = `${key}[${i}]`
      if (!isObj(item)) return reject('schema', `${where} must be an object`)
      fieldNames(item, LINE, where)
      if (typeof item.text !== 'string' || item.text.trim() === '') return reject('schema', `${where}: text must be a non-empty string`)
      if (key === 'questions' && item.basis === 'general') return void lines.push({ text: item.text, basis: 'general', list: key })
      if (!Array.isArray(item.basis)) return reject('schema', `${where}: basis must be an array${key === 'questions' ? ' or "general"' : ''}`)
      if (item.basis.length === 0) return reject('missing-basis', `${where}: needs at least one reference${key === 'questions' ? ' or "general"' : ''}`)
      const refs = item.basis.map((r, j) => readRef(r, `${where}.basis[${j}]`))
      if (refs.some((r) => r === null)) return
      lines.push({ text: item.text, basis: refs as EvalRef[], list: key })
    })
  }
  readList('statements')
  readList('uncertainties')
  readList('questions')

  if (rejections.some((r) => r.code === 'schema')) return { ok: false, rejections, flags }

  const statements = (data.statements as unknown[]).length
  const uncertainties = (data.uncertainties as unknown[]).length
  const questions = (data.questions as unknown[]).length
  if (data.additions === 'none') {
    if (statements > 0 || uncertainties > 0) reject('none-with-statements', '"none" cannot carry statements or uncertainties')
    if (typeof data.because !== 'string' || data.because.trim() === '') reject('none-without-because', '"none" needs a one-line reason')
  }

  // References: the answer must exist and be answered, and a quotation must be in that answer.
  for (const l of lines) {
    if (l.basis === 'general') continue
    for (const ref of l.basis) {
      const cited = resolveText(input, ref)
      const where = `${l.list}: ${ref.who}.${'words' in ref ? `w${ref.words}` : ref.pick}`
      if (cited === null) {
        reject('ref-unanswered', `${where} is not answered`)
        continue
      }
      if (ref.quote !== undefined && !cited.includes(ref.quote)) {
        const elsewhere =
          'words' in ref
            ? input.written[other(ref.who)].some((w) => w.text?.includes(ref.quote as string))
            : (input.points.find((p) => p.point === ref.pick)?.[other(ref.who)] ?? '').includes(ref.quote)
        reject(elsewhere ? 'quote-in-other-persons-answer' : 'quote-not-in-cited-answer', `${where}: “${ref.quote}”`)
      }
    }
  }

  // H2: scan what the model wrote. A quoted span is exempt only if it is an exact substring of one of the line's own
  // cited answers. Anything else in quotation marks is scanned like the rest.
  const strip = (text: string, cited: string[]): string =>
    text.replace(/“([^”]*)”|"([^"]*)"/g, (whole: string, a?: string, b?: string) => {
      const inner = a ?? b ?? ''
      return inner !== '' && cited.some((c) => c.includes(inner)) ? ' ' : whole
    })
  const scan = (text: string, cited: string[], where: string) => {
    const scanned = strip(text, cited)
    for (const [re, why] of H2_PATTERNS) if (re.test(scanned)) reject('h2-pattern', `${where}: ${why}`)
    return scanned
  }
  const citedOf = (l: Parsed): string[] => (l.basis === 'general' ? [] : l.basis.map((r) => resolveText(input, r)).filter((t): t is string => t !== null))
  const scannedLines = lines.map((l) => ({ l, scanned: scan(l.text, citedOf(l), l.list) }))
  if (typeof data.because === 'string') scan(data.because, [], 'because')

  // Soft flags.
  for (const { l, scanned } of scannedLines) {
    if (words(l.text) > SOFT.words) flags.push({ code: 'over-length', detail: `${l.list}: ${words(l.text)} words` })
    for (const [re, why] of BANNED) if (re.test(scanned)) flags.push({ code: 'voice-list', detail: `${l.list}: ${why}` })
  }
  if (statements > SOFT.statements) flags.push({ code: 'array-cap', detail: `${statements} statements` })
  if (uncertainties > SOFT.uncertainties) flags.push({ code: 'array-cap', detail: `${uncertainties} uncertainties` })
  if (questions > SOFT.questions) flags.push({ code: 'array-cap', detail: `${questions} questions` })
  if (data.additions === 'enough' && statements === 0 && uncertainties === 0 && questions === 0) flags.push({ code: 'enough-without-content', detail: '"enough" with no statement, uncertainty or question' })
  if (data.additions === 'none' && questions > 1) flags.push({ code: 'none-many-questions', detail: `${questions} questions under "none"` })

  if (rejections.length > 0) return { ok: false, rejections, flags }
  return { ok: true, output: data as unknown as ModelOutput, flags }
}
