import { describe, expect, it } from 'vitest'
import { CASES, GATE_PAIRS } from './match-eval/cases'
import { Ledger } from './match-eval/ledger'
import { journalPath, readJournal, unresolvedIn } from './match-eval/live/journal'
import { beyondTripwire, parseUsage, type Slot } from './match-eval/live/engine'
import { verifyManifest } from './match-eval/live/raw'
import { COUNT_URL, GENERATION_URL, PROVISIONAL_MAX_OUTPUT_TOKENS, requestSet } from './match-eval/live/requests'
import { memoryStore } from './match-eval/live/store'
import { TransportTimeout } from './match-eval/live/transport'
import { runPaid } from './match-eval/live/engine'
import type { EvalCase } from './match-eval/types'
import { caseIdOf, clock, FAKE_KEY, messageBody, ok, paidFixture, PRICING, scriptedOutput, TODAY, type GenScript } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a: the paid-run command against a fake transport (docs/MATCH-EVAL.md, "Stage 1a").
 * No network, no credential, no model, no spending.
 */

const caseById = (id: string) => CASES.find((c) => c.id === id) as EvalCase

/** A clean 200 for a case, with the stated changes. */
const reply = (caseId: string, counted: number, o: { text?: string; input?: number; output?: number; stop?: string; model?: string; usage?: Record<string, unknown>; content?: unknown[] } = {}) =>
  ok(messageBody({ text: o.text ?? JSON.stringify(scriptedOutput(caseById(caseId))), input: o.input ?? counted, output: o.output ?? 120, stop: o.stop, model: o.model, usage: o.usage, content: o.content }))

/** A script that is clean everywhere except at call number `at`, where it returns `bad`. */
const badAt = (at: number, bad: (caseId: string, counted: number, req: Parameters<GenScript>[1]) => ReturnType<GenScript>): GenScript => (n, req, caseId, counted) => (n === at ? bad(caseId, counted, req) : reply(caseId, counted))

