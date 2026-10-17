import { describe, expect, it } from 'vitest'
import { CASES } from './match-eval/cases'
import {
  blankPaidApproval,
  countApprovalProblems,
  CREDENTIAL_VARIABLE,
  paidApprovalProblems,
  RETENTION_ASSUMPTION,
  RETENTION_SOURCES,
  type CountApproval,
  type PaidFacts,
  type PaidRunApproval,
} from './match-eval/live/approval'
import { allowanceTokens, countFacts, loadCountReport, reportPath, runCount } from './match-eval/live/count'
import { sha256 } from './match-eval/live/hash'
import { buildProbes, CEILING_PROBE, longestAnswer } from './match-eval/live/probes'
import { verifyManifest } from './match-eval/live/raw'
import { COUNT_URL, GENERATION_URL, PROVISIONAL_MAX_OUTPUT_TOKENS, requestSet } from './match-eval/live/requests'
import { memoryStore } from './match-eval/live/store'
import { SOFT } from './match-eval/types'
import { clock, countApprovalFor, countedStore, fakeCountTransport, FAKE_KEY, ok, paidApprovalFor, PRICING, TODAY } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a: approvals, the size probes and the count-only command (docs/MATCH-EVAL.md, "Stage 1a").
 * Fakes only: no network, no credential, no model, no spending.
 */

const probes = buildProbes(CASES)
const facts = countFacts(CASES, probes)

describe('the count approval', () => {
  it('passes when everything matches, and needs no report hash and no ceiling, so nothing is circular', () => {
    const a = countApprovalFor()
    expect(countApprovalProblems(a, facts, TODAY)).toEqual([])
    expect(Object.keys(a)).not.toContain('countReportSha256')
    expect(Object.keys(a)).not.toContain('maxOutputTokens')
    expect(Object.keys(a)).not.toContain('limitMicros')
  })

  const MISMATCHES: [string, Partial<CountApproval>][] = [
    ['model', { model: 'claude-opus-5-5' }],
    ['cases file hash', { casesFileSha256: 'a'.repeat(64) }],
    ['prompt hash', { promptSha256: 'a'.repeat(64) }],
    ['schema hash', { schemaSha256: 'a'.repeat(64) }],
    ['settings hash', { settingsSha256: 'a'.repeat(64) }],
    ['counting request set hash', { countRequestSetSha256: 'a'.repeat(64) }],
    ['size probes hash', { examplesSha256: 'a'.repeat(64) }],
    ['number of count calls', { maxCountCalls: 28 }],
    ['credential variable', { credentialVariable: 'ANTHROPIC_API_KEY' }],
    ['workspace name', { workspaceName: ' ' }],
    ['expiry', { expiresOn: '2026-10-16' }],
    ['expiry date', { expiresOn: 'soon' }],
    ['allowance too low', { allowancePercent: 0 }],
    ['allowance too high', { allowancePercent: 101 }],
    ['allowance fractional', { allowancePercent: 15.5 }],
    ['pending gate', { count: { status: 'pending' } }],
    ['gate with no name', { count: { status: 'approved', by: ' ', on: TODAY } }],
    ['gate with no date', { count: { status: 'approved', by: 'someone', on: 'x' } }],
    ['kind', { kind: 'other' as never }],
  ]
  it.each(MISMATCHES)('refuses a wrong %s', (_label, over) => {
    expect(countApprovalProblems({ ...countApprovalFor(), ...over }, facts, TODAY).length).toBeGreaterThan(0)
  })

  it('refuses a missing record', () => {
    expect(countApprovalProblems(undefined, facts, TODAY)).toEqual(['there is no count approval record'])
  })
})

