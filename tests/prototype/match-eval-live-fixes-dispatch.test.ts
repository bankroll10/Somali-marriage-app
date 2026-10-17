import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CASES } from './match-eval/cases'
import { EXPECT } from './match-eval/expectations'
import { CREDENTIAL_VARIABLE, paidApprovalProblems, type PaidFacts } from './match-eval/live/approval'
import { COUNT_URL, GENERATION_URL, PROVISIONAL_MAX_OUTPUT_TOKENS, requestSet } from './match-eval/live/requests'
import { memoryStore, type MemoryStore } from './match-eval/live/store'
import type { Transport, TransportRequest, TransportResponse } from './match-eval/live/transport'
import { clock, countApprovalFor, countedStore, messageBody, ok, paidApprovalFor, paidFixture, scriptedOutput, TODAY } from './match-eval-live-support'
import { ROOT } from './support'

/**
 * MATCH-05 Stage 1a correction pass, item 4: the command boundary, offline. An injectable dispatcher takes a fake
 * environment, transport, clock and store. No test reads a real environment variable, and no real wrapper exists.
 * The paid approval also binds expectations v2, the review rubric and the preregistered analysis, none of which is ever
 * part of a model request.
 */

const DUMMY_KEY = 'DUMMY-KEY-DO-NOT-USE-0001'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

/** A fake environment that records every name asked for and refuses any name but the evaluation's own. */
function fakeEnv(values: Record<string, string | undefined> = { [CREDENTIAL_VARIABLE]: DUMMY_KEY }) {
  const asked: string[] = []
  return {
    asked,
    get(name: string): string | undefined {
      asked.push(name)
      if (name !== CREDENTIAL_VARIABLE) throw new Error(`test: unexpected environment read of ${name}`)
      return values[name]
    },
  }
}

/** A transport that records the requests it is shown and answers like the services do. */
function spyTransport(reply?: (req: TransportRequest, n: number) => TransportResponse | Error | undefined) {
  const calls: TransportRequest[] = []
  const transport: Transport = async (req) => {
    calls.push(req)
    const out = reply?.(req, calls.length)
    if (out instanceof Error) throw out
    if (out) return out
    if (req.url === COUNT_URL) return ok({ input_tokens: Math.ceil(req.body.length / 3) })
    const user = (JSON.parse(req.body) as { messages: { content: string }[] }).messages[0].content
    const id = (JSON.parse(user) as { caseId: string }).caseId
    return ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: 2400, output: 90 }))
  }
  return { calls, transport }
}

async function load() {
  return (await import('./match-eval/live/dispatch')) as unknown as {
    dispatch: (command: unknown, deps: unknown) => Promise<{ ok: boolean; reasons?: string[]; result?: unknown }>
  }
}

function deps(store: MemoryStore, env = fakeEnv(), t = spyTransport()) {
  return { env, t, deps: { env, transport: t.transport, store, clock, today: TODAY } }
}

async function counted(store: MemoryStore = memoryStore()) {
  const { dispatch } = await load()
  const d = deps(store)
  const res = await dispatch({ command: 'count', approval: countApprovalFor() }, d.deps)
  return { res, store, d, dispatch }
}

describe('the dispatcher runs the offline commands through fakes', () => {
  it('counts through the counting endpoint only, asking for exactly the one named variable', async () => {
    const { res, d } = await counted()
    expect(res.ok).toBe(true)
    expect(d.t.calls).toHaveLength(27)
    expect(new Set(d.t.calls.map((c) => c.url))).toEqual(new Set([COUNT_URL]))
    expect(new Set(d.env.asked)).toEqual(new Set([CREDENTIAL_VARIABLE]))
  })

  it('runs the paid command through the generation endpoint only, with the same single variable', async () => {
    const { store, dispatch } = await counted()
    const { report, reportSha256 } = await countedFrom(store)
    const d = deps(store)
    const res = await dispatch({ command: 'paid-run', approval: await paidWith(report, reportSha256) }, d.deps)
    expect(res.ok).toBe(true)
    expect(d.t.calls).toHaveLength(66)
    expect(new Set(d.t.calls.map((c) => c.url))).toEqual(new Set([GENERATION_URL]))
    expect(new Set(d.env.asked)).toEqual(new Set([CREDENTIAL_VARIABLE]))
  })

  it('reconciles and reports status without any credential, transport or network', async () => {
    const { store, dispatch } = await counted()
    const d = deps(store)
    const status = await dispatch({ command: 'status' }, d.deps)
    expect(status.ok).toBe(true)
    expect(JSON.stringify(status.result)).toMatch(/count-run-1/)
    expect(JSON.stringify(status.result)).toMatch(/complete/)
    expect(d.env.asked).toEqual([])
    expect(d.t.calls).toEqual([])
  })
})

