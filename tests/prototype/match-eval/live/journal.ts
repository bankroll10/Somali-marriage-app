import { sha256 } from './hash'
import { StoreError, type Store } from './store'

/**
 * The write-ahead journal (docs/MATCH-EVAL.md, "Stage 1a").
 *
 * A reservation is written here BEFORE a request is sent. After the response it is followed by a `settled` or a `held`
 * line. A `reserved` line with nothing after it is an unresolved charge: the process died, or a write failed, between
 * sending and recording. The next start refuses until a person reconciles it against the Console.
 *
 * Every line carries the hash of the line before it, so an edited, dropped or reordered line is detected.
 */

export type JournalEntry =
  | { t: 'started'; runId: string; approvalSha256: string }
  | { t: 'reserved'; seq: number; caseId: string; sample: number; requestSha256: string; micros: number }
  | { t: 'settled'; seq: number; micros: number; inputTokens: number; outputTokens: number }
  | { t: 'held'; seq: number; micros: number; reason: string }
  | { t: 'halted'; reason: string }
  | { t: 'finished' }
  | { t: 'reconciled'; seq: number; kind: 'unmatched' | 'held'; reservedMicros: number; determinedMicros: number; note: string; by: string }

export type Logged = JournalEntry & { n: number; prev: string; at: string }

export class JournalWriteError extends Error {}
export class JournalCorrupt extends Error {}
export class StartRefusal extends Error {
  readonly reasons: string[]
  constructor(reasons: string[]) {
    super(`The run cannot start: ${reasons.join('; ')}.`)
    this.reasons = reasons
  }
}

export const journalPath = (runId: string): string => `runs/${runId}/journal.jsonl`

/** Reads and checks a journal. A missing file is an empty journal. Anything that does not chain is `JournalCorrupt`. */
export function readJournal(store: Store, path: string): { entries: Logged[]; lastLine: string } {
  const text = store.read(path)
  if (text === null || text === '') return { entries: [], lastLine: '' }
  const lines = text.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  const entries: Logged[] = []
  let prev = ''
  lines.forEach((line, i) => {
    let parsed: Logged
    try {
      parsed = JSON.parse(line) as Logged
    } catch {
      throw new JournalCorrupt(`line ${i + 1} of ${path} is not JSON`)
    }
    if (parsed.n !== i + 1 || parsed.prev !== (prev === '' ? '' : sha256(prev))) throw new JournalCorrupt(`line ${i + 1} of ${path} does not follow the line before it`)
    entries.push(parsed)
    prev = line
  })
  return { entries, lastLine: prev }
}

export class Journal {
  private readonly store: Store
  private readonly path: string
  private readonly clock: () => string
  private n: number
  private last: string
  private broken = false

  constructor(store: Store, path: string, clock: () => string) {
    this.store = store
    this.path = path
    this.clock = clock
    const { entries, lastLine } = readJournal(store, path)
    this.n = entries.length
    this.last = lastLine
  }

  /** Writes one line. If the write fails the journal is broken for good: every later append throws. */
  append(entry: JournalEntry): Logged {
    if (this.broken) throw new JournalWriteError('the journal is broken after an earlier failed write')
    const logged = { ...entry, n: this.n + 1, prev: this.last === '' ? '' : sha256(this.last), at: this.clock() } as Logged
    const line = JSON.stringify(logged)
    try {
      this.store.append(this.path, line)
    } catch (e) {
      this.broken = true
      throw new JournalWriteError(e instanceof StoreError ? e.message : 'the journal write failed')
    }
    this.n += 1
    this.last = line
    return logged
  }
}

export interface Unresolved {
  runId: string
  seq: number
  caseId: string
  sample: number
  micros: number
}

export function unresolvedIn(runId: string, entries: Logged[]): Unresolved[] {
  const closed = new Set<number>()
  for (const e of entries) if (e.t === 'settled' || e.t === 'held' || e.t === 'reconciled') closed.add(e.seq)
  const out: Unresolved[] = []
  for (const e of entries) if (e.t === 'reserved' && !closed.has(e.seq)) out.push({ runId, seq: e.seq, caseId: e.caseId, sample: e.sample, micros: e.micros })
  return out
}

