import { describe, expect, it } from 'vitest'
import { CASES } from './match-eval/cases'
import { runPaid } from './match-eval/live/engine'
import { assertCanStart, journalPath, readJournal, unresolvedIn } from './match-eval/live/journal'
import { buildLivePacket } from './match-eval/live/packet'
import { memoryStore, type MemoryStore } from './match-eval/live/store'
import { clock, FAKE_KEY, messageBody, ok, paidFixture, scriptedOutput, TODAY } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a correction pass, item 3: charge reconciliation. Both an unmatched reservation (a crash or a failed
 * write) and a recorded held charge (a timeout, an HTTP error, bad usage) can be reconciled by the founder against the
 * Console. History is only ever appended to. Nothing is released, and the single-use run is never resumed.
 */

const RUN = 'paid-run-1'
const J = journalPath(RUN)
const good = (id: string, counted: number) => ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 90 }))

/** A store left as a crash would leave it: call 3 reserved, never settled. */
async function crashed(): Promise<MemoryStore> {
  let snap: Map<string, string> | undefined
  let live: MemoryStore | undefined
  const f = await paidFixture({
    store: (live = memoryStore()),
    script: (n, _r, id, counted) => {
      if (n === 3) snap = (live as MemoryStore).snapshot()
      return good(id, counted)
    },
  })
  await f.run()
  return memoryStore({ files: snap })
}

/** A store where call 4 got an HTTP 500: the reservation is held as an uncertain charge, and the run is halted. */
async function held(): Promise<MemoryStore> {
  const f = await paidFixture({ script: (n, _r, id, counted) => (n === 4 ? { status: 500, headers: {}, body: '<html>oops</html>' } : good(id, counted)) })
  await f.run()
  return f.store
}

const args = (over: Record<string, unknown> = {}) => ({ runId: RUN, seq: 3, determinedMicros: 0, note: 'Checked the Console for this workspace: nothing billed for this call.', by: 'the founder', ...over })

describe('reconciling an unmatched reservation', () => {
  it('appends the founder’s determination after the untouched history, with the charge and the note', async () => {
    const { reconcile } = await import('./match-eval/live/journal')
    const store = await crashed()
    const before = store.read(J) as string
    const entries = readJournal(store, J).entries
    const reserved = entries.find((e) => e.t === 'reserved' && e.seq === 3)
    const res = reconcile(store, args({ determinedMicros: 4_321 }) as never, clock) as unknown as { ok: boolean; kind: string }
    expect(res).toMatchObject({ ok: true, kind: 'unmatched' })
    const after = store.read(J) as string
    expect(after.startsWith(before)).toBe(true)
    expect(after.slice(before.length).split('\n').filter(Boolean)).toHaveLength(1)
    const added = readJournal(store, J).entries.at(-1)
    expect(added).toMatchObject({ t: 'reconciled', seq: 3, kind: 'unmatched', determinedMicros: 4_321, by: 'the founder' })
    expect(added).toMatchObject({ reservedMicros: (reserved as { micros: number }).micros })
    expect((added as { note: string }).note).toMatch(/Checked the Console/)
    expect(unresolvedIn(RUN, readJournal(store, J).entries)).toEqual([])
    expect(() => assertCanStart(store, 'paid-run-2')).not.toThrow()
  })

  it('does not resume the original run: its id stays used', async () => {
    const { reconcile } = await import('./match-eval/live/journal')
    const store = await crashed()
    reconcile(store, args() as never, clock)
    expect(() => assertCanStart(store, RUN)).toThrow(/single-use/)
  })
})

describe('reconciling a recorded held charge', () => {
  it('appends the determination, keeps the held line and the halt, and records the determined charge', async () => {
    const { reconcile } = await import('./match-eval/live/journal')
    const store = await held()
    const before = store.read(J) as string
    const res = reconcile(store, args({ seq: 4, determinedMicros: 12_345 }) as never, clock) as unknown as { ok: boolean; kind: string; reservedMicros: number; determinedMicros: number }
    expect(res).toMatchObject({ ok: true, kind: 'held', determinedMicros: 12_345 })
    expect(res.reservedMicros).toBeGreaterThan(12_345)
    const after = store.read(J) as string
    expect(after.startsWith(before)).toBe(true)
    const kinds = readJournal(store, J).entries.map((e) => e.t)
    expect(kinds.slice(-3)).toEqual(['held', 'halted', 'reconciled'])
    expect(readJournal(store, J).entries.at(-1)).toMatchObject({ t: 'reconciled', seq: 4, kind: 'held', reservedMicros: res.reservedMicros, determinedMicros: 12_345 })
  })

  it('never releases the held reservation or resumes the run', async () => {
    const { reconcile } = await import('./match-eval/live/journal')
    const f = await paidFixture({ script: (n, _r, id, counted) => (n === 4 ? { status: 500, headers: {}, body: 'x' } : good(id, counted)) })
    const first = await f.run()
    expect(first.status).toBe('stopped')
    reconcile(f.store, args({ seq: 4, determinedMicros: 0 }) as never, clock)
    expect(() => assertCanStart(f.store, RUN)).toThrow(/single-use/)
    let asked = 0
    const again = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: f.store, transport: f.gen.transport, getKey: () => (asked++, FAKE_KEY), clock })
    expect(again.status).toBe('refused-before-start')
    expect(asked).toBe(0)
    expect(f.gen.calls).toHaveLength(4)
    if (first.status === 'stopped') expect(first.snapshot.heldMicros).toBe(first.slots[3].reservedMicros)
  })
})

