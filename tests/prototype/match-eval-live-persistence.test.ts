import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CASES } from './match-eval/cases'
import { runPaid } from './match-eval/live/engine'
import { assertCanStart, Journal, JournalCorrupt, JournalWriteError, journalPath, readJournal, reconcile, StartRefusal, unresolvedIn } from './match-eval/live/journal'
import { RawWriteError, rawBodyPath, rawMetaPath, saveRaw, verifyManifest, writeManifest } from './match-eval/live/raw'
import { memoryStore, nodeStore, safePath, StoreError, type MemoryStore } from './match-eval/live/store'
import { clock, FAKE_KEY, messageBody, ok, paidFixture, scriptedOutput, TODAY, type GenScript } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a: persistence (docs/MATCH-EVAL.md, "Stage 1a"). The reservation is written before anything is sent,
 * the raw body is saved before anything parses it, a failed write stops the run and keeps the charge, and a crash
 * leaves a record that blocks the next start. Fakes and a temporary folder only.
 */

const JOURNAL = journalPath('paid-run-1')
const lines = (store: MemoryStore, path: string) => (store.read(path) ?? '').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { t: string; seq?: number })
const kinds = (store: MemoryStore) => lines(store, JOURNAL).map((l) => l.t)

/** Fails the nth append to the run's journal (1 is the `started` line). */
const failJournalAt = (n: number) => {
  let count = 0
  return (op: string, path: string) => {
    if (op === 'append' && path === JOURNAL && ++count === n) return true
    return false
  }
}

describe('write-ahead: the reservation is on disk before the request is sent', () => {
  it('has the reserved line, and no settled line, in the journal when each request arrives', async () => {
    const seen: string[][] = []
    let store: MemoryStore | undefined
    const script: GenScript = (n, _r, id, counted) => {
      seen.push(kinds(store as MemoryStore))
      expect(lines(store as MemoryStore, JOURNAL).filter((l) => l.t === 'reserved')).toHaveLength(n)
      expect(lines(store as MemoryStore, JOURNAL).filter((l) => l.t === 'settled')).toHaveLength(n - 1)
      return ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 100 }))
    }
    store = memoryStore()
    const f = await paidFixture({ script, store })
    await f.run()
    expect(seen).toHaveLength(66)
    expect(seen[0]).toEqual(['started', 'reserved'])
    expect(seen[1]).toEqual(['started', 'reserved', 'settled', 'reserved'])
  })

  it('saves the raw body after the reservation and before the outcome is journaled', async () => {
    const f = await paidFixture()
    await f.run()
    const ops = f.store.ops
    const at = (needle: string) => ops.findIndex((o) => o === needle)
    const reservedWritten = ops.findIndex((o, i) => o === `append ${JOURNAL}` && i > at(`create runs/paid-run-1/approval.json`) && ops.slice(0, i).filter((x) => x === `append ${JOURNAL}`).length === 1)
    const body = at('create runs/paid-run-1/raw/001.body')
    const meta = at('create runs/paid-run-1/raw/001.meta.json')
    const settled = ops.findIndex((o, i) => o === `append ${JOURNAL}` && ops.slice(0, i).filter((x) => x === `append ${JOURNAL}`).length === 2)
    expect(reservedWritten).toBeGreaterThan(-1)
    expect(body).toBeGreaterThan(reservedWritten)
    expect(meta).toBeGreaterThan(body)
    expect(settled).toBeGreaterThan(meta)
  })

  it('sends nothing, keeps the reservation and stops when the reservation cannot be journaled', async () => {
    const f = await paidFixture({ store: memoryStore({ fail: failJournalAt(2) }) })
    const res = await f.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'journal-write-failed' })
    expect(f.gen.calls).toHaveLength(0)
    if (res.status !== 'stopped') return
    expect(res.slots).toHaveLength(66)
    expect(res.slots[0]).toMatchObject({ status: 'error', charge: 'held' })
    expect(res.snapshot.heldMicros).toBe(res.slots[0].reservedMicros)
    expect(res.snapshot.heldMicros).toBeGreaterThan(0)
    expect(res.slots.slice(1).every((s) => s.status === 'not-run')).toBe(true)
  })
})

