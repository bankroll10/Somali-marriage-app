import type { EvalCase } from '../types'
import { ApprovalRefusal, assertCountApproved, type CountApproval, type CountFacts } from './approval'
import { hashOf, sha256 } from './hash'
import { promptSha256, schemaSha256 } from './prompt'
import { buildProbes, CEILING_PROBE, type SizeProbe } from './probes'
import { RawWriteError, saveRaw, writeManifest } from './raw'
import {
  casesFileSha256,
  COUNT_URL,
  countRequestSetSha256,
  MODEL,
  PROVISIONAL_MAX_OUTPUT_TOKENS,
  requestSet,
  serialize,
  SETTINGS,
  settingsSha256,
} from './requests'
import { StoreError, type Store } from './store'
import { guardTransport, requestHeaders, type Transport } from './transport'

/**
 * The count-only command (docs/MATCH-EVAL.md, "Stage 1a").
 *
 * It calls the free counting endpoint, and only that endpoint, once for each of the 22 requests and once for each size
 * probe. It saves every raw response before parsing it, then writes ONE immutable report and its hash. The paid-run
 * command consumes that report without counting again.
 *
 * The count is an estimate (the documentation says it "might differ by a small amount"), so the report states an
 * estimated input allowance per request and never an upper bound.
 *
 * Nothing here reads the environment. The key arrives through `getKey`, which a caller passes in.
 */

export interface CountReport {
  kind: 'match-eval-count-report/1'
  countRunId: string
  model: string
  casesFileSha256: string
  promptSha256: string
  schemaSha256: string
  settingsSha256: string
  countRequestSetSha256: string
  examplesSha256: string
  endpoint: string
  /** The fields the counting body carries. */
  countedFields: string[]
  /** Generation fields the counting endpoint does not document, and so were not sent to it. */
  notCounted: { field: string; reason: string }[]
  allowancePercent: number
  items: { caseId: string; countSha256: string; inputTokens: number; allowanceTokens: number; rawBodySha256: string }[]
  /** The largest per-request allowance: what each reservation assumes for input. */
  reserveBoundTokens: number
  probes: { id: string; description: string; chars: number; inputTokens: number; rawBodySha256: string }[]
  /** The counted size of a reply that uses every stated cap in full with short references (probe `caps-short`). A ceiling below it is refused. */
  suggestedMinimumCeiling: number
  provisionalCeiling: number
  establishes: string[]
  doesNotEstablish: string[]
}

export type CountResult =
  | { status: 'completed'; reportPath: string; reportSha256: string; report: CountReport; callsMade: number }
  | { status: 'stopped'; reason: string; callsMade: number }
  | { status: 'refused'; reasons: string[] }

export interface CountOptions {
  approval: CountApproval
  today: string
  cases: EvalCase[]
  store: Store
  transport: Transport
  getKey: () => string
  clock: () => string
}

export const countDir = (id: string): string => `counts/${id}`
export const reportPath = (id: string): string => `${countDir(id)}/report.json`
export const startPath = (id: string): string => `${countDir(id)}/start.json`
export const stoppedPath = (id: string): string => `${countDir(id)}/stopped.json`

export interface CountStopped {
  reason: string
  callsMade: number
  plannedCalls: number
  at: string
}

export type CountRunStatus =
  | { status: 'not-started' }
  | { status: 'incomplete'; stopped: CountStopped | null; callsRecorded: number }
  | { status: 'complete'; reportSha256: string }
  | { status: 'corrupt'; reason: string }

/**
 * What became of a count run id. A run that started and has no report is INCOMPLETE, whether it stopped (a stop record
 * says why) or died (there is none). It is never reported as complete and its id is never free again.
 */
export function countRunStatus(store: Store, id: string): CountRunStatus {
  const start = store.read(startPath(id))
  const report = store.read(reportPath(id))
  const side = store.read(`${countDir(id)}/report.sha256`)
  if (start === null && report === null) return store.list('counts').includes(id) ? { status: 'corrupt', reason: 'the folder exists but holds no start record' } : { status: 'not-started' }
  if (start === null) return { status: 'corrupt', reason: 'there is a report but no start record' }
  if (report === null) {
    const raw = store.list(`${countDir(id)}/raw`).filter((n) => n.endsWith('.meta.json')).length
    let stopped: CountStopped | null = null
    try {
      const text = store.read(stoppedPath(id))
      stopped = text === null ? null : (JSON.parse(text) as CountStopped)
    } catch {
      stopped = null
    }
    return { status: 'incomplete', stopped, callsRecorded: raw }
  }
  if (side === null || side.trim() !== sha256(report)) return { status: 'corrupt', reason: 'the report does not match its hash file' }
  return { status: 'complete', reportSha256: sha256(report) }
}