describe('the paid-run approval', () => {
  const base = async () => {
    const { report, reportSha256 } = await countedStore()
    const approval = paidApprovalFor(report, reportSha256)
    const f: PaidFacts = {
      model: approval.model,
      countReportSha256: reportSha256,
      countRequestSetSha256: report.countRequestSetSha256,
      generationRequestSetSha256: approval.generationRequestSetSha256,
      casesFileSha256: report.casesFileSha256,
      promptSha256: report.promptSha256,
      schemaSha256: report.schemaSha256,
      settingsSha256: report.settingsSha256,
      expectationsSha256: approval.expectationsSha256,
      rubricSha256: approval.rubricSha256,
      analysisSha256: approval.analysisSha256,
      eligibleCases: 22,
      report: { allowancePercent: report.allowancePercent, suggestedMinimumCeiling: report.suggestedMinimumCeiling },
    }
    return { approval, f, report }
  }

  it('passes when it binds the report, the requests, the settings and the hashes', async () => {
    const { approval, f } = await base()
    expect(paidApprovalProblems(approval, f, TODAY)).toEqual([])
  })

  it('refuses a blank record: every gate pending, no hashes, no limit, no pricing', async () => {
    const { f } = await base()
    const problems = paidApprovalProblems(blankPaidApproval(), f, TODAY).join(' | ')
    expect(problems).toMatch(/model approval is pending/)
    expect(problems).toMatch(/prompt approval is pending/)
    expect(problems).toMatch(/spending approval is pending/)
    expect(problems).toMatch(/count report hash does not match/)
  })

  it('keeps the model, prompt and spending approvals as three separate gates', async () => {
    const { approval, f } = await base()
    for (const gate of ['model', 'prompt', 'spend'] as const) {
      const a: PaidRunApproval = { ...approval, approvals: { ...approval.approvals, [gate]: { status: 'pending' } } }
      const p = paidApprovalProblems(a, f, TODAY)
      expect(p).toHaveLength(1)
      expect(p[0]).toMatch(gate === 'spend' ? /spending approval is pending/ : new RegExp(`${gate} approval is pending`))
    }
  })

  it('refuses every binding that does not match what the step would send', async () => {
    const { approval, f } = await base()
    const wrong: Partial<PaidRunApproval>[] = [
      { model: 'claude-opus-5-5' },
      { countReportSha256: 'b'.repeat(64) },
      { countRequestSetSha256: 'b'.repeat(64) },
      { generationRequestSetSha256: 'b'.repeat(64) },
      { casesFileSha256: 'b'.repeat(64) },
      { promptSha256: 'b'.repeat(64) },
      { schemaSha256: 'b'.repeat(64) },
      { settingsSha256: 'b'.repeat(64) },
      { calls: 65 },
      { calls: 67 },
      { samples: 0 },
      { samples: 2.5 },
      { maxOutputTokens: 0 },
      { maxOutputTokens: 10 },
      { allowancePercent: 20 },
      { tripwirePercent: 0 },
      { tripwirePercent: 101 },
      { limitMicros: 0 },
      { limitMicros: 1.5 },
      { limitMicros: Number.NaN },
      { credentialVariable: 'ANTHROPIC_API_KEY' },
      { workspaceName: '' },
      { expiresOn: '2026-10-16' },
      { kind: 'x' as never },
    ]
    for (const w of wrong) expect(paidApprovalProblems({ ...approval, ...w }, f, TODAY).length, JSON.stringify(w)).toBeGreaterThan(0)
  })

  it('refuses pricing that is stale, from the future, unsourced, unconfirmed or for another model', async () => {
    const { approval, f } = await base()
    const bad = [
      { ...PRICING, confirmedOn: '2026-01-01' },
      { ...PRICING, confirmedOn: '2026-12-01' },
      { ...PRICING, source: '' },
      { ...PRICING, confirmedBy: '' },
      { ...PRICING, inputPerMTok: 0 },
      { ...PRICING, model: 'claude-opus-5-5' },
    ]
    for (const pricing of bad) expect(paidApprovalProblems({ ...approval, pricing }, f, TODAY).length, JSON.stringify(pricing)).toBeGreaterThan(0)
  })

  it('carries the conservative retention assumption and both official sources, or refuses', async () => {
    const { approval, f } = await base()
    expect(approval.retention.assumption).toBe(RETENTION_ASSUMPTION)
    expect(approval.retention.assumption).toMatch(/30 days/)
    expect(approval.retention.assumption).toMatch(/2 years/)
    expect(RETENTION_SOURCES).toEqual([
      'https://platform.claude.com/docs/en/manage-claude/api-and-data-retention',
      'https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data',
    ])
    expect(paidApprovalProblems({ ...approval, retention: { assumption: RETENTION_ASSUMPTION, sources: [RETENTION_SOURCES[0]] } }, f, TODAY).join()).toMatch(/privacy\.claude\.com/)
    expect(paidApprovalProblems({ ...approval, retention: { assumption: RETENTION_ASSUMPTION, sources: [RETENTION_SOURCES[1]] } }, f, TODAY).join()).toMatch(/platform\.claude\.com/)
    expect(paidApprovalProblems({ ...approval, retention: { assumption: 'Nothing is kept.', sources: [...RETENTION_SOURCES] } }, f, TODAY).join()).toMatch(/conservative periods/)
  })

  it('refuses an output ceiling below the counted size of a full-size reply, and accepts one at it', async () => {
    const { approval, f, report } = await base()
    expect(report.suggestedMinimumCeiling).toBeGreaterThan(100)
    expect(paidApprovalProblems({ ...approval, maxOutputTokens: report.suggestedMinimumCeiling - 1 }, f, TODAY).join()).toMatch(/would truncate an ordinary full-size reply/)
    expect(paidApprovalProblems({ ...approval, maxOutputTokens: report.suggestedMinimumCeiling }, f, TODAY).filter((p) => /ceiling/.test(p))).toEqual([])
  })

  it('names the credential variable and never the Guide’s', () => {
    expect(CREDENTIAL_VARIABLE).toBe('MATCH_EVAL_ANTHROPIC_API_KEY')
    expect(blankPaidApproval().credentialVariable).not.toBe('ANTHROPIC_API_KEY')
  })
})