/**
 * A run starts only if its id has never been used and no run, this one or any other, has an unresolved reservation or a
 * journal that does not check out. A `held` charge is not unresolved here: it is already accounted as uncertain, and the
 * report says so; `reconcile` is how a person settles it against the Console.
 */
export function assertCanStart(store: Store, runId: string): void {
  const reasons: string[] = []
  const runs = store.list('runs')
  if (runs.includes(runId)) reasons.push(`run id ${runId} has been used; a run id is single-use`)
  for (const id of runs) {
    try {
      const { entries } = readJournal(store, journalPath(id))
      for (const u of unresolvedIn(id, entries)) reasons.push(`run ${id} has an unresolved reservation (call ${u.seq}, ${u.caseId} sample ${u.sample}, up to ${u.micros} micro-dollars); reconcile it against the Console first`)
    } catch (e) {
      reasons.push(e instanceof JournalCorrupt ? `run ${id}: ${e.message}` : `run ${id}: the journal could not be read`)
    }
  }
  if (reasons.length > 0) throw new StartRefusal(reasons)
}

export type ChargeStatus = 'settled' | 'held-pending' | 'held-reconciled' | 'unmatched-pending' | 'unmatched-reconciled'

export interface ChargeRow {
  runId: string
  seq: number
  caseId: string
  sample: number
  reservedMicros: number
  status: ChargeStatus
  /** What the call was charged when it settled. */
  settledMicros?: number
  /** What the founder determined from the Console, for a reconciled call. */
  determinedMicros?: number
  by?: string
  note?: string
}

/** One row for every reservation in a run's journal, with what became of it. Pure: it reads, it never writes. */
export function chargeRows(runId: string, entries: Logged[]): ChargeRow[] {
  const settled = new Map<number, number>()
  const held = new Set<number>()
  const rec = new Map<number, Extract<Logged, { t: 'reconciled' }>>()
  for (const e of entries) {
    if (e.t === 'settled') settled.set(e.seq, e.micros)
    else if (e.t === 'held') held.add(e.seq)
    else if (e.t === 'reconciled') rec.set(e.seq, e)
  }
  const rows: ChargeRow[] = []
  for (const e of entries) {
    if (e.t !== 'reserved') continue
    const base = { runId, seq: e.seq, caseId: e.caseId, sample: e.sample, reservedMicros: e.micros }
    const r = rec.get(e.seq)
    if (settled.has(e.seq)) rows.push({ ...base, status: 'settled', settledMicros: settled.get(e.seq) })
    else if (held.has(e.seq)) rows.push(r ? { ...base, status: 'held-reconciled', determinedMicros: r.determinedMicros, by: r.by, note: r.note } : { ...base, status: 'held-pending' })
    else rows.push(r ? { ...base, status: 'unmatched-reconciled', determinedMicros: r.determinedMicros, by: r.by, note: r.note } : { ...base, status: 'unmatched-pending' })
  }
  return rows
}

export interface ChargeReport {
  runs: string[]
  corrupt: { runId: string; reason: string }[]
  /** Reserved, with no outcome recorded: a crash or a failed write. Blocks the next start. */
  unresolved: ChargeRow[]
  /** Recorded as an uncertain charge and not yet checked against the Console. */
  heldPending: ChargeRow[]
  heldReconciled: ChargeRow[]
  unmatchedReconciled: ChargeRow[]
  totals: {
    settledMicros: number
    unresolvedMicros: number
    heldPendingMicros: number
    heldReconciledReservedMicros: number
    heldReconciledDeterminedMicros: number
    unmatchedReconciledReservedMicros: number
    unmatchedReconciledDeterminedMicros: number
  }
}

