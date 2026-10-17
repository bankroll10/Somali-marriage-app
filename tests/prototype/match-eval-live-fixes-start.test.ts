import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CASES } from './match-eval/cases'
import { loadCountReport, runCount } from './match-eval/live/count'
import { runPaid } from './match-eval/live/engine'
import { COUNT_URL } from './match-eval/live/requests'
import { memoryStore, nodeStore, type MemoryStore } from './match-eval/live/store'
import { clock, countApprovalFor, countedStore, fakeCountTransport, FAKE_KEY, paidFixture, TODAY } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a correction pass, item 2: a run id is durably single-use BEFORE anything is sent. After approval
 * validation a start record is created exclusively and flushed, holding the approved configuration, before the
 * credential is requested or the transport is called. A reused id sends nothing; a partial run stays visibly incomplete.
 */

const START = 'counts/count-run-1/start.json'

/** Counting inputs with spies: how many times the key was requested, and what the store held when it was. */
function rig(store: MemoryStore, transport = fakeCountTransport()) {
  const keyAsked: string[][] = []
  const getKey = () => {
    keyAsked.push([...store.ops])
    return FAKE_KEY
  }
  const go = () => runCount({ approval: countApprovalFor(), today: TODAY, cases: CASES, store, transport: transport.transport, getKey, clock })
  return { keyAsked, transport, go }
}

describe('the count start record', () => {
  it('is created and flushed first, with the approved configuration, before the credential is requested or anything is sent', async () => {
    const store = memoryStore()
    let atFirstSend: string[] = []
    const t = fakeCountTransport((req) => {
      if (atFirstSend.length === 0) atFirstSend = [...store.ops]
      return { status: 200, headers: {}, body: JSON.stringify({ input_tokens: Math.ceil(req.body.length / 3) }) }
    })
    const r = rig(store, t)
    const res = await r.go()
    expect(res.status).toBe('completed')
    expect(r.keyAsked).toHaveLength(27)
    expect(r.keyAsked[0][0]).toBe(`create ${START}`)
    expect(atFirstSend[0]).toBe(`create ${START}`)
    expect(store.ops[0]).toBe(`create ${START}`)
    const start = JSON.parse(store.read(START) as string)
    expect(start.kind).toBe('match-eval-count-start/1')
    expect(start.approval).toEqual(countApprovalFor())
    expect(start.endpoint).toBe(COUNT_URL)
    expect(start.plannedCalls).toBe(27)
    expect(start.allowancePercent).toBe(15)
    expect(start.startedAt).toBe(clock())
    for (const k of ['countRequestSetSha256', 'examplesSha256', 'settingsSha256', 'promptSha256', 'schemaSha256', 'casesFileSha256']) expect(start[k], k).toMatch(/^[0-9a-f]{64}$/)
    expect(store.read(START)).not.toContain(FAKE_KEY)
  })

  it('makes a reused id send nothing and ask for no credential', async () => {
    const store = memoryStore()
    await rig(store).go()
    const again = rig(store)
    const res = await again.go()
    expect(res).toMatchObject({ status: 'refused' })
    expect(again.transport.calls).toHaveLength(0)
    expect(again.keyAsked).toHaveLength(0)
  })

  it('keeps the id used after a crash before the first response: nothing is sent and no credential is requested on a second try', async () => {
    const store = memoryStore()
    let crashed: Map<string, string> | undefined
    const t = fakeCountTransport((req) => {
      crashed ??= store.snapshot()
      return { status: 200, headers: {}, body: JSON.stringify({ input_tokens: Math.ceil(req.body.length / 3) }) }
    })
    await rig(store, t).go()
    const after = memoryStore({ files: crashed })
    expect([...after.files.keys()]).toEqual([START])
    const second = rig(after)
    expect(await second.go()).toMatchObject({ status: 'refused' })
    expect(second.transport.calls).toHaveLength(0)
    expect(second.keyAsked).toHaveLength(0)
    const { countRunStatus } = await import('./match-eval/live/count')
    expect(countRunStatus(after, 'count-run-1')).toMatchObject({ status: 'incomplete' })
  })

  it('lets only one of two simultaneous starts with the same id send anything', async () => {
    const store = memoryStore()
    const a = rig(store)
    const b = rig(store)
    const [ra, rb] = await Promise.all([a.go(), b.go()])
    expect([ra.status, rb.status].sort()).toEqual(['completed', 'refused'])
    expect(a.transport.calls.length + b.transport.calls.length).toBe(27)
    expect(a.keyAsked.length + b.keyAsked.length).toBe(27)
    expect(Math.min(a.keyAsked.length, b.keyAsked.length)).toBe(0)
  })

  it('refuses, sends nothing and requests no credential when the start record cannot be written', async () => {
    const store = memoryStore({ fail: (op, path) => op === 'create' && path === START })
    const r = rig(store)
    const res = await r.go()
    expect(res).toMatchObject({ status: 'refused' })
    expect(JSON.stringify(res)).toMatch(/start record/)
    expect(r.transport.calls).toHaveLength(0)
    expect(r.keyAsked).toHaveLength(0)
    expect(store.files.size).toBe(0)
  })

  it('refuses a bad approval before writing anything: no start record, no credential, no call', async () => {
    const store = memoryStore()
    const t = fakeCountTransport()
    const asked: number[] = []
    const res = await runCount({ approval: { ...countApprovalFor(), count: { status: 'pending' } }, today: TODAY, cases: CASES, store, transport: t.transport, getKey: () => (asked.push(1), FAKE_KEY), clock })
    expect(res.status).toBe('refused')
    expect(asked).toHaveLength(0)
    expect(t.calls).toHaveLength(0)
    expect(store.files.size).toBe(0)
  })
})

