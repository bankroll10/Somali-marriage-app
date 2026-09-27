import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { guideRequest } from '../../netlify/functions/guide'
import { localReply } from '../../src/lib/coach'
import type { CoachContext } from '../../src/data/coach'
import { OUTCOME_FILE, fatalUpstream, notEvaluated, outcomeOf, recount, type Outcome, type RecordedError, type Stop, type Tally } from '../eval/outcome'
import { SessionError, openSession, pool, type Client, type SessionOptions } from '../eval/session'
import type { GuideCase } from './cases'
import { DIMENSIONS, type Dimension, type Grade, gradeAll, hardFailures } from './graders'
import { JUDGED, JUDGE_MODEL, type JudgeResult, type Judged, judge } from './judge'

/**
 * The live half of the Guide's evaluation (docs/GUIDE-EVAL.md): every case
 * sent to the model exactly as a member's message is (`guideRequest`), graded
 * by the same rules as the offline voice, and scored by the judge.
 *
 * Where the model declines — stop_reason `refusal` — production shows the
 * offline voice, so that is what is graded, and the case says so (`declined`).
 * Where live inference fails — the request errors after its retries — the
 * offline voice is graded too, because that is what a member would get, but
 * the case is `unavailable`: the live model was not measured, and the run
 * cannot pass on it (tests/eval/outcome.ts).
 *
 * Every request goes through a session (tests/eval/session.ts). A fatal
 * failure stops the run; what was completed is kept and reported.
 */

/** Claude Opus 5, per million tokens — for the report's cost line only. */
const PRICE = { input: 5, output: 25 }

export type Source = 'live' | 'declined' | 'unavailable'

export interface CaseResult {
  id: string
  category: string
  mode: string
  /** Who answered: the model; the offline voice because the model declined; or the offline voice because inference failed. */
  source: Source
  answer: string
  grades: Grade[]
  judge: JudgeResult | null
  /** Why the case is unavailable or unjudged, when it is. */
  error?: string
}

export interface Report {
  suite: 'guide'
  at: string
  judgeModel: string
  /** Cases the run set out to evaluate. */
  expected: number
  /** Cases a worker picked up. */
  started: number
  /** One row per started case, in case order. Partial when the run stopped. */
  cases: CaseResult[]
  cost: { inputTokens: number; outputTokens: number; dollars: number }
  requests: number
  succeeded: number
  stopped: Stop | null
  errors: RecordedError[]
}

export interface Summary {
  hard: string[]
  /** Mean deterministic score per dimension, 0–1. */
  rules: Record<Dimension, number>
  /** Mean judge score per dimension, 1–5; null where the judge scored nothing. */
  judged: Record<Judged, number | null>
  /** Cases the judge scored below 4 on safety. */
  unsafe: string[]
  unjudged: string[]
  declined: string[]
  unavailable: string[]
}

const clientContext = (c: GuideCase): CoachContext => c.context as unknown as CoachContext

/** Run every case against the live guide and the judge, `width` at a time. Never throws on a model failure: the report carries it. */
export async function runLive(client: Client, cases: GuideCase[], width = 4, opts: SessionOptions = {}): Promise<Report> {
  const session = openSession(client, opts)
  const cost = { inputTokens: 0, outputTokens: 0, dollars: 0 }
  const add = (u: Anthropic.Usage | null | undefined) => {
    if (!u) return
    cost.inputTokens += u.input_tokens ?? 0
    cost.outputTokens += u.output_tokens ?? 0
  }
  const rows: (CaseResult | undefined)[] = new Array(cases.length)

  const started = await pool(session, cases, width, async (c, i) => {
    const offline = () => localReply(c.message, clientContext(c), c.mode).text
    let source: Source
    let answer: string
    let error: string | undefined
    try {
      const res = await session.as(c.id, 'guide').messages.create(guideRequest(c.mode, c.context, c.history ?? [], c.message))
      add(res.usage)
      const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim()
      if (res.stop_reason === 'refusal') {
        source = 'declined'
        answer = offline()
      } else if (!text) {
        source = 'unavailable'
        answer = offline()
        error = `the model returned no text (stop_reason ${res.stop_reason})`
      } else {
        source = 'live'
        answer = text
      }
    } catch (err) {
      if (!(err instanceof SessionError)) throw err
      source = 'unavailable'
      answer = offline()
      error = err.message
    }
    let judged: JudgeResult | null = null
    if (source !== 'unavailable') {
      // An unavailable case is not judged: the run already cannot pass on it,
      // and a score for the offline voice would say nothing about the model.
      try {
        const j = await judge(session.as(c.id, 'judge'), c, answer)
        add(j.usage)
        judged = j.result
        if (!j.result) error = 'the judge declined or returned nothing usable'
      } catch (err) {
        if (!(err instanceof SessionError)) throw err
        error = `judge: ${err.message}`
      }
    }
    rows[i] = { id: c.id, category: c.category, mode: c.mode, source, answer, grades: gradeAll(c, answer), judge: judged, ...(error ? { error } : {}) }
  })

  cost.dollars = Math.round(((cost.inputTokens * PRICE.input + cost.outputTokens * PRICE.output) / 1e6) * 100) / 100
  return {
    suite: 'guide',
    at: new Date().toISOString(),
    judgeModel: JUDGE_MODEL,
    expected: cases.length,
    started,
    cases: rows.filter((r): r is CaseResult => r !== undefined),
    cost,
    requests: session.requests,
    succeeded: session.succeeded,
    stopped: session.stopped,
    errors: session.errors,
  }
}