describe('a clean run', () => {
  it('sends the 66 scheduled calls one after another, sample by sample, to the generation endpoint only', async () => {
    const f = await paidFixture()
    const res = await f.run()
    expect(res.status).toBe('completed')
    if (res.status !== 'completed') return
    expect(f.gen.calls).toHaveLength(66)
    f.gen.calls.forEach((c, i) => {
      expect(caseIdOf(c)).toBe(CASES[i % 22].id)
      expect(c.url).toBe(GENERATION_URL)
      expect(c.url).not.toBe(COUNT_URL)
      expect(c.headers).toEqual({ 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': FAKE_KEY })
    })
    const set = requestSet(CASES, PROVISIONAL_MAX_OUTPUT_TOKENS)
    f.gen.calls.forEach((c, i) => expect(c.body).toBe(set[i % 22].generation))
    expect(res.slots).toHaveLength(66)
    expect(res.slots.map((s) => s.status)).toEqual(Array(66).fill('valid'))
    expect(res.slots.map((s) => [s.caseId, s.sample])).toEqual(Array.from({ length: 66 }, (_, i) => [CASES[i % 22].id, Math.floor(i / 22) + 1]))
  })

  it('does not count again: it consumes the approved report and its transport is the generation endpoint only', async () => {
    const f = await paidFixture()
    const before = f.store.read('counts/count-run-1/report.json')
    const countOps = f.store.ops.filter((o) => o.includes(' counts/'))
    expect(countOps.length).toBeGreaterThan(50)
    await f.run()
    expect(f.gen.calls.every((c) => c.url === GENERATION_URL)).toBe(true)
    expect(f.store.read('counts/count-run-1/report.json')).toBe(before)
    expect(f.store.ops.filter((o) => o.includes(' counts/'))).toEqual(countOps)
  })

  it('reserves, settles and journals every call, and leaves nothing unresolved', async () => {
    const f = await paidFixture()
    const res = await f.run()
    expect(res.status).toBe('completed')
    const { entries } = readJournal(f.store, journalPath('paid-run-1'))
    expect(entries[0]).toMatchObject({ t: 'started', runId: 'paid-run-1' })
    expect(entries.at(-1)).toMatchObject({ t: 'finished' })
    expect(entries.filter((e) => e.t === 'reserved')).toHaveLength(66)
    expect(entries.filter((e) => e.t === 'settled')).toHaveLength(66)
    expect(unresolvedIn('paid-run-1', entries)).toEqual([])
    entries.forEach((e, i) => {
      if (e.t === 'reserved') expect(entries[i + 1]).toMatchObject({ t: 'settled', seq: e.seq })
    })
    if (res.status === 'completed') {
      const spent = res.slots.reduce((t, s) => t + s.chargedMicros, 0)
      expect(res.snapshot.spentMicros).toBe(spent)
      expect(res.snapshot.heldMicros).toBe(0)
      expect(res.snapshot.reservedMicros).toBe(0)
      expect(res.snapshot.halted).toBe(false)
    }
  })

  it('saves every raw body before anything parses it, with a manifest that verifies', async () => {
    const f = await paidFixture()
    await f.run()
    const bodies = [...f.store.files.keys()].filter((k) => k.startsWith('runs/paid-run-1/raw/') && k.endsWith('.body'))
    expect(bodies).toHaveLength(66)
    expect(verifyManifest(f.store, 'runs/paid-run-1/raw')).toEqual([])
    expect(f.store.read('runs/paid-run-1/approval.json')).toContain('"runId": "paid-run-1"')
    expect(f.store.read('runs/paid-run-1/result.json')).toContain('"stopped": null')
  })

  it('never writes the key anywhere', async () => {
    const f = await paidFixture()
    await f.run()
    for (const [path, text] of f.store.files) expect(text, path).not.toContain(FAKE_KEY)
  })

  it('sends a pair the rules turn away nowhere: it is not a slot and not a request', async () => {
    const f = await paidFixture()
    const res = await runPaid({ approval: f.approval, today: TODAY, cases: [...CASES, ...GATE_PAIRS], store: f.store, transport: f.gen.transport, getKey: () => FAKE_KEY, clock })
    expect(res.status).toBe('completed')
    expect(f.gen.calls).toHaveLength(66)
    for (const c of f.gen.calls) expect(caseIdOf(c)).not.toMatch(/^X/)
  })
})

describe('refusals before the first call', () => {
  const noCalls = async (f: Awaited<ReturnType<typeof paidFixture>>, res: Awaited<ReturnType<typeof runPaid>>) => {
    expect(res.status === 'refused-before-start' || res.status === 'invalid-configuration').toBe(true)
    expect(f.gen.calls).toHaveLength(0)
    expect([...f.store.files.keys()].filter((k) => k.startsWith('runs/'))).toEqual([])
  }

  it('refuses when a gate is pending, the report is missing or altered, or a binding differs', async () => {
    const cases: [string, Parameters<typeof paidFixture>[0]][] = [
      ['model pending', { approval: { approvals: { model: { status: 'pending' }, prompt: { status: 'approved', by: 'x', on: TODAY }, spend: { status: 'approved', by: 'x', on: TODAY } } } }],
      ['wrong report hash', { approval: { countReportSha256: 'd'.repeat(64) } }],
      ['no such count run', { approval: { countRunId: 'count-run-404' } }],
      ['wrong calls', { approval: { calls: 21 } }],
      ['ceiling too low', { approval: { maxOutputTokens: 5 } }],
      ['expired', { approval: { expiresOn: '2026-10-01' } }],
    ]
    for (const [label, o] of cases) {
      const f = await paidFixture(o)
      const res = await f.run()
      expect(res.status, label).toBe('refused-before-start')
      await noCalls(f, res)
    }
  })

  it('refuses a stale report: the cases or the report changed after the count', async () => {
    const f = await paidFixture()
    const files = new Map(f.store.files)
    const text = files.get('counts/count-run-1/report.json') as string
    files.set('counts/count-run-1/report.json', text.replace('"match-eval-count-report/1"', '"match-eval-count-report/2"'))
    const res = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: memoryStore({ files }), transport: f.gen.transport, getKey: () => FAKE_KEY, clock })
    expect(res).toMatchObject({ status: 'refused-before-start' })
    expect(f.gen.calls).toHaveLength(0)
    const edited = CASES.map((c, i) => (i === 3 ? { ...c, them: { ...c.them, words: ['edited', ...c.them.words.slice(1)] } } : c))
    const res2 = await runPaid({ approval: f.approval, today: TODAY, cases: edited, store: f.store, transport: f.gen.transport, getKey: () => FAKE_KEY, clock })
    expect(res2.status).toBe('refused-before-start')
    expect(f.gen.calls).toHaveLength(0)
  })

  it('refuses a plan that does not fit the limit, whole, with the figure needed, and sends nothing', async () => {
    const f = await paidFixture({ approval: { limitMicros: 100_000 } })
    const res = await f.run()
    expect(res.status).toBe('refused-before-start')
    if (res.status === 'refused-before-start') {
      expect(res.message).toMatch(/needs up to \$\d+\.\d\d \(66 calls/)
      expect(res.message).toMatch(/Nothing was reduced/)
    }
    await noCalls(f, res)
  })

  it('accepts a limit exactly at the planned worst case, and refuses one micro-dollar below', async () => {
    const f0 = await paidFixture()
    const ledger = new Ledger({ limitMicros: 1, pricing: PRICING, maxOutputTokens: PROVISIONAL_MAX_OUTPUT_TOKENS, today: TODAY })
    const perCall = ledger.costOf(f0.report.reserveBoundTokens, PROVISIONAL_MAX_OUTPUT_TOKENS)
    const exact = await paidFixture({ approval: { limitMicros: perCall * 66 } })
    expect((await exact.run()).status).toBe('completed')
    const below = await paidFixture({ approval: { limitMicros: perCall * 66 - 1 } })
    expect((await below.run()).status).toBe('refused-before-start')
    expect(below.gen.calls).toHaveLength(0)
  })

  it('refuses a second start under one run id', async () => {
    const f = await paidFixture()
    expect((await f.run()).status).toBe('completed')
    const again = await f.run()
    expect(again).toMatchObject({ status: 'refused-before-start' })
    expect(JSON.stringify(again)).toMatch(/single-use/)
    expect(f.gen.calls).toHaveLength(66)
  })

  it('stops with every slot unsent when no credential is supplied: the run was already started, so its id is spent', async () => {
    const f = await paidFixture()
    const res = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: f.store, transport: f.gen.transport, getKey: () => ' ', clock })
    expect(res).toMatchObject({ status: 'stopped', reason: 'no-credential' })
    if (res.status === 'stopped') {
      expect(res.slots).toHaveLength(66)
      expect(res.slots.every((s) => s.status === 'not-run')).toBe(true)
    }
    expect(f.gen.calls).toHaveLength(0)
    expect(readJournal(f.store, journalPath('paid-run-1')).entries.map((e) => e.t)).toEqual(['started', 'halted'])
  })
})

