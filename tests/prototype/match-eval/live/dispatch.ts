import { CASES } from '../cases'
import type { EvalCase } from '../types'
import { CREDENTIAL_VARIABLE, type CountApproval, type PaidRunApproval } from './approval'
import { countRunStatus, runCount } from './count'
import { runPaid } from './engine'
import { chargeReport, reconcile } from './journal'
import type { Store } from './store'
import { TransportFailure, TransportRefusal, TransportTimeout, type Transport } from './transport'

/**
 * The command boundary, offline (docs/MATCH-EVAL.md, "Stage 1a"). One function takes a command and injected parts: a fake
 * or real environment, a transport, a clock, a store. It reads no real environment and opens no network connection by
 * itself, and no executable wrapper around it exists; that wrapper is a separate approval.
 *
 * What it guarantees, each tested:
 * - The credential getter is built here, asks for the one named variable and no other, and is handed to a command only
 *   after that command has validated its approval and durably started. An invalid, expired or reused approval never
 *   reaches it.
 * - `count` and `paid-run` are separate scopes with separate approval kinds. Each reaches only its own endpoint.
 * - A command with an unknown name or an extra field is refused before anything else happens.
 * - The key never appears in a result, an error or a saved file: errors from the transport are scrubbed on the way out,
 *   and so is the result.
 */

export interface Env {
  get(name: string): string | undefined
}

export interface DispatchDeps {
  env: Env
  transport: Transport
  store: Store
  clock: () => string
  /** YYYY-MM-DD. */
  today: string
  /** The cases to run; the frozen set when omitted. */
  cases?: EvalCase[]
}

export type DispatchResult = { ok: true; command: string; result: unknown } | { ok: false; command: string | null; reasons: string[]; result?: unknown }

const SHAPES: Record<string, string[]> = {
  count: ['command', 'approval'],
  'paid-run': ['command', 'approval'],
  reconcile: ['command', 'runId', 'seq', 'determinedMicros', 'note', 'by'],
  status: ['command'],
}

const REDACTED = '[redacted]'

function scrubText(text: string, key: string | null): string {
  return key ? text.split(key).join(REDACTED) : text
}

function scrubDeep(value: unknown, key: string | null): unknown {
  if (key === null) return value
  if (typeof value === 'string') return scrubText(value, key)
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, key))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [scrubText(k, key), scrubDeep(v, key)]))
  return value
}

export async function dispatch(command: unknown, deps: DispatchDeps): Promise<DispatchResult> {
  const cmd = command as Record<string, unknown> | null
  const name = cmd && typeof cmd === 'object' && !Array.isArray(cmd) && typeof cmd.command === 'string' ? cmd.command : null
  if (name === null || !(name in SHAPES)) return { ok: false, command: name, reasons: ['unknown or missing command'] }
  const extra = Object.keys(cmd as object).filter((k) => !SHAPES[name].includes(k))
  if (extra.length > 0) return { ok: false, command: name, reasons: [`the ${name} command takes no field called ${extra.join(', ')}`] }

  // The one place the credential is read, and the one name it can be read under.
  let key: string | null = null
  const getKey = (): string => {
    const v = deps.env.get(CREDENTIAL_VARIABLE)
    if (typeof v === 'string' && v !== '') key = v
    return v ?? ''
  }
  // Errors that come out of the transport are scrubbed of the key before anything can record them.
  const transport: Transport = async (req) => {
    try {
      const res = await deps.transport(req)
      return { ...res, body: scrubText(res.body, key), headers: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, scrubText(String(v), key)])) }
    } catch (e) {
      const message = scrubText(e instanceof Error ? e.message : 'the request failed', key)
      if (e instanceof TransportTimeout) throw new TransportTimeout(message)
      if (e instanceof TransportRefusal) throw new TransportRefusal(e.reasons.map((r) => scrubText(r, key)))
      throw new TransportFailure(message)
    }
  }
  const done = (r: DispatchResult): DispatchResult => scrubDeep(r, key) as DispatchResult

  try {
    if (name === 'count') {
      const a = cmd?.approval as CountApproval | undefined
      if (a?.kind !== 'match-eval-count-approval/1') return { ok: false, command: name, reasons: ['the count command takes a count approval record'] }
      const r = await runCount({ approval: a, today: deps.today, cases: deps.cases ?? CASES, store: deps.store, transport, getKey, clock: deps.clock })
      if (r.status === 'refused') return done({ ok: false, command: name, reasons: r.reasons })
      if (r.status === 'stopped') return done({ ok: false, command: name, reasons: [`the count stopped: ${r.reason}`], result: { status: r.status, reason: r.reason, callsMade: r.callsMade, countRun: countRunStatus(deps.store, a.countRunId) } })
      return done({ ok: true, command: name, result: { status: r.status, reportPath: r.reportPath, reportSha256: r.reportSha256, callsMade: r.callsMade } })
    }
    if (name === 'paid-run') {
      const a = cmd?.approval as PaidRunApproval | undefined
      if (a?.kind !== 'match-eval-paid-run-approval/1') return { ok: false, command: name, reasons: ['the paid-run command takes a paid-run approval record'] }
      const r = await runPaid({ approval: a, today: deps.today, cases: deps.cases ?? CASES, store: deps.store, transport, getKey, clock: deps.clock })
      if (r.status === 'refused-before-start' || r.status === 'invalid-configuration') return done({ ok: false, command: name, reasons: r.reasons })
      const byStatus: Record<string, number> = {}
      for (const s of r.slots) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1
      const summary = { status: r.status, reason: r.reason, slots: r.slots.length, byStatus, snapshot: r.snapshot, warnings: r.warnings }
      return done(r.status === 'completed' ? { ok: true, command: name, result: summary } : { ok: false, command: name, reasons: [`the run stopped: ${r.reason}`], result: summary })
    }
    if (name === 'reconcile') {
      const r = reconcile(deps.store, { runId: cmd?.runId as string, seq: cmd?.seq as number, determinedMicros: cmd?.determinedMicros as number, note: cmd?.note as string, by: cmd?.by as string }, deps.clock)
      return r.ok ? { ok: true, command: name, result: r } : { ok: false, command: name, reasons: [`${r.reason}: ${r.detail}`] }
    }
    // status
    const counts = deps.store.list('counts').map((id) => ({ id, ...countRunStatus(deps.store, id) }))
    return { ok: true, command: name, result: { counts, charges: chargeReport(deps.store) } }
  } catch (e) {
    return done({ ok: false, command: name, reasons: [scrubText(e instanceof Error ? e.message : 'the command failed', key)] })
  }
}