describe('rejections change nothing', () => {
  const REJECTS: [string, Record<string, unknown>, RegExp][] = [
    ['an unknown call number', { seq: 999 }, /unknown-call/],
    ['call zero', { seq: 0 }, /unknown-call/],
    ['a negative call', { seq: -1 }, /unknown-call/],
    ['a fractional call', { seq: 1.5 }, /unknown-call/],
    ['a call that is not a number', { seq: Number.NaN }, /unknown-call/],
    ['an unknown run', { runId: 'no-such-run' }, /unknown-run/],
    ['a call that settled normally', { seq: 1 }, /settled/],
    ['a negative charge', { determinedMicros: -1 }, /invalid-determined-charge/],
    ['a fractional charge', { determinedMicros: 1.5 }, /invalid-determined-charge/],
    ['a charge that is not a number', { determinedMicros: 'free' }, /invalid-determined-charge/],
    ['an infinite charge', { determinedMicros: Number.POSITIVE_INFINITY }, /invalid-determined-charge/],
    ['an unsafe charge', { determinedMicros: 2 ** 60 }, /invalid-determined-charge/],
    ['no note', { note: '  ' }, /note-required/],
    ['no name', { by: '' }, /name-required/],
  ]
  it.each(REJECTS)('rejects %s and leaves the store exactly as it was', async (_label, over, reason) => {
    const { reconcile } = await import('./match-eval/live/journal')
    const store = await crashed()
    const snapshot = store.snapshot()
    const res = reconcile(store, args(over) as never, clock) as unknown as { ok: boolean; reason: string }
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(reason)
    expect(store.snapshot()).toEqual(snapshot)
    expect(store.ops.filter((o) => o.startsWith('append'))).toEqual([])
  })

  it('rejects a call that is already reconciled, once for an unmatched reservation and once for a held charge', async () => {
    const { reconcile } = await import('./match-eval/live/journal')
    for (const [store, seq] of [[await crashed(), 3], [await held(), 4]] as const) {
      expect((reconcile(store, args({ seq }) as never, clock) as unknown as { ok: boolean }).ok).toBe(true)
      const snapshot = store.snapshot()
      const second = reconcile(store, args({ seq, determinedMicros: 99, by: 'someone else' }) as never, clock) as unknown as { ok: boolean; reason: string }
      expect(second).toMatchObject({ ok: false })
      expect(second.reason).toMatch(/already-reconciled/)
      expect(store.snapshot()).toEqual(snapshot)
    }
  })
})

describe('the charge report tells pending held charges from reconciled ones', () => {
  it('lists an unmatched reservation and a held charge as pending, then as reconciled with the determined charge', async () => {
    const { reconcile, chargeReport } = await import('./match-eval/live/journal')
    const store = await held()
    const pending = chargeReport(store) as unknown as { unresolved: unknown[]; heldPending: { seq: number; reservedMicros: number }[]; heldReconciled: unknown[]; totals: Record<string, number> }
    expect(pending.unresolved).toEqual([])
    expect(pending.heldPending).toHaveLength(1)
    expect(pending.heldPending[0]).toMatchObject({ runId: RUN, seq: 4, caseId: CASES[3].id, sample: 1 })
    expect(pending.heldReconciled).toEqual([])
    expect(pending.totals.heldPendingMicros).toBe(pending.heldPending[0].reservedMicros)
    expect(pending.totals.heldReconciledDeterminedMicros).toBe(0)

    reconcile(store, args({ seq: 4, determinedMicros: 777 }) as never, clock)
    const done = chargeReport(store) as unknown as typeof pending
    expect(done.heldPending).toEqual([])
    expect(done.heldReconciled).toHaveLength(1)
    expect(done.heldReconciled[0]).toMatchObject({ seq: 4, determinedMicros: 777, by: 'the founder', reservedMicros: pending.heldPending[0].reservedMicros })
    expect(done.totals.heldPendingMicros).toBe(0)
    expect(done.totals.heldReconciledDeterminedMicros).toBe(777)
    expect(done.totals.heldReconciledReservedMicros).toBe(pending.heldPending[0].reservedMicros)
  })

  it('reports an unresolved reservation separately from a held charge', async () => {
    const { chargeReport } = await import('./match-eval/live/journal')
    const r = chargeReport(await crashed()) as unknown as { unresolved: { seq: number }[]; heldPending: unknown[] }
    expect(r.unresolved.map((u) => u.seq)).toEqual([3])
    expect(r.heldPending).toEqual([])
  })

  it('shows pending and reconciled held charges apart in the run table', async () => {
    const { reconcile } = await import('./match-eval/live/journal')
    const f = await paidFixture({ script: (n, _r, id, counted) => (n === 4 ? { status: 500, headers: {}, body: 'x' } : good(id, counted)) })
    const res = await f.run()
    if (res.status !== 'stopped') throw new Error('expected a stop')
    const input = (store: MemoryStore) => ({ runId: RUN, seed: 's', cases: CASES, slots: res.slots, samples: 3, stoppedReason: res.reason, fake: true, entries: readJournal(store, J).entries })
    const before = buildLivePacket(input(f.store) as never).files['run-table.md']
    expect(before).toMatch(/Held, pending reconciliation: \d+ micro-dollars \(1 call\)/)
    expect(before).toMatch(/Held, reconciled: 0 micro-dollars/)
    reconcile(f.store, args({ seq: 4, determinedMicros: 55 }) as never, clock)
    const after = buildLivePacket(input(f.store) as never).files['run-table.md']
    expect(after).toMatch(/Held, pending reconciliation: 0 micro-dollars \(0 calls\)/)
    expect(after).toMatch(/Held, reconciled: determined 55 micro-dollars \(1 call\)/)
  })
})