/** The allowance for one request: its count plus a whole-number percentage, raised to the next whole token. Integers only. */
export const allowanceTokens = (count: number, percent: number): number => Math.floor((count * (100 + percent) + 99) / 100)

export function examplesSha256(probes: SizeProbe[]): string {
  return hashOf(probes.map((p) => [p.id, sha256(p.text)]))
}

/** What the count step is about to do, from the code and the cases alone. No network. */
export function countFacts(cases: EvalCase[], probes: SizeProbe[]): CountFacts & { requests: ReturnType<typeof requestSet> } {
  const requests = requestSet(cases, PROVISIONAL_MAX_OUTPUT_TOKENS)
  return {
    model: MODEL,
    casesFileSha256: casesFileSha256(),
    promptSha256: promptSha256(),
    schemaSha256: schemaSha256(),
    settingsSha256: settingsSha256(),
    countRequestSetSha256: countRequestSetSha256(requests),
    examplesSha256: examplesSha256(probes),
    countCalls: requests.length + probes.length,
    requests,
  }
}

export async function runCount(o: CountOptions): Promise<CountResult> {
  const probes = buildProbes(o.cases)
  const facts = countFacts(o.cases, probes)
  try {
    assertCountApproved(o.approval, facts, o.today)
  } catch (e) {
    if (e instanceof ApprovalRefusal) return { status: 'refused', reasons: e.reasons }
    throw e
  }
  const id = o.approval.countRunId
  if (o.store.list('counts').includes(id)) return { status: 'refused', reasons: [`count run ${id} has been used; a count run id is single-use`] }

  const jobs: { key: string; body: string }[] = [
    ...facts.requests.map((r) => ({ key: r.caseId, body: r.count })),
    // A probe is counted as plain user text: no system prompt, no settings, so the figure is the text and a little framing.
    ...probes.map((p) => ({ key: `probe:${p.id}`, body: serialize({ model: MODEL, messages: [{ role: 'user', content: p.text }] }) })),
  ]

  // The id becomes single-use HERE, durably, before the credential is requested and before anything is sent. The record
  // is created exclusively and flushed; it holds the approved configuration. There is no await between the check above and
  // this write, so of two simultaneous starts only one can create it.
  const start = {
    kind: 'match-eval-count-start/1',
    countRunId: id,
    startedAt: o.clock(),
    endpoint: COUNT_URL,
    plannedCalls: jobs.length,
    model: MODEL,
    allowancePercent: o.approval.allowancePercent,
    countedFields: ['model', 'system', 'messages', 'thinking', 'output_config'],
    casesFileSha256: facts.casesFileSha256,
    promptSha256: facts.promptSha256,
    schemaSha256: facts.schemaSha256,
    settingsSha256: facts.settingsSha256,
    countRequestSetSha256: facts.countRequestSetSha256,
    examplesSha256: facts.examplesSha256,
    approval: o.approval,
  }
  try {
    o.store.createExclusive(startPath(id), JSON.stringify(start, null, 2) + '\n')
  } catch {
    if (o.store.read(startPath(id)) !== null) return { status: 'refused', reasons: [`count run ${id} has been used; a count run id is single-use`] }
    return { status: 'refused', reasons: ['the start record could not be written, so nothing was sent and no credential was requested'] }
  }

  const send = guardTransport(o.transport, 'count')
  const dir = `${countDir(id)}/raw`
  const counts = new Map<string, { inputTokens: number; rawBodySha256: string }>()
  const stop = (reason: string, callsMade: number): CountResult => {
    // Best effort: a stop record says why a run is incomplete. Its absence still leaves the run incomplete.
    try {
      o.store.createExclusive(stoppedPath(id), JSON.stringify({ reason, callsMade, plannedCalls: jobs.length, at: o.clock() } satisfies CountStopped, null, 2) + '\n')
    } catch {
      /* the start record already makes the run visibly incomplete */
    }
    return { status: 'stopped', reason, callsMade }
  }
  let seq = 0
  for (const job of jobs) {
    seq++
    const requestSha256 = sha256(job.body)
    const meta = { kind: 'count' as const, seq, caseId: job.key, sample: null, requestSha256, savedAt: o.clock() }
    let res
    try {
      res = await send({ url: COUNT_URL, method: 'POST', headers: requestHeaders(o.getKey()), body: job.body, timeoutMs: SETTINGS.timeoutMs })
    } catch (e) {
      const error = e instanceof Error ? `${e.constructor.name}: ${e.message}` : 'the request failed'
      try {
        saveRaw(o.store, dir, { ...meta, httpStatus: null, headers: {}, error }, null)
      } catch {
        return stop('raw-write-failed', seq)
      }
      return stop('transport-error', seq)
    }
    // Save before parsing, whatever the body is.
    let saved
    try {
      saved = saveRaw(o.store, dir, { ...meta, httpStatus: res.status, headers: res.headers, error: null }, res.body)
    } catch (e) {
      if (e instanceof RawWriteError) return stop('raw-write-failed', seq)
      throw e
    }
    if (res.status !== 200) return stop(`http-${res.status}`, seq)
    let tokens: unknown
    try {
      tokens = (JSON.parse(res.body) as { input_tokens?: unknown }).input_tokens
    } catch {
      return stop('unparseable-count', seq)
    }
    if (typeof tokens !== 'number' || !Number.isSafeInteger(tokens) || tokens < 1) return stop('invalid-count', seq)
    counts.set(job.key, { inputTokens: tokens, rawBodySha256: saved.bodySha256 ?? '' })
  }

  const percent = o.approval.allowancePercent
  const items = facts.requests.map((r) => {
    const c = counts.get(r.caseId) as { inputTokens: number; rawBodySha256: string }
    return { caseId: r.caseId, countSha256: r.countSha256, inputTokens: c.inputTokens, allowanceTokens: allowanceTokens(c.inputTokens, percent), rawBodySha256: c.rawBodySha256 }
  })
  const probeRows = probes.map((p) => {
    const c = counts.get(`probe:${p.id}`) as { inputTokens: number; rawBodySha256: string }
    return { id: p.id, description: p.description, chars: p.text.length, inputTokens: c.inputTokens, rawBodySha256: c.rawBodySha256 }
  })
  const ceilingProbe = probeRows.find((p) => p.id === CEILING_PROBE) as { inputTokens: number }
  const report: CountReport = {
    kind: 'match-eval-count-report/1',
    countRunId: id,
    model: MODEL,
    casesFileSha256: facts.casesFileSha256,
    promptSha256: facts.promptSha256,
    schemaSha256: facts.schemaSha256,
    settingsSha256: facts.settingsSha256,
    countRequestSetSha256: facts.countRequestSetSha256,
    examplesSha256: facts.examplesSha256,
    endpoint: COUNT_URL,
    countedFields: ['model', 'system', 'messages', 'thinking', 'output_config'],
    notCounted: [{ field: 'max_tokens', reason: 'The counting endpoint does not document it. It adds no input tokens; it bounds output.' }],
    allowancePercent: percent,
    items,
    reserveBoundTokens: Math.max(...items.map((i) => i.allowanceTokens)),
    probes: probeRows,
    suggestedMinimumCeiling: ceilingProbe.inputTokens,
    provisionalCeiling: PROVISIONAL_MAX_OUTPUT_TOKENS,
    establishes: [
      'The documented token count of each of the 22 exact requests under the pinned model’s tokenizer, with the documented fields and without max_tokens.',
      'The counted size of five hand-built replies, so a proposed output ceiling can be compared with a reply that obeys every stated cap and with replies that do not.',
    ],
    doesNotEstablish: [
      'An upper bound on billed input: the count is an estimate that the documentation says can differ by a small amount, so each request carries an estimated allowance and every response is checked against it.',
      'An upper bound on a model’s reply: the contract has no finite maximal reply, so the output ceiling bounds cost and not validity, and truncation is recorded when it happens.',
    ],
  }
  const text = JSON.stringify(report, null, 2) + '\n'
  const reportSha256 = sha256(text)
  try {
    o.store.createExclusive(reportPath(id), text)
    o.store.createExclusive(`${countDir(id)}/report.sha256`, `${reportSha256}\n`)
    o.store.seal(reportPath(id))
    o.store.seal(`${countDir(id)}/report.sha256`)
    writeManifest(o.store, dir)
  } catch (e) {
    if (e instanceof StoreError || e instanceof RawWriteError) return stop('report-write-failed', seq)
    throw e
  }
  return { status: 'completed', reportPath: reportPath(id), reportSha256, report, callsMade: seq }
}

/** Reads the report back and checks it against its own hash file. Used by the paid-run command; it never calls the network. */
export function loadCountReport(store: Store, countRunId: string): { report: CountReport; reportSha256: string } | { error: string } {
  const text = store.read(reportPath(countRunId))
  if (text === null) {
    const st = countRunStatus(store, countRunId)
    if (st.status === 'incomplete') return { error: `count run ${countRunId} is incomplete: it started and never produced a report${st.stopped ? ` (stopped: ${st.stopped.reason} after ${st.stopped.callsMade} of ${st.stopped.plannedCalls} calls)` : ' (no stop record; it may have died)'}` }
    return { error: `there is no count report for ${countRunId}` }
  }
  const side = store.read(`${countDir(countRunId)}/report.sha256`)
  const actual = sha256(text)
  if (side === null || side.trim() !== actual) return { error: 'the count report does not match its hash file' }
  try {
    return { report: JSON.parse(text) as CountReport, reportSha256: actual }
  } catch {
    return { error: 'the count report is not JSON' }
  }
}