async function countedFrom(store: MemoryStore) {
  const { loadCountReport } = await import('./match-eval/live/count')
  const loaded = loadCountReport(store, 'count-run-1')
  if ('error' in loaded) throw new Error(loaded.error)
  return loaded
}

/** A paid approval for the report, including the bindings added in this pass. */
async function paidWith(report: Awaited<ReturnType<typeof countedFrom>>['report'], reportSha256: string, over: Record<string, unknown> = {}) {
  return { ...paidApprovalFor(report, reportSha256), ...over } as never
}

describe('reconciliation through the dispatcher', () => {
  it('records a founder’s determination with no credential, no transport and no environment read, and refuses a repeat', async () => {
    const { dispatch } = await load()
    const f = await paidFixture({ script: (n, _r, id, counted) => (n === 3 ? { status: 500, headers: {}, body: 'x' } : ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 90 }))) })
    await f.run()
    const calls = f.gen.calls.length
    const d = deps(f.store)
    const cmd = { command: 'reconcile', runId: 'paid-run-1', seq: 3, determinedMicros: 0, note: 'Checked the Console: nothing billed.', by: 'the founder' }
    const first = await dispatch(cmd, d.deps)
    expect(first.ok).toBe(true)
    expect(JSON.stringify(first.result)).toMatch(/held/)
    const again = await dispatch(cmd, d.deps)
    expect(again.ok).toBe(false)
    expect(JSON.stringify(again.reasons)).toMatch(/already-reconciled/)
    expect(d.env.asked).toEqual([])
    expect(d.t.calls).toEqual([])
    expect(f.gen.calls).toHaveLength(calls)
  })
})

describe('invalid, expired or reused approvals never reach the credential getter', () => {
  const countBad: [string, (a: ReturnType<typeof countApprovalFor>) => unknown][] = [
    ['a pending gate', (a) => ({ ...a, count: { status: 'pending' } })],
    ['a wrong hash', (a) => ({ ...a, promptSha256: 'e'.repeat(64) })],
    ['an expired approval', (a) => ({ ...a, expiresOn: '2026-10-01' })],
    ['a wrong credential variable', (a) => ({ ...a, credentialVariable: 'ANTHROPIC_API_KEY' })],
    ['a string', () => 'approved'],
    ['null', () => null],
    ['an array', () => []],
    ['a paid-run record', () => ({ kind: 'match-eval-paid-run-approval/1' })],
  ]
  it.each(countBad)('count: %s', async (_label, make) => {
    const { dispatch } = await load()
    const store = memoryStore()
    const d = deps(store)
    const res = await dispatch({ command: 'count', approval: make(countApprovalFor()) }, d.deps)
    expect(res.ok).toBe(false)
    expect(d.env.asked).toEqual([])
    expect(d.t.calls).toEqual([])
    expect(store.files.size).toBe(0)
  })

  it('count: a reused id', async () => {
    const { store, dispatch } = await counted()
    const d = deps(store)
    const res = await dispatch({ command: 'count', approval: countApprovalFor() }, d.deps)
    expect(res.ok).toBe(false)
    expect(d.env.asked).toEqual([])
    expect(d.t.calls).toEqual([])
  })

  const paidBad: [string, (a: Record<string, unknown>) => Record<string, unknown>][] = [
    ['a pending gate', (a) => ({ ...a, approvals: { ...(a.approvals as object), spend: { status: 'pending' } } })],
    ['a wrong report hash', (a) => ({ ...a, countReportSha256: 'f'.repeat(64) })],
    ['a missing count run', (a) => ({ ...a, countRunId: 'count-run-404' })],
    ['an expired approval', (a) => ({ ...a, expiresOn: '2026-10-01' })],
    ['a limit the plan does not fit', (a) => ({ ...a, limitMicros: 1_000 })],
    ['a wrong credential variable', (a) => ({ ...a, credentialVariable: 'ANTHROPIC_API_KEY' })],
    ['a wrong ceiling', (a) => ({ ...a, maxOutputTokens: 3 })],
  ]
  it.each(paidBad)('paid run: %s', async (_label, make) => {
    const { store, dispatch } = await counted()
    const { report, reportSha256 } = await countedFrom(store)
    const d = deps(store)
    const res = await dispatch({ command: 'paid-run', approval: make((await paidWith(report, reportSha256)) as never) }, d.deps)
    expect(res.ok).toBe(false)
    expect(d.env.asked).toEqual([])
    expect(d.t.calls).toEqual([])
  })

  it('paid run: a reused run id, a count record in its place, and a stale report', async () => {
    const { store, dispatch } = await counted()
    const { report, reportSha256 } = await countedFrom(store)
    const approval = await paidWith(report, reportSha256)
    const first = deps(store)
    expect((await dispatch({ command: 'paid-run', approval }, first.deps)).ok).toBe(true)
    for (const bad of [approval, countApprovalFor(), { ...(approval as object), runId: 'paid-run-2', countRunId: 'count-run-1', promptSha256: 'a'.repeat(64) }]) {
      const d = deps(store)
      expect((await dispatch({ command: 'paid-run', approval: bad }, d.deps)).ok).toBe(false)
      expect(d.env.asked).toEqual([])
      expect(d.t.calls).toEqual([])
    }
  })

  it('refuses an unknown command, a missing command and any extra field, without touching the environment', async () => {
    const { dispatch } = await load()
    for (const cmd of [{ command: 'delete-everything' }, {}, null, 'count', { command: 'count', approval: countApprovalFor(), variable: 'ANTHROPIC_API_KEY' }, { command: 'status', extra: 1 }]) {
      const d = deps(memoryStore())
      expect((await dispatch(cmd, d.deps)).ok, JSON.stringify(cmd)).toBe(false)
      expect(d.env.asked).toEqual([])
      expect(d.t.calls).toEqual([])
    }
  })
})