describe('the size probes', () => {
  it('are built by hand, are the same every time, and are valid JSON', () => {
    expect(buildProbes(CASES)).toEqual(buildProbes(CASES))
    expect(probes.map((p) => p.id)).toEqual(['small', 'caps-short', 'caps-quotes', 'beyond-caps', 'typographic'])
    for (const p of probes) expect(() => JSON.parse(p.text), p.id).not.toThrow()
  })

  it('use every stated cap in full in caps-short and caps-quotes, and go past them in beyond-caps', () => {
    const parse = (id: string) => JSON.parse((probes.find((p) => p.id === id) as { text: string }).text)
    for (const id of ['caps-short', 'caps-quotes']) {
      const o = parse(id)
      expect([o.statements.length, o.uncertainties.length, o.questions.length]).toEqual([SOFT.statements, SOFT.uncertainties, SOFT.questions])
      for (const l of [...o.statements, ...o.uncertainties, ...o.questions]) expect(l.text.split(/\s+/).length).toBeLessThanOrEqual(SOFT.words)
    }
    const big = parse('beyond-caps')
    expect(big.statements.length).toBeGreaterThan(SOFT.statements)
    expect(big.questions.length).toBeGreaterThan(SOFT.questions)
  })

  it('quote the longest written answer in the cases verbatim, with no model output', () => {
    const long = longestAnswer(CASES)
    expect(long.text.length).toBeGreaterThan(50)
    const o = JSON.parse((probes.find((p) => p.id === 'caps-quotes') as { text: string }).text)
    expect(o.statements[0].basis[0].quote).toBe(long.text)
    expect(probes.find((p) => p.id === 'caps-quotes')?.description).toContain(String(long.text.length))
  })

  it('set the ceiling floor from the full-caps reply with short references', () => {
    expect(CEILING_PROBE).toBe('caps-short')
  })
})

describe('the allowance', () => {
  it('is the count plus a whole-number percentage, raised to the next whole token, in integers', () => {
    expect(allowanceTokens(100, 15)).toBe(115)
    expect(allowanceTokens(101, 15)).toBe(117)
    expect(allowanceTokens(1, 15)).toBe(2)
    expect(allowanceTokens(1000, 15)).toBe(1150)
    expect(allowanceTokens(2, 100)).toBe(4)
    for (let n = 1; n < 500; n++) expect(allowanceTokens(n, 15)).toBe(Math.ceil(n * 1.15 - 1e-9))
  })
})