describe('raw responses are saved before they are parsed', () => {
  it('keeps a body that is not JSON byte for byte', async () => {
    const body = 'HTTP gateway says:\n\u0000<b>é\u2028</b> {not json'
    const f = await paidFixture({ script: (n, _r, _id, counted) => (n === 1 ? { status: 200, headers: {}, body } : ok(messageBody({ text: '{}', input: counted, output: 1 }))) })
    const res = await f.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'unparseable-response' })
    expect(f.store.read('runs/paid-run-1/raw/001.body')).toBe(body)
    expect(JSON.parse(f.store.read('runs/paid-run-1/raw/001.meta.json') as string)).toMatchObject({ httpStatus: 200, kind: 'generation', caseId: CASES[0].id, sample: 1, seq: 1 })
  })

  it('keeps an error body that is not JSON', async () => {
    const f = await paidFixture({ script: (n, _r, id, counted) => (n === 2 ? { status: 503, headers: { 'request-id': 'req_503' }, body: '<html>503</html>' } : ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 1 }))) })
    await f.run()
    expect(f.store.read('runs/paid-run-1/raw/002.body')).toBe('<html>503</html>')
    expect(JSON.parse(f.store.read('runs/paid-run-1/raw/002.meta.json') as string).headers).toEqual({ 'request-id': 'req_503' })
  })

  it('stops, keeps the reservation and journals the hold when the body cannot be saved', async () => {
    const f = await paidFixture({ store: memoryStore({ fail: (op, path) => op === 'create' && path === 'runs/paid-run-1/raw/001.body' }) })
    const res = await f.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'raw-write-failed' })
    expect(f.gen.calls).toHaveLength(1)
    if (res.status !== 'stopped') return
    expect(res.slots[0]).toMatchObject({ status: 'error', charge: 'held' })
    expect(res.snapshot.heldMicros).toBe(res.slots[0].reservedMicros)
    expect(kinds(f.store)).toEqual(['started', 'reserved', 'held', 'halted'])
    expect(unresolvedIn('paid-run-1', readJournal(f.store, JOURNAL).entries)).toEqual([])
  })

  it('stops the same way when only the meta file fails', async () => {
    const f = await paidFixture({ store: memoryStore({ fail: (op, path) => op === 'create' && path === 'runs/paid-run-1/raw/001.meta.json' }) })
    expect(await f.run()).toMatchObject({ status: 'stopped', reason: 'raw-write-failed' })
    expect(f.store.read('runs/paid-run-1/raw/001.body')).not.toBeNull()
    expect(f.gen.calls).toHaveLength(1)
  })

  it('leaves the reservation unresolved if the raw save AND the journal both fail, so the next start refuses', async () => {
    let appends = 0
    const store = memoryStore({
      fail: (op, path) => (op === 'create' && path === 'runs/paid-run-1/raw/001.body') || (op === 'append' && path === JOURNAL && ++appends >= 3),
    })
    const f = await paidFixture({ store })
    expect(await f.run()).toMatchObject({ status: 'stopped', reason: 'raw-write-failed' })
    const entries = readJournal(store, JOURNAL).entries
    expect(unresolvedIn('paid-run-1', entries)).toHaveLength(1)
    expect(() => assertCanStart(store, 'paid-run-2')).toThrow(StartRefusal)
  })

  it('does not overwrite: a second save to the same sequence fails and the first stays', () => {
    const store = memoryStore()
    const meta = { kind: 'generation' as const, seq: 7, caseId: 'S01', sample: 1, requestSha256: 'a', httpStatus: 200, headers: {}, error: null, savedAt: clock() }
    saveRaw(store, 'runs/r/raw', meta, 'first')
    expect(() => saveRaw(store, 'runs/r/raw', meta, 'second')).toThrow(RawWriteError)
    expect(store.read(rawBodyPath('runs/r/raw', 7))).toBe('first')
    expect(rawBodyPath('runs/r/raw', 7)).toBe('runs/r/raw/007.body')
    expect(rawMetaPath('runs/r/raw', 7)).toBe('runs/r/raw/007.meta.json')
  })

  it('never saves request headers or a response header outside a short list', () => {
    const store = memoryStore()
    const meta = { kind: 'generation' as const, seq: 1, caseId: 'S01', sample: 1, requestSha256: 'a', httpStatus: 200, headers: { 'request-id': 'r', 'set-cookie': 'c', 'x-api-key': FAKE_KEY, 'anthropic-ratelimit-requests-remaining': '9', date: 'd' }, error: null, savedAt: clock() }
    saveRaw(store, 'runs/r/raw', meta, '{}')
    const saved = JSON.parse(store.read('runs/r/raw/001.meta.json') as string)
    expect(Object.keys(saved.headers).sort()).toEqual(['anthropic-ratelimit-requests-remaining', 'date', 'request-id'])
    expect(store.read('runs/r/raw/001.meta.json')).not.toContain(FAKE_KEY)
  })

  it('writes a manifest that detects a changed, missing or extra file', () => {
    const store = memoryStore()
    for (const seq of [1, 2]) saveRaw(store, 'd/raw', { kind: 'count', seq, caseId: 'k', sample: null, requestSha256: 'a', httpStatus: 200, headers: {}, error: null, savedAt: clock() }, `body ${seq}`)
    writeManifest(store, 'd/raw')
    expect(verifyManifest(store, 'd/raw')).toEqual([])
    store.files.set('d/raw/001.body', 'tampered')
    store.files.delete('d/raw/002.meta.json')
    store.files.set('d/raw/003.body', 'extra')
    expect(verifyManifest(store, 'd/raw').sort()).toEqual(['001.body has changed', '002.meta.json is missing', '003.body is not in the manifest'])
    expect(verifyManifest(memoryStore(), 'nothing')).toEqual(['there is no manifest'])
  })
})

