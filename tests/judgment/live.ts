import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { guideRequest } from '../../netlify/functions/guide'
import { localReply } from '../../src/lib/coach'
import type { CoachContext } from '../../src/data/coach'
import { CALIBRATION_MISSES_ALLOWED, OUTCOME_FILE, fatalUpstream, notEvaluated, outcomeOf, type Outcome, type RecordedError, type Stop, type Tally } from '../eval/outcome'
import { SessionError, openSession, pool, type Client, type SessionOptions } from '../eval/session'
import type { GuideCase } from '../guide-eval/cases'
import { JUDGE_MODEL } from '../guide-eval/judge'
import type { Calibration } from './calibration'
import { propertiesFor, type Theme } from './guide-map'
import { COPY_PROPERTIES, copyContext, judgeProperties, propertyFailures, propertyRegressions, type JudgedText } from './judge'
import type { LockEntry } from './lock'
import type { ScriptEntry } from './scripts'

/**
 * Relationship judgment against the live model, end to end (docs/GUIDE-EVAL.md,
 * "Relationship judgment", E, and "Outcomes").
 *
 * In order: the judge is calibrated on the lines this product removed; if it
 * misses more than the allowance the run stops there, because nothing it
 * says afterwards would be trusted and every further request would be spent
 * for nothing. Then it judges the Guide on every themed case and every
 * held-out message, and every script the content lock says has not been
 * judged since it last changed.
 *
 * Every request goes through a session (tests/eval/session.ts): a fatal
 * failure stops the run and what was completed is kept. A Guide answer that
 * could not be fetched is `unavailable` — the offline voice is not judged in
 * its place, because that would say nothing about the model — and the run
 * cannot pass on it.
 */

export interface JudgmentRow extends JudgedText {
  error?: string
}

export interface JudgmentInput {
  calibration: Calibration[]
  cases: (GuideCase & { theme?: Theme })[]
  heldOut: (GuideCase & { theme: Theme })[]
  scripts: ScriptEntry[]
}

export interface JudgmentReport {
  at: string
  judgeModel: string
  expected: number
  started: number
  /** Calibration lines the judge got wrong. */
  misses: string[]
  calibration: { pairs: number; started: number; completed: number }
  /** One row per started text, calibration pairs included. Partial when the run stopped. */
  results: JudgmentRow[]
  requests: number
  succeeded: number
  stopped: Stop | null
  errors: RecordedError[]
}

const calibrationContext = (c: Calibration) =>
  c.said === 'copy'
    ? 'A sentence the app says to a member about their own situation, their answers, or the person they are thinking of marrying.'
    : 'Words handed to a member to say, word for word, to the person they are thinking of marrying or to their family.'