describe('the input allowance, checked on every response', () => {
  it('stops on billed input above the request’s own allowance even when the output is tiny and the dollar cost is far under the reservation', async () => {
    const f = await paidFixture()
    const items = new Map(f.report.items.map((i) => [i.caseId, i]))
    const script: GenScript = (n, _req, id, counted) => (n === 5 ? reply(id, counted, { input: (items.get(id) as { allowanceTokens: number }).allowanceTokens + 1, output: 1 }) : reply(id, counted))
    const g = await paidFixture({ script })
    const res = await g.run()
    expect(res.status).toBe('stopped')
    if (res.status !== 'stopped') return
    expect(res.reason).toBe('input-allowance-exceeded')
    expect(g.gen.calls).toHaveLength(5)
    expect(res.snapshot.halted).toBe(true)
    const fifth = res.slots[4]
    expect(fifth.charge).toBe('settled')
    expect(fifth.chargedMicros).toBeLessThan(fifth.reservedMicros)
    expect(res.slots.slice(5).every((s) => s.status === 'not-run')).toBe(true)
  })

  it('checks each request against its own allowance, not only the largest one', async () => {
    const f = await paidFixture()
    const sorted = [...f.report.items].sort((a, b) => a.allowanceTokens - b.allowanceTokens)
    const small = sorted[0]
    expect(small.allowanceTokens).toBeLessThan(f.report.reserveBoundTokens)
    const idx = CASES.findIndex((c) => c.id === small.caseId)
    const script: GenScript = (n, _r, id, counted) => (n === idx + 1 ? reply(id, counted, { input: small.allowanceTokens + 1, output: 5 }) : reply(id, counted))
    const g = await paidFixture({ script })
    const res = await g.run()
    expect(small.allowanceTokens + 1).toBeLessThanOrEqual(g.report.reserveBoundTokens)
    expect(res).toMatchObject({ status: 'stopped', reason: 'input-allowance-exceeded' })
  })

  it('lets a response at exactly its allowance continue', async () => {
    const items = new Map((await paidFixture()).report.items.map((i) => [i.caseId, i]))
    const script: GenScript = (n, _r, id, counted) => (n === 2 ? reply(id, counted, { input: (items.get(id) as { allowanceTokens: number }).allowanceTokens, output: 5 }) : reply(id, counted))
    const g = await paidFixture({ script })
    expect((await g.run()).status).toBe('completed')
  })

  it('stops if billed output is somehow above the ceiling', async () => {
    const g = await paidFixture({ script: badAt(3, (id, counted) => reply(id, counted, { output: PROVISIONAL_MAX_OUTPUT_TOKENS + 1 })) })
    const res = await g.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'output-ceiling-exceeded' })
    expect(g.gen.calls).toHaveLength(3)
  })
})