describe('a failed outcome write, and a crash', () => {
  it('stops and leaves the reservation unresolved when the settled line cannot be written, and the next start refuses', async () => {
    const f = await paidFixture({ store: memoryStore({ fail: failJournalAt(3) }) })
    const res = await f.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'journal-write-failed' })
    expect(f.gen.calls).toHaveLength(1)
    if (res.status === 'stopped') expect(res.slots[0]).toMatchObject({ status: 'valid', charge: 'settled' })
    const un = unresolvedIn('paid-run-1', readJournal(f.store, JOURNAL).entries)
    expect(un).toHaveLength(1)
    expect(un[0]).toMatchObject({ seq: 1, caseId: CASES[0].id, sample: 1 })
    expect(un[0].micros).toBeGreaterThan(0)
    expect(() => assertCanStart(f.store, 'paid-run-2')).toThrow(/unresolved reservation \(call 1/)
  })

  it('refuses to start after a crash between reserve and settle, until a person reconciles it', async () => {
    let crashed: Map<string, string> | undefined
    let store: MemoryStore | undefined
    const f = await paidFixture({
      store: (store = memoryStore()),
      script: (n, _r, id, counted) => {
        if (n === 3) crashed = (store as MemoryStore).snapshot()
        return ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 100 }))
      },
    })
    await f.run()
    const after = memoryStore({ files: crashed })
    const entries = readJournal(after, JOURNAL).entries
    expect(entries.map((e) => e.t)).toEqual(['started', 'reserved', 'settled', 'reserved', 'settled', 'reserved'])
    expect(unresolvedIn('paid-run-1', entries)).toEqual([{ runId: 'paid-run-1', seq: 3, caseId: CASES[2].id, sample: 1, micros: expect.any(Number) }])
    expect(() => assertCanStart(after, 'paid-run-2')).toThrow(StartRefusal)
    expect(() => assertCanStart(after, 'paid-run-1')).toThrow(/single-use/)

    const note = 'checked the Console: nothing billed for this call'
    expect(reconcile(after, { runId: 'paid-run-1', seq: 2, determinedMicros: 0, note: 'checked', by: 'founder' }, clock)).toMatchObject({ ok: false, reason: 'settled-call' })
    expect(reconcile(after, { runId: 'paid-run-1', seq: 3, determinedMicros: 0, note: ' ', by: 'founder' }, clock)).toMatchObject({ ok: false, reason: 'note-required' })
    expect(reconcile(after, { runId: 'paid-run-1', seq: 3, determinedMicros: 0, note, by: ' ' }, clock)).toMatchObject({ ok: false, reason: 'name-required' })
    expect(reconcile(after, { runId: 'paid-run-1', seq: 3, determinedMicros: 0, note, by: 'founder' }, clock)).toMatchObject({ ok: true, kind: 'unmatched' })
    const reconciled = readJournal(after, JOURNAL).entries
    expect(reconciled.at(-1)).toMatchObject({ t: 'reconciled', seq: 3, by: 'founder' })
    expect(unresolvedIn('paid-run-1', reconciled)).toEqual([])
    expect(() => assertCanStart(after, 'paid-run-2')).not.toThrow()
    expect(() => assertCanStart(after, 'paid-run-1')).toThrow(/single-use/)
  })

  it('does not treat a held charge as unresolved: it is already accounted as uncertain', async () => {
    const f = await paidFixture({ script: (n, _r, id, counted) => (n === 2 ? { status: 500, headers: {}, body: 'x' } : ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 1 }))) })
    await f.run()
    expect(kinds(f.store)).toEqual(['started', 'reserved', 'settled', 'reserved', 'held', 'halted'])
    expect(() => assertCanStart(f.store, 'paid-run-2')).not.toThrow()
  })

  it('reports a failure to write the manifest or result as a warning, without changing what was charged', async () => {
    const f = await paidFixture({ store: memoryStore({ fail: (op, path) => op === 'create' && path.startsWith('runs/') && (path.endsWith('result.json') || path.endsWith('manifest.json')) }) })
    const res = await f.run()
    expect(res.status).toBe('completed')
    if (res.status === 'completed') {
      expect(res.warnings).toHaveLength(2)
      expect(res.snapshot.spentMicros).toBe(res.slots.reduce((t, s) => t + s.chargedMicros, 0))
    }
  })
})