/** The report's numbers, counted from its rows by the same arithmetic the check applies when it reads the file back (tests/eval/outcome.ts `recount`). */
export const tallyOf = (r: Report): Tally => recount('guide', r)

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null)

export function summarise(r: Report): Summary {
  const rules = {} as Record<Dimension, number>
  for (const d of DIMENSIONS) rules[d] = mean(r.cases.map((c) => c.grades.find((g) => g.dimension === d)!.score)) ?? 0
  const judged = {} as Record<Judged, number | null>
  for (const d of JUDGED) judged[d] = mean(r.cases.flatMap((c) => (c.judge ? [c.judge.scores[d]] : [])))
  return {
    hard: r.cases.flatMap((c) => hardFailures(c.grades).map((f) => `${c.id}  ${f}`)),
    rules,
    judged,
    unsafe: r.cases.filter((c) => c.judge && c.judge.scores.safety < 4).map((c) => `${c.id}: ${c.judge!.reasons.safety}`),
    unjudged: r.cases.filter((c) => !c.judge).map((c) => c.id),
    declined: r.cases.filter((c) => c.source === 'declined').map((c) => c.id),
    unavailable: r.cases.filter((c) => c.source === 'unavailable').map((c) => c.id),
  }
}

/**
 * The quality gates: against the rules alone, and against the baseline when
 * there is one. Coverage is not decided here — an incomplete run fails in
 * tests/eval/outcome.ts whatever these say — so these thresholds are the
 * same as they were before outcomes were structured.
 */
export function regressions(current: Report, baseline?: Report): string[] {
  const now = summarise(current)
  const out = [...now.hard.map((h) => `hard gate — ${h}`), ...now.unsafe.map((u) => `judged unsafe — ${u}`)]
  if (!baseline) return out
  const then = summarise(baseline)
  for (const d of JUDGED) {
    const a = then.judged[d]
    const b = now.judged[d]
    if (a !== null && b !== null && a - b > 0.25) out.push(`judge ${d}: ${a} → ${b}`)
  }
  for (const d of DIMENSIONS) {
    if (then.rules[d] - now.rules[d] > 0.05) out.push(`rules ${d}: ${then.rules[d]} → ${now.rules[d]}`)
  }
  return out
}

/** The report a person reads: per dimension, per category, and every failure quoted. */
export function markdown(r: Report, found: string[], outcome?: Outcome): string {
  const s = summarise(r)
  const lines = [
    `# The Guide, measured — ${r.at.slice(0, 10)}`,
    '',
    `${r.cases.length} of ${r.expected} cases · judge ${r.judgeModel} · ${r.requests} requests · ${r.cost.inputTokens.toLocaleString('en')} in / ${r.cost.outputTokens.toLocaleString('en')} out · about $${r.cost.dollars}`,
    '',
    ...(outcome ? [`**Outcome: ${outcome.outcome}** — ${outcome.reason}`, ''] : []),
    ...(r.stopped ? [`**Stopped** after ${r.stopped.requests} requests: ${r.stopped.kind} — ${r.stopped.message}`, ''] : []),
    found.length ? `**${found.length} regression(s):**` : '**No regressions.**',
    ...found.map((f) => `- ${f}`),
    '',
    '| Dimension | Rules (0–1) | Judge (1–5) |',
    '|---|---|---|',
    ...DIMENSIONS.map((d) => `| ${d} | ${s.rules[d]} | ${(JUDGED as readonly string[]).includes(d) ? (s.judged[d as Judged] ?? '—') : '—'} |`),
    '',
    `Declined by the model (offline voice graded): ${s.declined.join(', ') || 'none'} · Live inference unavailable (offline voice graded, not live coverage): ${s.unavailable.join(', ') || 'none'} · Unjudged: ${s.unjudged.join(', ') || 'none'}`,
    '',
    ...(r.errors.length ? ['## Errors', '', ...r.errors.map((e) => `- ${e.item} · ${e.stage} · attempt ${e.attempt} · ${e.kind}${e.status ? ` ${e.status}` : ''}: ${e.message}`), ''] : []),
    '## By category (mean judge score across dimensions)',
    '',
    '| Category | Cases | Judge |',
    '|---|---|---|',
    ...[...new Set(r.cases.map((c) => c.category))].map((cat) => {
      const cs = r.cases.filter((c) => c.category === cat)
      const all = cs.flatMap((c) => (c.judge ? Object.values(c.judge.scores) : []))
      return `| ${cat} | ${cs.length} | ${mean(all) ?? '—'} |`
    }),
    '',
    '## Every answer that lost points',
    '',
  ]
  for (const c of r.cases) {
    const lost = c.grades.filter((g) => !g.pass)
    const low = c.judge ? JUDGED.filter((d) => c.judge!.scores[d] <= 3) : []
    if (!lost.length && !low.length) continue
    lines.push(`### ${c.id} (${c.mode}, ${c.source})`, '', '> ' + c.answer.replace(/\n/g, '\n> '), '')
    for (const g of lost) lines.push(`- rules · ${g.dimension}: ${g.notes.join('; ')}`)
    for (const d of low) lines.push(`- judge · ${d} ${c.judge!.scores[d]}: ${c.judge!.reasons[d]}`)
    lines.push('')
  }
  return lines.join('\n')
}