export async function runJudgment(client: Client, input: JudgmentInput, width = 4, opts: SessionOptions = {}): Promise<JudgmentReport> {
  const session = openSession(client, opts)
  const misses: string[] = []
  const rows: JudgmentRow[] = []
  const calibrationRows: (JudgmentRow | undefined)[] = new Array(input.calibration.length)

  // 1. Calibrate. Both lines of a pair, or the pair is incomplete.
  const calibrationStarted = await pool(session, input.calibration, width, async (c, i) => {
    const id = `calibration-${String(i + 1).padStart(2, '0')}`
    const row: JudgmentRow = { id, kind: 'calibration', properties: [c.breaks], text: c.bad, judgement: null }
    try {
      const judgeClient = session.as(id, 'judge')
      const bad = (await judgeProperties(judgeClient, c.bad, calibrationContext(c), [c.breaks])).judgement
      const good = (await judgeProperties(judgeClient, c.good, calibrationContext(c), [c.breaks])).judgement
      if (!bad || !good) {
        row.error = 'the judge returned nothing usable for one line of the pair'
      } else {
        row.judgement = bad
        if (bad.verdicts[c.breaks]?.verdict !== 'violated') misses.push(`missed ${c.breaks} in the removed line (${c.from})`)
        if (good.verdicts[c.breaks]?.verdict === 'violated') misses.push(`called the replacement a ${c.breaks} violation (${c.from})`)
      }
    } catch (err) {
      if (!(err instanceof SessionError)) throw err
      row.error = err.message
    }
    calibrationRows[i] = row
  })
  const completedPairs = calibrationRows.filter((r): r is JudgmentRow => r !== undefined)
  rows.push(...completedPairs)
  if (!session.stopped && misses.length > CALIBRATION_MISSES_ALLOWED) {
    session.stop('judge', `the judge missed ${misses.length} calibration lines (${CALIBRATION_MISSES_ALLOWED} allowed); nothing further was judged`)
  }

  // 2. The Guide, on the themed cases and the held-out set.
  const guideItems: { c: GuideCase & { theme?: Theme }; kind: 'guide' | 'held-out' }[] = [
    ...input.cases.map((c) => ({ c, kind: 'guide' as const })),
    ...input.heldOut.map((c) => ({ c, kind: 'held-out' as const })),
  ]
  const guideRows: (JudgmentRow | undefined)[] = new Array(guideItems.length)
  const guideStarted = await pool(session, guideItems, width, async ({ c, kind }, i) => {
    const properties = propertiesFor(c.id, c.theme)
    const row: JudgmentRow = { id: c.id, kind, properties, text: '', judgement: null }
    try {
      const res = await session.as(c.id, 'guide').messages.create(guideRequest(c.mode, c.context, c.history ?? [], c.message))
      const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim()
      if (res.stop_reason === 'refusal') {
        row.source = 'offline-fallback'
        row.text = localReply(c.message, c.context as unknown as CoachContext, c.mode).text
      } else if (!text) {
        row.source = 'unavailable'
        row.error = `the model returned no text (stop_reason ${res.stop_reason})`
      } else {
        row.source = 'live'
        row.text = text
      }
    } catch (err) {
      if (!(err instanceof SessionError)) throw err
      row.source = 'unavailable'
      row.error = err.message
    }
    if (row.source !== 'unavailable') {
      const context = `An answer from the guide, in the ${c.mode} voice, to this member's message: "${c.message}". What a good answer does here: ${c.note}`
      try {
        row.judgement = (await judgeProperties(session.as(c.id, 'judge'), row.text, context, properties)).judgement
        if (!row.judgement) row.error = 'the judge declined or returned nothing usable'
      } catch (err) {
        if (!(err instanceof SessionError)) throw err
        row.error = `judge: ${err.message}`
      }
    }
    guideRows[i] = row
  })
  rows.push(...guideRows.filter((r): r is JudgmentRow => r !== undefined))

  // 3. Every script the lock says has not been judged since it changed.
  const scriptRows: (JudgmentRow | undefined)[] = new Array(input.scripts.length)
  const scriptsStarted = await pool(session, input.scripts, width, async (e, i) => {
    const row: JudgmentRow = { id: e.id, kind: 'script', properties: COPY_PROPERTIES, text: e.words, judgement: null }
    try {
      row.judgement = (await judgeProperties(session.as(e.id, 'judge'), e.words, copyContext(e), COPY_PROPERTIES)).judgement
      if (!row.judgement) row.error = 'the judge declined or returned nothing usable'
    } catch (err) {
      if (!(err instanceof SessionError)) throw err
      row.error = `judge: ${err.message}`
    }
    scriptRows[i] = row
  })
  rows.push(...scriptRows.filter((r): r is JudgmentRow => r !== undefined))

  return {
    at: new Date().toISOString(),
    judgeModel: JUDGE_MODEL,
    expected: input.calibration.length + guideItems.length + input.scripts.length,
    started: calibrationStarted + guideStarted + scriptsStarted,
    misses,
    calibration: { pairs: input.calibration.length, started: calibrationStarted, completed: completedPairs.length },
    results: rows,
    requests: session.requests,
    succeeded: session.succeeded,
    stopped: session.stopped,
    errors: session.errors,
  }
}