/** Every run's charges, with pending held charges kept apart from reconciled ones. Reads only. */
export function chargeReport(store: Store): ChargeReport {
  const out: ChargeReport = {
    runs: store.list('runs'),
    corrupt: [],
    unresolved: [],
    heldPending: [],
    heldReconciled: [],
    unmatchedReconciled: [],
    totals: { settledMicros: 0, unresolvedMicros: 0, heldPendingMicros: 0, heldReconciledReservedMicros: 0, heldReconciledDeterminedMicros: 0, unmatchedReconciledReservedMicros: 0, unmatchedReconciledDeterminedMicros: 0 },
  }
  for (const runId of out.runs) {
    let rows: ChargeRow[]
    try {
      rows = chargeRows(runId, readJournal(store, journalPath(runId)).entries)
    } catch (e) {
      out.corrupt.push({ runId, reason: e instanceof JournalCorrupt ? e.message : 'the journal could not be read' })
      continue
    }
    for (const r of rows) {
      if (r.status === 'settled') out.totals.settledMicros += r.settledMicros ?? 0
      else if (r.status === 'unmatched-pending') {
        out.unresolved.push(r)
        out.totals.unresolvedMicros += r.reservedMicros
      } else if (r.status === 'held-pending') {
        out.heldPending.push(r)
        out.totals.heldPendingMicros += r.reservedMicros
      } else if (r.status === 'held-reconciled') {
        out.heldReconciled.push(r)
        out.totals.heldReconciledReservedMicros += r.reservedMicros
        out.totals.heldReconciledDeterminedMicros += r.determinedMicros ?? 0
      } else {
        out.unmatchedReconciled.push(r)
        out.totals.unmatchedReconciledReservedMicros += r.reservedMicros
        out.totals.unmatchedReconciledDeterminedMicros += r.determinedMicros ?? 0
      }
    }
  }
  return out
}

export interface ReconcileArgs {
  runId: string
  seq: number
  /** What the Console shows this call cost, in whole micro-dollars. Zero is a valid determination. */
  determinedMicros: number
  note: string
  by: string
}

export type ReconcileResult =
  | { ok: true; kind: 'unmatched' | 'held'; reservedMicros: number; determinedMicros: number }
  | { ok: false; reason: 'unknown-run' | 'unknown-call' | 'settled-call' | 'already-reconciled' | 'invalid-determined-charge' | 'note-required' | 'name-required' | 'journal-unreadable' | 'journal-write-failed'; detail: string }

const bad = (reason: Extract<ReconcileResult, { ok: false }>['reason'], detail: string): ReconcileResult => ({ ok: false, reason, detail })

/**
 * Records a person's check of the Console against one call: either a reservation with no outcome (a crash, a failed
 * write) or a charge the run itself recorded as held. It ONLY APPENDS: the original lines stay, the chain continues, and
 * the call's determined charge sits beside them. It releases nothing and resumes nothing; the run's id stays used, and the
 * run's own totals are not edited. An unknown call, a settled call or an already-reconciled call is refused and nothing
 * is written.
 */
export function reconcile(store: Store, a: ReconcileArgs, clock: () => string): ReconcileResult {
  if (typeof a?.determinedMicros !== 'number' || !Number.isSafeInteger(a.determinedMicros) || a.determinedMicros < 0) return bad('invalid-determined-charge', 'the determined charge must be a whole, non-negative number of micro-dollars')
  if (typeof a.note !== 'string' || a.note.trim() === '') return bad('note-required', 'a reconciliation needs a note saying what was checked')
  if (typeof a.by !== 'string' || a.by.trim() === '') return bad('name-required', 'a reconciliation needs the name of the person who checked')
  if (typeof a.runId !== 'string' || !store.list('runs').includes(a.runId)) return bad('unknown-run', `no run called ${String(a.runId)}`)
  let entries: Logged[]
  try {
    entries = readJournal(store, journalPath(a.runId)).entries
  } catch {
    return bad('journal-unreadable', 'the journal does not check out, so nothing was added to it')
  }
  const row = chargeRows(a.runId, entries).find((r) => r.seq === a.seq)
  if (!Number.isSafeInteger(a.seq) || !row) return bad('unknown-call', `run ${a.runId} has no call ${String(a.seq)}`)
  if (row.status === 'settled') return bad('settled-call', `call ${a.seq} settled normally; there is nothing to reconcile`)
  if (row.status === 'held-reconciled' || row.status === 'unmatched-reconciled') return bad('already-reconciled', `call ${a.seq} was already reconciled by ${row.by ?? 'someone'}`)
  const kind = row.status === 'held-pending' ? 'held' : 'unmatched'
  try {
    new Journal(store, journalPath(a.runId), clock).append({ t: 'reconciled', seq: a.seq, kind, reservedMicros: row.reservedMicros, determinedMicros: a.determinedMicros, note: a.note, by: a.by })
  } catch {
    return bad('journal-write-failed', 'the reconciliation could not be written')
  }
  return { ok: true, kind, reservedMicros: row.reservedMicros, determinedMicros: a.determinedMicros }
}