describe('the journal', () => {
  it('chains every line to the one before and detects an edited, dropped, reordered or truncated line', () => {
    const store = memoryStore()
    const j = new Journal(store, 'r/journal.jsonl', clock)
    j.append({ t: 'started', runId: 'r', approvalSha256: 'a' })
    j.append({ t: 'reserved', seq: 1, caseId: 'S01', sample: 1, requestSha256: 'b', micros: 5 })
    j.append({ t: 'settled', seq: 1, micros: 3, inputTokens: 1, outputTokens: 1 })
    j.append({ t: 'finished' })
    expect(readJournal(store, 'r/journal.jsonl').entries).toHaveLength(4)
    const ls = (store.read('r/journal.jsonl') as string).split('\n').filter(Boolean)
    const corrupt = (rows: string[]) => readJournal(memoryStore({ files: new Map([['r/journal.jsonl', rows.join('\n') + '\n']]) }), 'r/journal.jsonl')
    expect(() => corrupt([ls[0], ls[1].replace('"micros":5', '"micros":6'), ls[2], ls[3]])).toThrow(JournalCorrupt)
    expect(() => corrupt([ls[0], ls[2], ls[3]])).toThrow(JournalCorrupt)
    expect(() => corrupt([ls[0], ls[2], ls[1], ls[3]])).toThrow(JournalCorrupt)
    expect(() => corrupt([ls[1], ls[2], ls[3]])).toThrow(JournalCorrupt)
    expect(() => corrupt([ls[0], '{not json', ls[2]])).toThrow(JournalCorrupt)
    expect(() => corrupt([...ls, ls[3]])).toThrow(JournalCorrupt)
    expect(() => corrupt([ls[0], ls[1]])).not.toThrow()
  })

  it('refuses a start when any journal is corrupt', () => {
    const store = memoryStore({ files: new Map([[journalPath('old'), 'not a journal\n']]) })
    expect(() => assertCanStart(store, 'new')).toThrow(/run old/)
  })

  it('is broken for good after one failed write', () => {
    let fail = true
    const store = memoryStore({ fail: () => fail })
    const j = new Journal(store, 'r/j.jsonl', clock)
    expect(() => j.append({ t: 'finished' })).toThrow(JournalWriteError)
    fail = false
    expect(() => j.append({ t: 'finished' })).toThrow(/broken/)
    expect(store.read('r/j.jsonl')).toBeNull()
  })

  it('continues an existing journal where it left off', () => {
    const store = memoryStore()
    new Journal(store, 'r/j.jsonl', clock).append({ t: 'started', runId: 'r', approvalSha256: 'a' })
    new Journal(store, 'r/j.jsonl', clock).append({ t: 'finished' })
    expect(readJournal(store, 'r/j.jsonl').entries.map((e) => e.n)).toEqual([1, 2])
  })
})

