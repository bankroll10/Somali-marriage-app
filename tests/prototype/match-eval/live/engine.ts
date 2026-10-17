import { checkOutput } from '../checks'
import { buildInput } from '../contract'
import { Ledger, LedgerRefusal, type Snapshot, type TokenBound } from '../ledger'
import type { EvalCase, ModelOutput, ProviderRequest } from '../types'
import { ApprovalRefusal, assertPaidApproved, type PaidFacts, type PaidRunApproval } from './approval'
import { analysisSha256, expectationsFileSha256, rubricSha256 } from './bindings'
import { examplesSha256, loadCountReport } from './count'
import { sha256 } from './hash'
import { assertCanStart, Journal, journalPath, StartRefusal } from './journal'
import { promptSha256, schemaSha256, SYSTEM_PROMPT_PROPOSED } from './prompt'
import { buildProbes } from './probes'
import { rawBodyPath, RawWriteError, saveRaw, writeManifest } from './raw'
import { casesFileSha256, countRequestSetSha256, generationRequestSetSha256, GENERATION_URL, requestSet, SETTINGS, settingsSha256, type PlannedRequest } from './requests'
import { StoreError, type Store } from './store'
import { guardTransport, requestHeaders, TransportRefusal, TransportTimeout, type Transport, type TransportResponse } from './transport'

/**
 * The paid-run command (docs/MATCH-EVAL.md, "Stage 1a"). It is written and tested against fakes only.
 *
 * It consumes an approved, immutable count report and never counts again. Calls are sequential and are never retried.
 * Every one of the scheduled case-and-sample slots ends in the result, sent or not.
 *
 * Order, for each call, and why:
 *  1. Reserve the full permitted cost in the ledger.
 *  2. Write the reservation to the journal. If that write fails nothing is sent.
 *  3. Send.
 *  4. Save the raw response body, whatever it is, BEFORE anything parses it. If that fails the run stops and the
 *     reservation is kept.
 *  5. Parse; check the model, the usage and the input allowance; settle or hold; write the outcome to the journal.
 *
 * Anything that is not a clean 200 with valid usage keeps the whole reservation and stops the run. Billed input is
 * checked against its own request's allowance on every response, apart from the dollar cost, so a short reply cannot
 * hide an input overrun. The first response is also compared with its count: a gap beyond the tripwire stops the run
 * before the second call.
 *
 * Nothing here reads the environment. The key arrives through `getKey`.
 */

export type SlotStatus = 'valid' | 'rejected' | 'truncated' | 'refusal' | 'other-stop' | 'error' | 'timeout' | 'not-run'

export interface Slot {
  index: number
  caseId: string
  sample: number
  status: SlotStatus
  reasons: string[]
  flags: string[]
  notes: string[]
  stopReason: string | null
  httpStatus: number | null
  requestId: string | null
  inputTokens: number | null
  outputTokens: number | null
  charge: 'settled' | 'held' | 'none'
  reservedMicros: number
  chargedMicros: number
  rawBodyPath: string | null
  /** The text of the reply as received, or null when none arrived. */
  text: string | null
  output: ModelOutput | null
}

export type RunResult =
  | { status: 'completed' | 'stopped'; reason: string | null; slots: Slot[]; snapshot: Snapshot; warnings: string[]; heldMicros: number }
  | { status: 'refused-before-start'; reasons: string[]; message?: string }
  | { status: 'invalid-configuration'; reasons: string[] }

export interface RunOptions {
  approval: PaidRunApproval
  today: string
  cases: EvalCase[]
  store: Store
  transport: Transport
  getKey: () => string
  clock: () => string
}

export const runDir = (id: string): string => `runs/${id}`

/** Valid usage is two whole non-negative numbers and no cache tokens (no caching is requested). Anything else is `null`. */
export function parseUsage(u: unknown): { inputTokens: number; outputTokens: number } | null {
  const x = u as Record<string, unknown> | null
  if (!x || typeof x !== 'object') return null
  const whole = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
  if (!whole(x.input_tokens) || !whole(x.output_tokens)) return null
  for (const k of ['cache_creation_input_tokens', 'cache_read_input_tokens']) {
    const v = x[k]
    if (v !== undefined && v !== null && v !== 0) return null
  }
  return { inputTokens: x.input_tokens, outputTokens: x.output_tokens }
}

const blankSlot = (index: number, caseId: string, sample: number): Slot => ({
  index,
  caseId,
  sample,
  status: 'not-run',
  reasons: [],
  flags: [],
  notes: [],
  stopReason: null,
  httpStatus: null,
  requestId: null,
  inputTokens: null,
  outputTokens: null,
  charge: 'none',
  reservedMicros: 0,
  chargedMicros: 0,
  rawBodyPath: null,
  text: null,
  output: null,
})