describe('the first-call calibration tripwire', () => {
  it('compares billed input with the count in whole numbers', () => {
    expect(beyondTripwire(110, 100, 10)).toBe(false)
    expect(beyondTripwire(111, 100, 10)).toBe(true)
    expect(beyondTripwire(90, 100, 10)).toBe(false)
    expect(beyondTripwire(89, 100, 10)).toBe(true)
    expect(beyondTripwire(100, 100, 10)).toBe(false)
  })

  it('stops after the first call, before the second, when billed input is more than 10% above the count', async () => {
    const g = await paidFixture({ script: (_n, _r, id, counted) => reply(id, counted, { input: Math.ceil(counted * 1.12) }) })
    const res = await g.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'calibration-tripwire' })
    expect(g.gen.calls).toHaveLength(1)
    if (res.status === 'stopped') {
      expect(res.slots[0].status).toBe('valid')
      expect(res.slots[0].charge).toBe('settled')
      expect(res.slots.slice(1).every((s) => s.status === 'not-run')).toBe(true)
    }
  })

  it('stops when billed input is more than 10% below the count', async () => {
    const g = await paidFixture({ script: (_n, _r, id, counted) => reply(id, counted, { input: Math.floor(counted * 0.85) }) })
    const res = await g.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'calibration-tripwire' })
    expect(g.gen.calls).toHaveLength(1)
  })

  it('lets a first call within 10% continue, and only checks the first call', async () => {
    const g = await paidFixture({ script: (n, _r, id, counted) => reply(id, counted, { input: n === 1 ? Math.ceil(counted * 1.05) : Math.ceil(counted * 1.12) }) })
    expect((await g.run()).status).toBe('completed')
    expect(g.gen.calls).toHaveLength(66)
  })
})