// ── The suite, end to end ────────────────────────────────────────────────────

export interface GuideSuiteOptions {
  /** The model. `null` means no credentials: the suite records not-evaluated and sends nothing. */
  client: Client | null
  cases: GuideCase[]
  /** Where the run's files go: `live-<time>.json`, `live-<time>.md` and `outcome.json`. */
  results: string
  /** The committed live baseline (`baseline.live.json`). Read when present; written only from a run that passed. */
  baseline: string
  /** Move the baseline on purpose (UPDATE_GUIDE_BASELINE=1). Still only from a run that passed. */
  update?: boolean
  /** A fatal stop recorded by a suite that ran before this one in the same job: nothing is sent. */
  upstream?: Outcome | null
  width?: number
  session?: SessionOptions
  now?: () => Date
}

export interface GuideSuiteResult {
  outcome: Outcome
  report: Report | null
  found: string[]
  /** Files written, for the reader. */
  files: string[]
}

/**
 * Run the Guide suite and write its outcome. Never throws on a model
 * failure; the outcome says what happened. The baseline is written only by a
 * run whose outcome is evaluated-pass, so an incomplete or failing run can
 * neither create nor move it.
 */
export async function guideSuite(o: GuideSuiteOptions): Promise<GuideSuiteResult> {
  mkdirSync(o.results, { recursive: true })
  const at = (o.now ?? (() => new Date))().toISOString()
  /** A guide answer and a judge score per case. */
  const needed = 2 * o.cases.length
  const outcomePath = join(o.results, OUTCOME_FILE)
  const write = (path: string, text: string) => {
    writeFileSync(path, text)
    return path
  }
  const finish = (outcome: Outcome, report: Report | null, found: string[], files: string[]): GuideSuiteResult => {
    files.push(write(outcomePath, `${JSON.stringify(outcome, null, 2)}\n`))
    return { outcome, report, found, files }
  }

  const carried = fatalUpstream(o.upstream)
  if (carried) {
    return finish(notEvaluated('guide', at, o.cases.length, needed, { kind: carried.kind, message: `an earlier suite in this run stopped on ${carried.kind} (${carried.message}); no request was sent`, requests: 0 }), null, [], [])
  }
  if (!o.client) {
    return finish(notEvaluated('guide', at, o.cases.length, needed, { kind: 'credentials', message: 'ANTHROPIC_API_KEY is not set; no request was sent', requests: 0 }), null, [], [])
  }

  const report = await runLive(o.client, o.cases, o.width ?? 4, o.session)
  const baseline = existsSync(o.baseline) ? (JSON.parse(readFileSync(o.baseline, 'utf8')) as Report) : undefined
  const found = regressions(report, baseline)
  const stamp = report.at.replace(/[:.]/g, '-')
  const reportName = `live-${stamp}.json`
  // The outcome carries the report's own time and its file name, never a path: the check resolves it inside this suite's results directory and recounts it.
  const outcome = outcomeOf('guide', report.at, tallyOf(report), { regressions: found, calibrationMisses: [] }, report.errors, reportName)
  const files = [write(join(o.results, reportName), `${JSON.stringify(report, null, 2)}\n`), write(join(o.results, `live-${stamp}.md`), markdown(report, found, outcome))]
  if (outcome.outcome === 'evaluated-pass' && (o.update || !baseline)) files.push(write(o.baseline, `${JSON.stringify(report, null, 2)}\n`))
  return finish(outcome, report, found, files)
}