describe('the named variable, the scopes and the key', () => {
  it('can request only the named evaluation variable: any other name would throw in the fake, and never does', async () => {
    const { d, res } = await counted()
    expect(res.ok).toBe(true)
    expect(d.env.asked.every((n) => n === 'MATCH_EVAL_ANTHROPIC_API_KEY')).toBe(true)
    expect(d.env.asked).not.toContain('ANTHROPIC_API_KEY')
  })

  it('keeps the count and paid scopes apart: a count approval cannot start a paid run and a paid approval cannot start a count', async () => {
    const { store, dispatch } = await counted()
    const { report, reportSha256 } = await countedFrom(store)
    const d1 = deps(store)
    expect((await dispatch({ command: 'paid-run', approval: countApprovalFor() }, d1.deps)).ok).toBe(false)
    const d2 = deps(memoryStore())
    expect((await dispatch({ command: 'count', approval: await paidWith(report, reportSha256) }, d2.deps)).ok).toBe(false)
    for (const d of [d1, d2]) {
      expect(d.env.asked).toEqual([])
      expect(d.t.calls).toEqual([])
    }
  })

  it('never lets the count command reach the generation endpoint, even through a permissive transport', async () => {
    const { dispatch } = await load()
    const store = memoryStore()
    const t = spyTransport()
    await dispatch({ command: 'count', approval: countApprovalFor() }, { env: fakeEnv(), transport: t.transport, store, clock, today: TODAY })
    expect(t.calls.some((c) => c.url === GENERATION_URL)).toBe(false)
  })

  it('does not expose the key in a result, a thrown error or any saved file, even when the transport’s error repeats it', async () => {
    const { dispatch } = await load()
    const store = memoryStore()
    const t = spyTransport((_req, n) => (n === 2 ? new Error(`401 for x-api-key ${DUMMY_KEY}`) : undefined))
    const res = await dispatch({ command: 'count', approval: countApprovalFor() }, { env: fakeEnv(), transport: t.transport, store, clock, today: TODAY })
    expect(res.ok).toBe(false)
    expect(JSON.stringify(res)).toMatch(/transport-error/)
    expect(JSON.stringify(res)).not.toContain(DUMMY_KEY)
    for (const [path, text] of store.files) expect(text, path).not.toContain(DUMMY_KEY)
    expect(JSON.parse(store.read('counts/count-run-1/raw/002.meta.json') as string).error).toMatch(/\[redacted\]/)
  })

  it('does not expose the key when the command throws, or when the key is unusable', async () => {
    const { dispatch } = await load()
    for (const value of [`${DUMMY_KEY} with spaces`, undefined, '']) {
      const store = memoryStore()
      const t = spyTransport()
      const res = await dispatch({ command: 'count', approval: countApprovalFor() }, { env: fakeEnv({ [CREDENTIAL_VARIABLE]: value }), transport: t.transport, store, clock, today: TODAY })
      expect(JSON.stringify(res), String(value)).not.toContain(DUMMY_KEY)
      for (const [path, text] of store.files) expect(text, path).not.toContain(DUMMY_KEY)
      expect(t.calls).toEqual([])
    }
    const boom = await dispatch({ command: 'count', approval: countApprovalFor() }, { env: fakeEnv(), transport: (async () => { throw new Error(`leak ${DUMMY_KEY}`) }) as Transport, store: memoryStore(), clock, today: TODAY })
    expect(JSON.stringify(boom)).not.toContain(DUMMY_KEY)
  })
})