describe('failures: the whole reservation is kept, the run stops, nothing is retried', () => {
  const FAILURES: [string, ReturnType<GenScript>, string][] = [
    ['HTTP 400 on a reached spend limit', { status: 400, headers: { 'request-id': 'req_400' }, body: '{"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits."}}' }, 'http-400'],
    ['HTTP 401', { status: 401, headers: {}, body: '{"type":"error","error":{"type":"authentication_error"}}' }, 'http-401'],
    ['HTTP 429 with retry-after', { status: 429, headers: { 'retry-after': '30' }, body: '{"type":"error","error":{"type":"rate_limit_error"}}' }, 'http-429'],
    ['HTTP 429 spend cap, no retry-after', { status: 429, headers: {}, body: '{"type":"error","error":{"type":"rate_limit_error","details":{"error_code":"enforced_spend_limit_reached"}}}' }, 'http-429'],
    ['HTTP 500 with an HTML body', { status: 500, headers: {}, body: '<html>oops</html>' }, 'http-500'],
    ['HTTP 529 overloaded', { status: 529, headers: {}, body: '{"type":"error","error":{"type":"overloaded_error"}}' }, 'http-529'],
    ['a redirect', { status: 302, headers: { location: 'https://evil.example/' }, body: '' }, 'http-302'],
    ['a 200 whose body is not JSON', { status: 200, headers: {}, body: 'plain text, not json' }, 'unparseable-response'],
  ]

  it.each(FAILURES)('%s', async (_label, bad, reason) => {
    const g = await paidFixture({ script: badAt(4, () => bad) })
    const res = await g.run()
    expect(res.status).toBe('stopped')
    if (res.status !== 'stopped') return
    expect(res.reason).toBe(reason)
    expect(g.gen.calls).toHaveLength(4)
    const slot = res.slots[3]
    expect(slot.status).toBe('error')
    expect(slot.charge).toBe('held')
    expect(res.snapshot.heldMicros).toBe(slot.reservedMicros)
    expect(res.snapshot.spentMicros).toBe(res.slots.slice(0, 3).reduce((t, s) => t + s.chargedMicros, 0))
    expect(g.store.read('runs/paid-run-1/raw/004.body')).toBe(bad instanceof Error ? null : bad.body)
    expect(res.slots.slice(4).every((s) => s.status === 'not-run')).toBe(true)
    const { entries } = readJournal(g.store, journalPath('paid-run-1'))
    expect(entries.at(-1)).toMatchObject({ t: 'halted', reason })
    expect(entries.filter((e) => e.t === 'held')).toHaveLength(1)
    expect(unresolvedIn('paid-run-1', entries)).toEqual([])
  })

  it('records a timeout with a raw note and no body, and does not retry', async () => {
    const g = await paidFixture({ script: badAt(2, () => new TransportTimeout('no complete response within 120000 ms')) })
    const res = await g.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'timeout' })
    expect(g.gen.calls).toHaveLength(2)
    if (res.status !== 'stopped') return
    expect(res.slots[1]).toMatchObject({ status: 'timeout', charge: 'held' })
    expect(g.store.read('runs/paid-run-1/raw/002.body')).toBeNull()
    expect(JSON.parse(g.store.read('runs/paid-run-1/raw/002.meta.json') as string)).toMatchObject({ httpStatus: null, bodySha256: null })
  })

  it('records a network error the same way', async () => {
    const g = await paidFixture({ script: badAt(2, () => new Error('socket hang up')) })
    expect(await g.run()).toMatchObject({ status: 'stopped', reason: 'transport-error' })
    expect(g.gen.calls).toHaveLength(2)
  })

  it('keeps the whole reservation when usage is missing or invalid, and halts', async () => {
    const BAD_USAGE: Record<string, unknown>[] = [
      {},
      { input_tokens: 10 },
      { output_tokens: 10 },
      { input_tokens: -1, output_tokens: 5 },
      { input_tokens: 1.5, output_tokens: 5 },
      { input_tokens: '10', output_tokens: 5 },
      { input_tokens: null, output_tokens: 5 },
      { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 4 },
      { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 4 },
      { input_tokens: 2 ** 60, output_tokens: 5 },
    ]
    for (const usage of BAD_USAGE) {
      const g = await paidFixture({ script: badAt(3, (id, counted) => reply(id, counted, { usage })) })
      const res = await g.run()
      expect(res, JSON.stringify(usage)).toMatchObject({ status: 'stopped', reason: 'invalid-usage' })
      if (res.status !== 'stopped') continue
      expect(res.slots[2]).toMatchObject({ status: 'error', charge: 'held' })
      expect(res.snapshot.heldMicros).toBe(res.slots[2].reservedMicros)
      expect(res.snapshot.halted).toBe(true)
      expect(g.gen.calls).toHaveLength(3)
    }
    expect(parseUsage(undefined)).toBeNull()
    expect(parseUsage({ input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: null })).toEqual({ inputTokens: 1, outputTokens: 2 })
  })

  it('keeps the reservation and stops when the response names a different model', async () => {
    const g = await paidFixture({ script: badAt(2, (id, counted) => reply(id, counted, { model: 'claude-opus-5-5' })) })
    const res = await g.run()
    expect(res).toMatchObject({ status: 'stopped', reason: 'model-mismatch' })
    if (res.status === 'stopped') expect(res.slots[1].charge).toBe('held')
  })

  it('keeps the reservation when the transport refuses a request before sending it', async () => {
    const f = await paidFixture()
    const res = await runPaid({ approval: f.approval, today: TODAY, cases: CASES, store: f.store, transport: f.gen.transport, getKey: () => 'has space', clock })
    expect(res).toMatchObject({ status: 'stopped', reason: 'transport-refused' })
    if (res.status === 'stopped') {
      expect(res.slots[0]).toMatchObject({ status: 'error', charge: 'held' })
      expect(res.slots[0].notes.join()).toMatch(/nothing reached the network/)
      expect(JSON.stringify(res.slots[0].reasons)).not.toContain('has space')
    }
    expect(f.gen.calls).toHaveLength(0)
  })
})