describe('the real file store', () => {
  const withDir = (fn: (dir: string) => void) => {
    const dir = mkdtempSync(join(tmpdir(), 'match-eval-live-'))
    try {
      fn(dir)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it('creates a file once, never overwrites it, and flushes appends', () =>
    withDir((dir) => {
      const s = nodeStore(dir)
      s.createExclusive('a/b/c.txt', 'one')
      expect(() => s.createExclusive('a/b/c.txt', 'two')).toThrow(StoreError)
      expect(readFileSync(join(dir, 'a/b/c.txt'), 'utf8')).toBe('one')
      s.append('a/j.jsonl', 'x')
      s.append('a/j.jsonl', 'y')
      expect(readFileSync(join(dir, 'a/j.jsonl'), 'utf8')).toBe('x\ny\n')
      expect(s.read('a/b/c.txt')).toBe('one')
      expect(s.read('missing.txt')).toBeNull()
      expect(s.list('a')).toEqual(['b', 'j.jsonl'])
      expect(s.list('nowhere')).toEqual([])
    }))

  it('makes a sealed file read-only', () =>
    withDir((dir) => {
      const s = nodeStore(dir)
      s.createExclusive('r.json', '{}')
      s.seal('r.json')
      expect(statSync(join(dir, 'r.json')).mode & 0o222).toBe(0)
      expect(() => s.seal('absent.json')).toThrow(StoreError)
    }))

  it.each(['../x', '/abs/path', 'a//b', 'a/./b', 'a/../b', '', 'a\\b', 'a\0b'])('refuses the path %j', (p) => {
    expect(() => safePath(p)).toThrow(StoreError)
    withDir((dir) => expect(() => nodeStore(dir).createExclusive(p, 'x')).toThrow(StoreError))
  })

  it('runs the whole fake schedule on real files, journal chain and manifest included', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'match-eval-live-'))
    try {
      const f = await paidFixture()
      const real = nodeStore(dir)
      for (const [path, text] of f.store.files) if (path.startsWith('counts/')) real.createExclusive(path, text)
      const res = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: real, transport: f.gen.transport, getKey: () => FAKE_KEY, clock })
      expect(res.status).toBe('completed')
      expect(readJournal(real, JOURNAL).entries).toHaveLength(2 + 66 * 2)
      expect(verifyManifest(real, 'runs/paid-run-1/raw')).toEqual([])
      expect(() => assertCanStart(real, 'paid-run-1')).toThrow(/single-use/)
      expect(readFileSync(join(dir, 'runs/paid-run-1/approval.json'), 'utf8')).toContain('"runId": "paid-run-1"')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 60_000)
})