describe('the paid approval binds expectations v2, the rubric and the preregistered analysis', () => {
  const facts = async () => {
    const { report, reportSha256 } = await countedStore()
    const approval = paidApprovalFor(report, reportSha256)
    const b = (await import('./match-eval/live/bindings')) as unknown as Record<string, () => string>
    const f = {
      model: approval.model,
      countReportSha256: reportSha256,
      countRequestSetSha256: report.countRequestSetSha256,
      generationRequestSetSha256: approval.generationRequestSetSha256,
      casesFileSha256: report.casesFileSha256,
      promptSha256: report.promptSha256,
      schemaSha256: report.schemaSha256,
      settingsSha256: report.settingsSha256,
      expectationsSha256: b.expectationsFileSha256(),
      rubricSha256: b.rubricSha256(),
      analysisSha256: b.analysisSha256(),
      eligibleCases: 22,
      report: { allowancePercent: report.allowancePercent, suggestedMinimumCeiling: report.suggestedMinimumCeiling },
    }
    return { approval: { ...approval, expectationsSha256: f.expectationsSha256, rubricSha256: f.rubricSha256, analysisSha256: f.analysisSha256 }, f: f as unknown as PaidFacts, b }
  }

  it('hashes the version 2 expectations file, the rubric and the analysis', async () => {
    const { b } = await facts()
    expect(b.expectationsFileSha256()).toBe(sha(readFileSync(join(ROOT, 'tests/prototype/match-eval/expectations.ts'), 'utf8')))
    expect(b.casesFileSha256()).toBe('79223c08dd0830f1317fe87e3dee3bd8d965ee27c409008977dd979808f55aad')
    for (const h of [b.expectationsFileSha256(), b.rubricSha256(), b.analysisSha256()]) expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(new Set([b.expectationsFileSha256(), b.rubricSha256(), b.analysisSha256()]).size).toBe(3)
  })

  it('passes when all three match, and refuses when any is missing or different', async () => {
    const { approval, f } = await facts()
    expect(paidApprovalProblems(approval as never, f, TODAY)).toEqual([])
    for (const field of ['expectationsSha256', 'rubricSha256', 'analysisSha256']) {
      const wrong = paidApprovalProblems({ ...approval, [field]: 'c'.repeat(64) } as never, f, TODAY)
      expect(wrong.join(), field).toMatch(new RegExp(field === 'expectationsSha256' ? 'expectations' : field === 'rubricSha256' ? 'rubric' : 'analysis'))
      const gone = { ...approval } as Record<string, unknown>
      delete gone[field]
      expect(paidApprovalProblems(gone as never, f, TODAY).length, field).toBeGreaterThan(0)
    }
  })

  it('holds the rubric and the analysis as data the docs repeat word for word', async () => {
    const a = (await import('./match-eval/live/analysis')) as unknown as { RUBRIC: { n: number; text: string }[]; ANALYSIS: string[] }
    const strip = (t: string) => t.replace(/\*\*|`/g, '').replace(/\s+/g, ' ')
    const doc = strip(readFileSync(join(ROOT, 'docs/MATCH-EVAL.md'), 'utf8'))
    expect(a.RUBRIC.map((r) => r.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    for (const r of a.RUBRIC) expect(doc, `rubric item ${r.n}`).toContain(strip(r.text))
    expect(a.ANALYSIS.length).toBeGreaterThanOrEqual(5)
    for (const line of a.ANALYSIS) expect(doc, line).toContain(strip(line))
  })

  it('keeps all three, and the expectations’ notes, out of every request a model or the counting endpoint sees', async () => {
    const a = (await import('./match-eval/live/analysis')) as unknown as { RUBRIC: { text: string }[]; ANALYSIS: string[] }
    const b = (await import('./match-eval/live/bindings')) as unknown as Record<string, () => string>
    const bodies = requestSet(CASES, PROVISIONAL_MAX_OUTPUT_TOKENS).flatMap((r) => [r.generation, r.count, r.user])
    const forbidden = [...CASES.map((c) => EXPECT[c.id].note), ...a.RUBRIC.map((r) => r.text), ...a.ANALYSIS, b.expectationsFileSha256(), b.rubricSha256(), b.analysisSha256()]
    for (const body of bodies) for (const f of forbidden) expect(body.includes(f), f.slice(0, 60)).toBe(false)
  })

  it('is not imported by any module that builds a request, and no live module imports the expectations or the scoring', async () => {
    const dir = join(ROOT, 'tests/prototype/match-eval/live')
    for (const f of ['requests.ts', 'prompt.ts', 'probes.ts', 'transport.ts', 'count.ts']) {
      expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/from '\.\/(bindings|analysis)'|from '\.\.\/(expectations|scoring)/)
    }
    const { readdirSync } = await import('node:fs')
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/from '\.\.\/(expectations|expectations\.v1|scoring)'/)
  })
})