describe('what a call can turn out to be', () => {
  const run = async (script: GenScript) => {
    const g = await paidFixture({ script })
    const res = await g.run()
    if (res.status !== 'completed' && res.status !== 'stopped') throw new Error('did not run')
    return { res, g }
  }

  it('records a truncated reply as its own status, keeps the text, charges it, and carries on', async () => {
    const { res } = await run(badAt(2, (id, counted) => reply(id, counted, { text: '{"schema":"match-eval-output/1","caseId":"S0', stop: 'max_tokens', output: PROVISIONAL_MAX_OUTPUT_TOKENS })))
    expect(res.status).toBe('completed')
    expect(res.slots[1]).toMatchObject({ status: 'truncated', stopReason: 'max_tokens', charge: 'settled', text: '{"schema":"match-eval-output/1","caseId":"S0' })
    expect(res.slots[1].reasons.join()).toMatch(/not-json/)
    expect(res.slots.filter((s) => s.status === 'valid')).toHaveLength(65)
  })

  it('records a refusal and an unexpected stop reason, and carries on', async () => {
    const { res } = await run((n, _r, id, counted) => (n === 2 ? reply(id, counted, { text: '', stop: 'refusal', output: 0 }) : n === 3 ? reply(id, counted, { stop: 'pause_turn' }) : reply(id, counted)))
    expect(res.slots[1]).toMatchObject({ status: 'refusal', stopReason: 'refusal', charge: 'settled' })
    expect(res.slots[2]).toMatchObject({ status: 'other-stop', stopReason: 'pause_turn' })
    expect(res.status).toBe('completed')
  })

  it('rejects a reply wrapped in a code fence, keeps it verbatim, and does not repair it', async () => {
    const fenced = '```json\n' + JSON.stringify(scriptedOutput(CASES[0])) + '\n```'
    const { res } = await run(badAt(1, (id, counted) => reply(id, counted, { text: fenced })))
    expect(res.slots[0]).toMatchObject({ status: 'rejected', text: fenced, output: null })
    expect(res.slots[0].reasons.join()).toMatch(/H9 not-json/)
  })

  it('rejects a reply with a forbidden field and keeps every other slot', async () => {
    const withScore = JSON.stringify({ ...scriptedOutput(CASES[0]), score: 9 })
    const { res } = await run(badAt(1, (id, counted) => reply(id, counted, { text: withScore })))
    expect(res.slots[0].status).toBe('rejected')
    expect(res.slots[0].reasons.join()).toMatch(/forbidden-field/)
    expect(res.slots).toHaveLength(66)
  })

  it('keeps a soft flag as a flag: an over-long line is valid and flagged', async () => {
    const long = { ...scriptedOutput(CASES[0]) }
    long.statements = [{ text: Array(60).fill('word').join(' '), basis: [{ who: 'them', words: 0 }] }]
    const { res } = await run(badAt(1, (id, counted) => reply(id, counted, { text: JSON.stringify(long) })))
    expect(res.slots[0].status).toBe('valid')
    expect(res.slots[0].flags).toContain('over-length')
  })

  it('joins several text blocks and notes any other kind of block', async () => {
    const out = JSON.stringify(scriptedOutput(CASES[0]))
    const half = Math.floor(out.length / 2)
    const { res } = await run(
      badAt(1, (id, counted) =>
        reply(id, counted, { content: [{ type: 'thinking', thinking: 'x' }, { type: 'text', text: out.slice(0, half) }, { type: 'text', text: out.slice(half) }] }),
      ),
    )
    expect(res.slots[0].status).toBe('valid')
    expect(res.slots[0].notes.join()).toMatch(/unexpected content block: thinking/)
  })

  it('charges each settled call its actual cost from the pricing record', async () => {
    const { res } = await run((_n, _r, id, counted) => reply(id, counted, { output: 200 }))
    const s = res.slots[0]
    expect(s.chargedMicros).toBe((s.inputTokens as number) * PRICING.inputPerMTok + 200 * PRICING.outputPerMTok)
  })
})

describe('every scheduled slot is kept', () => {
  it('lists all 66 slots when the run stops early, and a halt can fall inside the first sample', async () => {
    const g = await paidFixture({ script: badAt(5, () => ({ status: 500, headers: {}, body: 'x' })) })
    const res = await g.run()
    expect(res.status).toBe('stopped')
    if (res.status !== 'stopped') return
    const slots: Slot[] = res.slots
    expect(slots).toHaveLength(66)
    expect(slots.map((s) => s.index)).toEqual(Array.from({ length: 66 }, (_, i) => i))
    expect(slots.filter((s) => s.sample === 1 && s.status === 'not-run')).toHaveLength(17)
    expect(slots.filter((s) => s.sample !== 1).every((s) => s.status === 'not-run')).toBe(true)
    for (const s of slots.filter((x) => x.status === 'not-run')) expect(s.reasons.join()).toMatch(/the run stopped \(http-500\)/)
  })
})