describe('the count-only command', () => {
  const run = async (o: { transport?: ReturnType<typeof fakeCountTransport>; store?: ReturnType<typeof memoryStore>; approval?: CountApproval } = {}) => {
    const store = o.store ?? memoryStore()
    const t = o.transport ?? fakeCountTransport()
    const res = await runCount({ approval: o.approval ?? countApprovalFor(), today: TODAY, cases: CASES, store, transport: t.transport, getKey: () => FAKE_KEY, clock })
    return { res, store, t }
  }

  it('counts the 22 requests and the 5 probes, only at the counting endpoint, with the exact bodies and headers', async () => {
    const { res, t } = await run()
    expect(res.status).toBe('completed')
    expect(t.calls).toHaveLength(27)
    const set = requestSet(CASES, PROVISIONAL_MAX_OUTPUT_TOKENS)
    t.calls.slice(0, 22).forEach((c, i) => expect(c.body).toBe(set[i].count))
    for (const c of t.calls) {
      expect(c.url).toBe(COUNT_URL)
      expect(c.url).not.toBe(GENERATION_URL)
      expect(c.method).toBe('POST')
      expect(c.headers).toEqual({ 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': FAKE_KEY })
      expect(JSON.parse(c.body)).not.toHaveProperty('max_tokens')
    }
    for (const c of t.calls.slice(22)) expect(Object.keys(JSON.parse(c.body))).toEqual(['model', 'messages'])
  })

  it('writes one immutable report with an estimated allowance per request, never an upper bound', async () => {
    const { store, report, reportSha256 } = await countedStore()
    expect(report.items).toHaveLength(22)
    for (const i of report.items) {
      expect(i.allowanceTokens).toBe(allowanceTokens(i.inputTokens, 15))
      expect(i.allowanceTokens).toBeGreaterThan(i.inputTokens)
    }
    expect(report.reserveBoundTokens).toBe(Math.max(...report.items.map((i) => i.allowanceTokens)))
    expect(report.probes).toHaveLength(5)
    expect(report.suggestedMinimumCeiling).toBe(report.probes.find((p) => p.id === CEILING_PROBE)?.inputTokens)
    expect(report.countedFields).toEqual(['model', 'system', 'messages', 'thinking', 'output_config'])
    expect(report.notCounted.map((n) => n.field)).toEqual(['max_tokens'])
    expect(report.doesNotEstablish.join(' ')).toMatch(/upper bound on billed input/)
    expect(report.doesNotEstablish.join(' ')).toMatch(/no finite maximal reply/)
    expect(store.read('counts/count-run-1/report.sha256')?.trim()).toBe(reportSha256)
    expect(sha256(store.read(reportPath('count-run-1')) as string)).toBe(reportSha256)
    expect(store.sealed.has(reportPath('count-run-1'))).toBe(true)
    expect(store.sealed.has('counts/count-run-1/report.sha256')).toBe(true)
    expect(verifyManifest(store, 'counts/count-run-1/raw')).toEqual([])
  })

  it('cannot be run twice under one id, and the report cannot be overwritten or appended to', async () => {
    const first = await run()
    const before = first.store.read(reportPath('count-run-1'))
    const second = await run({ store: first.store })
    expect(second.res).toMatchObject({ status: 'refused' })
    expect(second.t.calls).toHaveLength(0)
    expect(() => first.store.createExclusive(reportPath('count-run-1'), 'x')).toThrow(/already exists/)
    expect(() => first.store.append(reportPath('count-run-1'), 'x')).toThrow(/read-only/)
    expect(first.store.read(reportPath('count-run-1'))).toBe(before)
  })

  it('reads back through its hash file, and refuses a report that no longer matches it', async () => {
    const { store } = await countedStore()
    expect('error' in loadCountReport(store, 'count-run-1')).toBe(false)
    const files = new Map(store.files)
    files.set(reportPath('count-run-1'), (files.get(reportPath('count-run-1')) as string).replace('"count-run-1"', '"count-run-9"'))
    expect(loadCountReport(memoryStore({ files }), 'count-run-1')).toEqual({ error: 'the count report does not match its hash file' })
    expect(loadCountReport(memoryStore(), 'nope')).toEqual({ error: 'there is no count report for nope' })
  })

  it('saves a body that is not JSON verbatim before it parses anything, then stops, with one call and no retry', async () => {
    const t = fakeCountTransport(() => ok('<html>not json</html>'))
    const { res, store } = await run({ transport: t })
    expect(res).toMatchObject({ status: 'stopped', reason: 'unparseable-count', callsMade: 1 })
    expect(t.calls).toHaveLength(1)
    expect(store.read('counts/count-run-1/raw/001.body')).toBe('<html>not json</html>')
    expect(JSON.parse(store.read('counts/count-run-1/raw/001.meta.json') as string)).toMatchObject({ httpStatus: 200, bodySha256: sha256('<html>not json</html>'), kind: 'count' })
    expect(store.read(reportPath('count-run-1'))).toBeNull()
  })

  it('saves an HTTP error body and stops at once', async () => {
    const t = fakeCountTransport(() => ({ status: 500, headers: { 'request-id': 'req_x', 'set-cookie': 'secret' }, body: '{"type":"error","error":{"type":"api_error"}}' }))
    const { res, store } = await run({ transport: t })
    expect(res).toMatchObject({ status: 'stopped', reason: 'http-500', callsMade: 1 })
    expect(t.calls).toHaveLength(1)
    expect(store.read('counts/count-run-1/raw/001.body')).toContain('api_error')
    const meta = JSON.parse(store.read('counts/count-run-1/raw/001.meta.json') as string)
    expect(meta.headers).toEqual({ 'request-id': 'req_x' })
  })

  it.each([
    ['a string', '{"input_tokens":"12"}'],
    ['zero', '{"input_tokens":0}'],
    ['negative', '{"input_tokens":-5}'],
    ['fractional', '{"input_tokens":1.5}'],
    ['infinite', '{"input_tokens":1e400}'],
    ['null', '{"input_tokens":null}'],
    ['missing', '{}'],
    ['unsafe', '{"input_tokens":9007199254740993}'],
  ])('stops on a count that is %s', async (_label, body) => {
    const t = fakeCountTransport(() => ok(body))
    const { res, store } = await run({ transport: t })
    expect(res).toMatchObject({ status: 'stopped', reason: 'invalid-count', callsMade: 1 })
    expect(store.read(reportPath('count-run-1'))).toBeNull()
  })

  it('records a timeout, keeps the raw note, makes no report and does not retry', async () => {
    const t = fakeCountTransport(() => new Error('timed out'))
    const { res, store } = await run({ transport: t })
    expect(res).toMatchObject({ status: 'stopped', reason: 'transport-error', callsMade: 1 })
    expect(t.calls).toHaveLength(1)
    const meta = JSON.parse(store.read('counts/count-run-1/raw/001.meta.json') as string)
    expect(meta).toMatchObject({ httpStatus: null, bodySha256: null })
    expect(meta.error).toContain('timed out')
    expect(store.read('counts/count-run-1/raw/001.body')).toBeNull()
  })

  it('stops when a raw file cannot be saved, and makes no report', async () => {
    const store = memoryStore({ fail: (op, path) => op === 'create' && path.endsWith('002.body') })
    const { res, t } = await run({ store })
    expect(res).toMatchObject({ status: 'stopped', reason: 'raw-write-failed', callsMade: 2 })
    expect(t.calls).toHaveLength(2)
    expect(store.read(reportPath('count-run-1'))).toBeNull()
  })

  it('does not report completion when the report itself cannot be written', async () => {
    const store = memoryStore({ fail: (op, path) => op === 'create' && path.endsWith('report.json') })
    const { res } = await run({ store })
    expect(res).toMatchObject({ status: 'stopped', reason: 'report-write-failed' })
  })

  it('refuses without a complete approval: no call, nothing written', async () => {
    const store = memoryStore()
    const t = fakeCountTransport()
    const res = await runCount({ approval: { ...countApprovalFor(), count: { status: 'pending' } }, today: TODAY, cases: CASES, store, transport: t.transport, getKey: () => FAKE_KEY, clock })
    expect(res).toMatchObject({ status: 'refused' })
    expect(t.calls).toHaveLength(0)
    expect(store.files.size).toBe(0)
  })

  it('refuses a count approval whose bindings no longer match the requests', async () => {
    const store = memoryStore()
    const t = fakeCountTransport()
    const a = { ...countApprovalFor(), promptSha256: 'c'.repeat(64) }
    const res = await runCount({ approval: a, today: TODAY, cases: CASES, store, transport: t.transport, getKey: () => FAKE_KEY, clock })
    expect(res).toMatchObject({ status: 'refused' })
    expect(t.calls).toHaveLength(0)
  })

  it('never writes the key into any saved file', async () => {
    const { store } = await run()
    for (const [path, text] of store.files) expect(text, path).not.toContain(FAKE_KEY)
  })
})

describe('the facts a count approval binds', () => {
  it('do not depend on the output ceiling', () => {
    expect(countFacts(CASES, probes).countRequestSetSha256).toBe(facts.countRequestSetSha256)
    expect(facts.countCalls).toBe(27)
    expect(facts.requests).toHaveLength(22)
  })
})