describe('a partial count run', () => {
  it('stays visibly incomplete: a stop record, no report, a status that says so', async () => {
    const store = memoryStore()
    const t = fakeCountTransport((req, n) => (n === 5 ? new Error('socket hang up') : { status: 200, headers: {}, body: JSON.stringify({ input_tokens: Math.ceil(req.body.length / 3) }) }))
    const res = await rig(store, t).go()
    expect(res).toMatchObject({ status: 'stopped', reason: 'transport-error', callsMade: 5 })
    expect(store.read('counts/count-run-1/report.json')).toBeNull()
    const stopped = JSON.parse(store.read('counts/count-run-1/stopped.json') as string)
    expect(stopped).toMatchObject({ reason: 'transport-error', callsMade: 5, plannedCalls: 27 })
    const { countRunStatus } = await import('./match-eval/live/count')
    expect(countRunStatus(store, 'count-run-1')).toMatchObject({ status: 'incomplete', stopped: { reason: 'transport-error' } })
    const loaded = loadCountReport(store, 'count-run-1')
    expect(JSON.stringify(loaded)).toMatch(/incomplete/)
    // It cannot be started again under the same id.
    const again = rig(store)
    expect(await again.go()).toMatchObject({ status: 'refused' })
    expect(again.keyAsked).toHaveLength(0)
  })

  it('reports a finished run as complete and a never-started id as not started', async () => {
    const { store } = await countedStore()
    const { countRunStatus } = await import('./match-eval/live/count')
    expect(countRunStatus(store, 'count-run-1')).toMatchObject({ status: 'complete' })
    expect(countRunStatus(memoryStore(), 'never-used')).toMatchObject({ status: 'not-started' })
  })

  it('is refused by the paid-run command, which asks for no credential', async () => {
    const f = await paidFixture()
    for (const path of ['counts/count-run-1/report.json', 'counts/count-run-1/report.sha256']) f.store.files.delete(path)
    f.store.files.set('counts/count-run-1/stopped.json', JSON.stringify({ reason: 'transport-error', callsMade: 5, plannedCalls: 27 }))
    let asked = 0
    const res = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: f.store, transport: f.gen.transport, getKey: () => (asked++, FAKE_KEY), clock })
    expect(res).toMatchObject({ status: 'refused-before-start' })
    expect(asked).toBe(0)
    expect(f.gen.calls).toHaveLength(0)
  })
})

describe('the paid run is single-use before the credential, too', () => {
  it('asks for no credential when the run id has been used', async () => {
    const f = await paidFixture()
    expect((await f.run()).status).toBe('completed')
    let asked = 0
    const res = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: f.store, transport: f.gen.transport, getKey: () => (asked++, FAKE_KEY), clock })
    expect(res).toMatchObject({ status: 'refused-before-start' })
    expect(asked).toBe(0)
    expect(f.gen.calls).toHaveLength(66)
  })

  it('records the start and its journal line before the credential is requested', async () => {
    const f = await paidFixture()
    let seen: string[] = []
    const res = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: f.store, transport: f.gen.transport, getKey: () => ((seen = seen.length ? seen : [...f.store.ops]), FAKE_KEY), clock })
    expect(res.status).toBe('completed')
    expect(seen.filter((o) => o.includes('runs/paid-run-1/approval.json'))).toHaveLength(1)
    expect(seen.filter((o) => o.includes('runs/paid-run-1/journal.jsonl'))).toHaveLength(1)
  })

  it('lets only one of two simultaneous starts with the same run id send anything', async () => {
    const f = await paidFixture()
    const mk = () => {
      const asked: number[] = []
      return { asked, go: () => runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: f.store, transport: f.gen.transport, getKey: () => (asked.push(1), FAKE_KEY), clock }) }
    }
    const a = mk()
    const b = mk()
    const [ra, rb] = await Promise.all([a.go(), b.go()])
    expect([ra.status, rb.status].sort()).toEqual(['completed', 'refused-before-start'])
    expect(f.gen.calls).toHaveLength(66)
    expect(Math.min(a.asked.length, b.asked.length)).toBe(0)
  })
})

describe('the start record is durable on a real file system', () => {
  it('exists, parses and holds the approval after a run that stops at the first call', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'match-eval-start-'))
    try {
      const store = nodeStore(dir)
      const t = fakeCountTransport(() => new Error('connection lost'))
      const res = await runCount({ approval: countApprovalFor(), today: TODAY, cases: CASES, store, transport: t.transport, getKey: () => FAKE_KEY, clock })
      expect(res).toMatchObject({ status: 'stopped', callsMade: 1 })
      const start = JSON.parse(readFileSync(join(dir, START), 'utf8'))
      expect(start.approval.countRunId).toBe('count-run-1')
      expect(readFileSync(join(dir, START), 'utf8')).not.toContain(FAKE_KEY)
      const again = await runCount({ approval: countApprovalFor(), today: TODAY, cases: CASES, store, transport: t.transport, getKey: () => FAKE_KEY, clock })
      expect(again).toMatchObject({ status: 'refused' })
      expect(t.calls).toHaveLength(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