/** Percentage difference test in whole numbers: is |billed - counted| more than `percent` of counted? */
export const beyondTripwire = (billed: number, counted: number, percent: number): boolean => Math.abs(billed - counted) * 100 > percent * counted

export async function runPaid(o: RunOptions): Promise<RunResult> {
  const a = o.approval
  const refuse = (reasons: string[], message?: string): RunResult => ({ status: 'refused-before-start', reasons, ...(message ? { message } : {}) })
  if (!a || typeof a !== 'object') return refuse(['there is no paid-run approval record'])

  // 1. The approved report, read back and checked against its own hash. No network.
  const loaded = loadCountReport(o.store, a.countRunId ?? '')
  if ('error' in loaded) return refuse([loaded.error])
  const { report, reportSha256 } = loaded

  // 2. Everything the approval binds, recomputed fresh from the code and the cases.
  const requests = requestSet(o.cases, a.maxOutputTokens)
  const probes = buildProbes(o.cases)
  const facts: PaidFacts = {
    model: SETTINGS.model,
    countReportSha256: reportSha256,
    countRequestSetSha256: countRequestSetSha256(requests),
    generationRequestSetSha256: generationRequestSetSha256(requests),
    casesFileSha256: casesFileSha256(),
    promptSha256: promptSha256(),
    schemaSha256: schemaSha256(),
    settingsSha256: settingsSha256(),
    expectationsSha256: expectationsFileSha256(),
    rubricSha256: rubricSha256(),
    analysisSha256: analysisSha256(),
    eligibleCases: requests.length,
    report: { allowancePercent: report.allowancePercent, suggestedMinimumCeiling: report.suggestedMinimumCeiling },
  }
  const stale: string[] = []
  const same = (label: string, have: unknown, want: unknown) => {
    if (have !== want) stale.push(`the count report's ${label} does not match what this run would send`)
  }
  same('model', report.model, facts.model)
  same('cases file hash', report.casesFileSha256, facts.casesFileSha256)
  same('prompt hash', report.promptSha256, facts.promptSha256)
  same('schema hash', report.schemaSha256, facts.schemaSha256)
  same('settings hash', report.settingsSha256, facts.settingsSha256)
  same('request set hash', report.countRequestSetSha256, facts.countRequestSetSha256)
  same('size probes hash', report.examplesSha256, examplesSha256(probes))
  const byCase = new Map(report.items.map((i) => [i.caseId, i]))
  for (const r of requests) {
    const item = byCase.get(r.caseId)
    if (!item || item.countSha256 !== r.countSha256) stale.push(`the count report has no matching count for ${r.caseId}`)
  }
  if (report.items.length !== requests.length) stale.push('the count report covers a different number of requests')
  if (stale.length > 0) return refuse(stale)
  try {
    assertPaidApproved(a, facts, o.today)
  } catch (e) {
    if (e instanceof ApprovalRefusal) return refuse(e.reasons)
    throw e
  }

  // 3. The ledger and the plan. A plan that does not fit is refused whole; nothing is reduced.
  let ledger: Ledger
  try {
    ledger = new Ledger({ limitMicros: a.limitMicros, pricing: a.pricing, maxOutputTokens: a.maxOutputTokens, today: o.today })
  } catch (e) {
    if (e instanceof LedgerRefusal) return { status: 'invalid-configuration', reasons: e.reasons }
    throw e
  }
  const countFor = new Map(requests.map((r) => [r.user, byCase.get(r.caseId)?.inputTokens ?? Number.NaN]))
  const bound: TokenBound = {
    max: report.reserveBoundTokens,
    verified: false,
    method: `an estimate: the documented token count of the exact request plus ${report.allowancePercent}%; the count can differ by a small amount, so each response is checked against its own allowance`,
    measure: (req) => countFor.get(req.user) ?? Number.NaN,
  }
  const calls = requests.length * a.samples
  try {
    const plan = ledger.plan(calls, bound)
    if (!plan.ok) return refuse([plan.message], plan.message)
  } catch (e) {
    if (e instanceof LedgerRefusal) return { status: 'invalid-configuration', reasons: e.reasons }
    throw e
  }
  // 4. Single use, and no unresolved charge anywhere. Then record what was approved and start the journal. Nothing here
  //    has asked for the credential: an invalid, expired or reused approval never reaches the getter.
  try {
    assertCanStart(o.store, a.runId)
  } catch (e) {
    if (e instanceof StartRefusal) return refuse(e.reasons)
    throw e
  }
  const dir = runDir(a.runId)
  const rawDir = `${dir}/raw`
  let journal: Journal
  try {
    const approvalText = JSON.stringify(a, null, 2) + '\n'
    o.store.createExclusive(`${dir}/approval.json`, approvalText)
    journal = new Journal(o.store, journalPath(a.runId), o.clock)
    journal.append({ t: 'started', runId: a.runId, approvalSha256: sha256(approvalText) })
  } catch (e) {
    return refuse([e instanceof StoreError ? e.message : 'the run record could not be started'])
  }

  // 5. The schedule: sample-major, every slot present from the start. A halt can fall anywhere, including inside sample 1.
  const slots: Slot[] = []
  for (let sample = 1; sample <= a.samples; sample++) for (const r of requests) slots.push(blankSlot(slots.length, r.caseId, sample))
  const reqOf = new Map<string, PlannedRequest>(requests.map((r) => [r.caseId, r]))
  const caseOf = new Map(o.cases.map((c) => [c.id, c]))
  const send = guardTransport(o.transport, 'generate')
  const warnings: string[] = []
  let stopped: string | null = null

  // 6. Only now, with the run started and its id used, is the credential requested, once. If it is missing the run
  //    stops with every slot unsent; the id is spent, which is the safe side.
  let key = ''
  try {
    key = String(o.getKey() ?? '')
  } catch {
    key = ''
  }
  if (key.trim() === '') stopped = 'no-credential'

  const tryJournal = (entry: Parameters<Journal['append']>[0]): boolean => {
    try {
      journal.append(entry)
      return true
    } catch {
      return false
    }
  }

  for (const slot of slots) {
    if (stopped) break
    const seq = slot.index + 1
    const req = reqOf.get(slot.caseId) as PlannedRequest
    const providerReq: ProviderRequest = { system: SYSTEM_PROMPT_PROPOSED, user: req.user, maxTokens: a.maxOutputTokens }
    const item = byCase.get(slot.caseId) as { inputTokens: number; allowanceTokens: number }

    const rsv = ledger.reserve(bound, providerReq)
    if (!rsv.ok) {
      slot.reasons = [rsv.reason]
      stopped = rsv.reason
      break
    }
    slot.reservedMicros = rsv.micros

    // Write-ahead. A failed write means nothing has been sent; the reservation is still kept, and the run stops.
    if (!tryJournal({ t: 'reserved', seq, caseId: slot.caseId, sample: slot.sample, requestSha256: req.generationSha256, micros: rsv.micros })) {
      ledger.hold(rsv.id)
      slot.status = 'error'
      slot.charge = 'held'
      slot.reasons = ['the journal could not record the reservation; nothing was sent']
      stopped = 'journal-write-failed'
      break
    }

    const base = { kind: 'generation' as const, seq, caseId: slot.caseId, sample: slot.sample, requestSha256: req.generationSha256, savedAt: o.clock() }
    let res: TransportResponse
    try {
      res = await send({ url: GENERATION_URL, method: 'POST', headers: requestHeaders(key), body: req.generation, timeoutMs: SETTINGS.timeoutMs })
    } catch (e) {
      ledger.hold(rsv.id)
      const timeout = e instanceof TransportTimeout
      slot.status = timeout ? 'timeout' : 'error'
      slot.charge = 'held'
      slot.reasons = [e instanceof Error ? `${e.constructor.name}: ${e.message}` : 'the request failed']
      if (e instanceof TransportRefusal) slot.notes.push('refused before sending; nothing reached the network')
      stopped = timeout ? 'timeout' : e instanceof TransportRefusal ? 'transport-refused' : 'transport-error'
      try {
        saveRaw(o.store, rawDir, { ...base, httpStatus: null, headers: {}, error: slot.reasons[0] }, null)
      } catch {
        stopped = 'raw-write-failed'
      }
      tryJournal({ t: 'held', seq, micros: rsv.micros, reason: stopped })
      break
    }

    slot.httpStatus = res.status
    slot.requestId = res.headers['request-id'] ?? null
    // Save before parsing, whatever the body is.
    try {
      saveRaw(o.store, rawDir, { ...base, httpStatus: res.status, headers: res.headers, error: null }, res.body)
      slot.rawBodyPath = rawBodyPath(rawDir, seq)
    } catch (e) {
      ledger.hold(rsv.id)
      slot.status = 'error'
      slot.charge = 'held'
      slot.reasons = [e instanceof RawWriteError ? e.message : 'the raw response could not be saved']
      slot.text = res.body
      stopped = 'raw-write-failed'
      tryJournal({ t: 'held', seq, micros: rsv.micros, reason: stopped })
      break
    }

    const hold = (status: SlotStatus, reason: string, stop: string) => {
      ledger.hold(rsv.id)
      slot.status = status
      slot.charge = 'held'
      slot.reasons = [reason]
      slot.text = res.body
      stopped = stop
      tryJournal({ t: 'held', seq, micros: rsv.micros, reason: stop })
    }
    if (res.status !== 200) {
      hold('error', `HTTP ${res.status}`, `http-${res.status}`)
      break
    }
    let parsed: { model?: unknown; stop_reason?: unknown; content?: unknown; usage?: unknown }
    try {
      parsed = JSON.parse(res.body) as typeof parsed
    } catch {
      hold('error', 'the response body is not JSON', 'unparseable-response')
      break
    }
    if (!parsed || typeof parsed !== 'object' || parsed.model !== a.model) {
      hold('error', `the response names model ${JSON.stringify((parsed as { model?: unknown } | null)?.model)}, not ${a.model}`, 'model-mismatch')
      break
    }

    const usage = parseUsage(parsed.usage)
    const settled = ledger.settle(rsv.id, usage ?? (null as never), { inputAllowance: item.allowanceTokens, enforceOutputCeiling: true })
    if (!settled.ok || settled.invalid || !usage) {
      slot.status = 'error'
      slot.charge = 'held'
      slot.reasons = ['the response reports no valid usage; the whole reservation is kept']
      slot.text = res.body
      stopped = 'invalid-usage'
      tryJournal({ t: 'held', seq, micros: rsv.micros, reason: 'invalid-usage' })
      break
    }
    slot.inputTokens = usage.inputTokens
    slot.outputTokens = usage.outputTokens
    slot.charge = 'settled'
    slot.chargedMicros = ledger.costOf(usage.inputTokens, usage.outputTokens)

    const blocks = Array.isArray(parsed.content) ? (parsed.content as { type?: unknown; text?: unknown }[]) : []
    const text = blocks.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text as string).join('')
    for (const b of blocks) if (b && b.type !== 'text') slot.notes.push(`unexpected content block: ${String(b.type)}`)
    slot.text = text
    slot.stopReason = typeof parsed.stop_reason === 'string' ? parsed.stop_reason : null
    const checked = checkOutput(text, buildInput(caseOf.get(slot.caseId) as EvalCase))
    slot.flags = checked.flags.map((f) => f.code)
    if (!checked.ok) slot.reasons = checked.rejections.map((r) => `${r.hard} ${r.code}: ${r.detail}`)
    if (slot.stopReason === 'max_tokens') slot.status = 'truncated'
    else if (slot.stopReason === 'refusal') slot.status = 'refusal'
    else if (slot.stopReason !== 'end_turn') slot.status = 'other-stop'
    else if (!checked.ok) slot.status = 'rejected'
    else {
      slot.status = 'valid'
      slot.output = checked.output
    }

    if (!tryJournal({ t: 'settled', seq, micros: slot.chargedMicros, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens })) {
      stopped = 'journal-write-failed'
      break
    }
    if (settled.overrun) stopped = 'usage-exceeded-reservation'
    else if (settled.inputOverrun) stopped = 'input-allowance-exceeded'
    else if (settled.outputOverrun) stopped = 'output-ceiling-exceeded'
    else if (seq === 1 && beyondTripwire(usage.inputTokens, item.inputTokens, a.tripwirePercent)) {
      ledger.halt()
      stopped = 'calibration-tripwire'
    }
    if (stopped) slot.notes.push(`the run stopped after this call: ${stopped}`)
  }

  for (const s of slots) if (s.status === 'not-run') s.reasons = s.reasons.length > 0 ? s.reasons : [stopped ? `not sent: the run stopped (${stopped})` : 'not sent']

  // Close the record. Failures here are reported; they do not change what was charged.
  tryJournal(stopped ? { t: 'halted', reason: stopped } : { t: 'finished' })
  try {
    writeManifest(o.store, rawDir)
  } catch (e) {
    warnings.push(`the raw-file manifest could not be written: ${e instanceof Error ? e.message : 'unknown error'}`)
  }
  try {
    o.store.createExclusive(`${dir}/result.json`, JSON.stringify({ runId: a.runId, stopped, slots }, null, 2) + '\n')
  } catch (e) {
    warnings.push(`result.json could not be written: ${e instanceof Error ? e.message : 'unknown error'}`)
  }
  const snapshot = ledger.snapshot()
  return { status: stopped ? 'stopped' : 'completed', reason: stopped, slots, snapshot, warnings, heldMicros: snapshot.heldMicros }
}