/** The report's numbers, in the shape the outcome is decided from. A judge-only text counts as answered when its verdict came back. */
export function tallyOf(r: JudgmentReport): Tally {
  const guide = r.results.filter((x) => x.kind === 'guide' || x.kind === 'held-out')
  const judgeOnly = r.results.filter((x) => x.kind === 'script' || x.kind === 'calibration')
  return {
    expected: r.expected,
    started: r.started,
    completed: r.results.length,
    answered: guide.filter((x) => x.source !== 'unavailable').length + judgeOnly.filter((x) => x.judgement !== null).length,
    declined: guide.filter((x) => x.source === 'offline-fallback').length,
    unavailable: guide.filter((x) => x.source === 'unavailable').length,
    judged: r.results.filter((x) => x.judgement !== null).length,
    requests: r.requests,
    succeeded: r.succeeded,
    stopped: r.stopped,
  }
}

/** The texts a baseline compares: the Guide's answers and the scripts, never the calibration lines. */
export const judgedTexts = (r: JudgmentReport): JudgedText[] => r.results.filter((x) => x.kind !== 'calibration')

// ── The suite, end to end ────────────────────────────────────────────────────

export interface JudgmentSuiteOptions {
  client: Client | null
  input: JudgmentInput
  results: string
  /** `baseline.live.json`: read when present; written only from a run that passed. */
  baseline: string
  update?: boolean
  /** `content.lock.json`, updated (scripts marked judged) only from a run that passed and only when asked. */
  lock?: { path: string; update: boolean }
  upstream?: Outcome | null
  width?: number
  session?: SessionOptions
  now?: () => Date
}

export interface JudgmentSuiteResult {
  outcome: Outcome
  report: JudgmentReport | null
  found: string[]
  files: string[]
}

export async function judgmentSuite(o: JudgmentSuiteOptions): Promise<JudgmentSuiteResult> {
  mkdirSync(o.results, { recursive: true })
  const at = (o.now ?? (() => new Date))().toISOString()
  const expected = o.input.calibration.length + o.input.cases.length + o.input.heldOut.length + o.input.scripts.length
  const write = (path: string, text: string) => {
    writeFileSync(path, text)
    return path
  }
  const finish = (outcome: Outcome, report: JudgmentReport | null, found: string[], files: string[]): JudgmentSuiteResult => {
    files.push(write(join(o.results, OUTCOME_FILE), `${JSON.stringify(outcome, null, 2)}\n`))
    return { outcome, report, found, files }
  }

  const carried = fatalUpstream(o.upstream)
  if (carried) {
    return finish(notEvaluated('judgment', at, expected, { kind: carried.kind, message: `an earlier suite in this run stopped on ${carried.kind} (${carried.message}); no request was sent`, requests: 0 }), null, [], [])
  }
  if (!o.client) {
    return finish(notEvaluated('judgment', at, expected, { kind: 'credentials', message: 'ANTHROPIC_API_KEY is not set; no request was sent', requests: 0 }), null, [], [])
  }

  const report = await runJudgment(o.client, o.input, o.width ?? 4, o.session)
  const baseline = existsSync(o.baseline) ? (JSON.parse(readFileSync(o.baseline, 'utf8')).results as JudgedText[]) : undefined
  const texts = judgedTexts(report)
  const found = propertyRegressions(texts, baseline?.filter((x) => x.kind !== 'calibration'))
  const stamp = report.at.replace(/[:.]/g, '-')
  const reportPath = join(o.results, `live-${stamp}.json`)
  const outcome = outcomeOf('judgment', at, tallyOf(report), { regressions: found, calibrationMisses: report.misses }, report.errors, reportPath)
  const files = [write(reportPath, `${JSON.stringify(report, null, 2)}\n`)]
  if (outcome.outcome === 'evaluated-pass') {
    if (o.update || !baseline) files.push(write(o.baseline, `${JSON.stringify({ at: report.at, results: texts }, null, 2)}\n`))
    if (o.lock?.update) {
      const lock: Record<string, LockEntry> = JSON.parse(readFileSync(o.lock.path, 'utf8'))
      const judged = texts.filter((r) => r.kind === 'script' && r.judgement && propertyFailures([r]).length === 0).map((r) => `script ${r.id}`)
      for (const k of judged) if (lock[k]) lock[k] = { ...lock[k], judged: true }
      files.push(write(o.lock.path, `${JSON.stringify(lock, null, 2)}\n`))
    }
  }
  return finish(outcome, report, found, files)
}
