import { CASES } from './match-eval/cases'
import { buildInput } from './match-eval/contract'
import type { Pricing } from './match-eval/ledger'
import { CREDENTIAL_VARIABLE, type CountApproval, type PaidRunApproval, RETENTION_ASSUMPTION, RETENTION_SOURCES } from './match-eval/live/approval'
import { type CountReport, countFacts, loadCountReport, runCount } from './match-eval/live/count'
import { type RunOptions, runPaid } from './match-eval/live/engine'
import { buildProbes } from './match-eval/live/probes'
import { analysisSha256, expectationsFileSha256, rubricSha256 } from './match-eval/live/bindings'
import { generationRequestSetSha256, MODEL, PROVISIONAL_MAX_OUTPUT_TOKENS, requestSet } from './match-eval/live/requests'
import { memoryStore, type MemoryStore } from './match-eval/live/store'
import type { Transport, TransportRequest, TransportResponse } from './match-eval/live/transport'
import type { EvalCase, ModelOutput } from './match-eval/types'

/** Shared fixtures for the MATCH-05 Stage 1a tests. Everything here is fake: no network, no credential, no model. */

export const TODAY = '2026-10-17'
export const FAKE_KEY = 'fake-credential-for-tests-only'
export const clock = (): string => '2026-10-17T09:00:00.000Z'

export const PRICING: Pricing = {
  model: MODEL,
  inputPerMTok: 2,
  outputPerMTok: 10,
  source: 'https://platform.claude.com/docs/en/about-claude/pricing',
  confirmedOn: '2026-10-16',
  confirmedBy: 'test fixture',
}

const GATE = { status: 'approved', by: 'test fixture', on: TODAY } as const

/** Ids and marks for material that is handed to a person as a fake evidence packet. */
export const FAKE_IDS = { count: 'fake-test-count-run', paid: 'fake-test-paid-run' } as const
const FAKE_GATE = { status: 'approved', by: 'FAKE TEST FIXTURE (not a person, not an approval)', on: TODAY } as const

export function markFakeCount(a: CountApproval): CountApproval {
  return { ...a, countRunId: FAKE_IDS.count, workspaceName: 'FAKE-TEST-WORKSPACE-NOT-REAL', count: FAKE_GATE }
}

export function markFakePaid(a: PaidRunApproval): PaidRunApproval {
  return {
    ...a,
    runId: FAKE_IDS.paid,
    workspaceName: 'FAKE-TEST-WORKSPACE-NOT-REAL',
    approvals: { model: FAKE_GATE, prompt: FAKE_GATE, spend: FAKE_GATE },
    pricing: { ...a.pricing, source: 'FAKE TEST FIXTURE: not a confirmed price (the real page is https://platform.claude.com/docs/en/about-claude/pricing)', confirmedBy: 'FAKE TEST FIXTURE' },
  }
}

export function countApprovalFor(cases: EvalCase[] = CASES, countRunId = 'count-run-1'): CountApproval {
  const f = countFacts(cases, buildProbes(cases))
  return {
    kind: 'match-eval-count-approval/1',
    countRunId,
    model: f.model,
    casesFileSha256: f.casesFileSha256,
    promptSha256: f.promptSha256,
    schemaSha256: f.schemaSha256,
    settingsSha256: f.settingsSha256,
    countRequestSetSha256: f.countRequestSetSha256,
    examplesSha256: f.examplesSha256,
    maxCountCalls: f.countCalls,
    allowancePercent: 15,
    credentialVariable: CREDENTIAL_VARIABLE,
    workspaceName: 'test-workspace',
    count: GATE,
    expiresOn: '2026-10-31',
  }
}

/** A fake counting endpoint: one third of a token per character, raised to the next whole token. Records what it was sent. */
export function fakeCountTransport(tokensFor: (req: TransportRequest, n: number) => TransportResponse | Error = (req) => ok({ input_tokens: Math.ceil(req.body.length / 3) })): {
  transport: Transport
  calls: TransportRequest[]
} {
  const calls: TransportRequest[] = []
  const transport: Transport = async (req) => {
    calls.push(req)
    const out = tokensFor(req, calls.length)
    if (out instanceof Error) throw out
    return out
  }
  return { transport, calls }
}

export const ok = (body: unknown, headers: Record<string, string> = { 'request-id': 'req_FAKE_TEST_MATERIAL' }): TransportResponse => ({ status: 200, headers, body: typeof body === 'string' ? body : JSON.stringify(body) })

export function messageBody(o: { text: string; input: number; output: number; model?: string; stop?: string; usage?: Record<string, unknown>; content?: unknown[] }): string {
  return JSON.stringify({
    id: 'msg_FAKE_TEST_MATERIAL',
    type: 'message',
    role: 'assistant',
    model: o.model ?? MODEL,
    content: o.content ?? [{ type: 'text', text: o.text }],
    stop_reason: o.stop ?? 'end_turn',
    stop_sequence: null,
    usage: o.usage ?? { input_tokens: o.input, output_tokens: o.output },
  })
}

/** A scripted reply for a case. It is plain on purpose: not persuasive, only valid. */
export function scriptedOutput(c: EvalCase): ModelOutput {
  const input = buildInput(c)
  const i = input.written.them.findIndex((w) => w.text !== null)
  if (i < 0) {
    return { schema: 'match-eval-output/1', caseId: c.id, additions: 'none', because: '[FAKE TEST OUTPUT] Neither person wrote anything that adds to the compared points.', statements: [], uncertainties: [], questions: [] }
  }
  return {
    schema: 'match-eval-output/1',
    caseId: c.id,
    additions: 'limited',
    because: null,
    statements: [{ text: `[FAKE TEST OUTPUT] ${c.them.firstName} answered this in their own words.`, basis: [{ who: 'them', words: i as 0 | 1 | 2 }] }],
    uncertainties: [],
    questions: [],
  }
}

export const caseIdOf = (req: TransportRequest): string => {
  const user = (JSON.parse(req.body) as { messages: { content: string }[] }).messages[0].content
  return (JSON.parse(user) as { caseId: string }).caseId
}

export type GenScript = (n: number, req: TransportRequest, caseId: string, countedInput: number) => TransportResponse | Error

/** A fake generation endpoint. By default every call is a clean 200 with the counted input and 120 output tokens. */
export function fakeGenTransport(inputOf: (caseId: string) => number, script?: GenScript): { transport: Transport; calls: TransportRequest[] } {
  const calls: TransportRequest[] = []
  const transport: Transport = async (req) => {
    calls.push(req)
    const caseId = caseIdOf(req)
    const counted = inputOf(caseId)
    const out = script?.(calls.length, req, caseId, counted) ?? ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === caseId) as EvalCase)), input: counted, output: 120 }))
    if (out instanceof Error) throw out
    return out
  }
  return { transport, calls }
}

export function paidApprovalFor(report: CountReport, reportSha256: string, o: Partial<PaidRunApproval> = {}, cases: EvalCase[] = CASES): PaidRunApproval {
  const maxOutputTokens = o.maxOutputTokens ?? PROVISIONAL_MAX_OUTPUT_TOKENS
  const requests = requestSet(cases, maxOutputTokens)
  return {
    kind: 'match-eval-paid-run-approval/1',
    runId: 'paid-run-1',
    model: MODEL,
    countRunId: report.countRunId,
    countReportSha256: reportSha256,
    countRequestSetSha256: report.countRequestSetSha256,
    generationRequestSetSha256: generationRequestSetSha256(requests),
    casesFileSha256: report.casesFileSha256,
    promptSha256: report.promptSha256,
    schemaSha256: report.schemaSha256,
    settingsSha256: report.settingsSha256,
    expectationsSha256: expectationsFileSha256(),
    rubricSha256: rubricSha256(),
    analysisSha256: analysisSha256(),
    calls: requests.length * 3,
    samples: 3,
    maxOutputTokens,
    allowancePercent: report.allowancePercent,
    tripwirePercent: 10,
    limitMicros: 2_000_000,
    pricing: PRICING,
    retention: { assumption: RETENTION_ASSUMPTION, sources: [...RETENTION_SOURCES] },
    credentialVariable: CREDENTIAL_VARIABLE,
    workspaceName: 'test-workspace',
    approvals: { model: GATE, prompt: GATE, spend: GATE },
    expiresOn: '2026-10-31',
    ...o,
  }
}

/** A store holding a completed fake count run, and the report read back from it. */
export async function countedStore(o: { cases?: EvalCase[]; store?: MemoryStore; fake?: boolean } = {}): Promise<{ store: MemoryStore; report: CountReport; reportSha256: string }> {
  const cases = o.cases ?? CASES
  const store = o.store ?? memoryStore()
  const { transport } = fakeCountTransport()
  const base = countApprovalFor(cases)
  const res = await runCount({ approval: o.fake ? markFakeCount(base) : base, today: TODAY, cases, store, transport, getKey: () => FAKE_KEY, clock })
  if (res.status !== 'completed') throw new Error(`the fake count did not complete: ${JSON.stringify(res)}`)
  const loaded = loadCountReport(store, res.report.countRunId)
  if ('error' in loaded) throw new Error(loaded.error)
  return { store, report: loaded.report, reportSha256: loaded.reportSha256 }
}

export interface PaidFixture {
  store: MemoryStore
  report: CountReport
  reportSha256: string
  approval: PaidRunApproval
  gen: ReturnType<typeof fakeGenTransport>
  run: () => ReturnType<typeof runPaid>
}

export async function paidFixture(o: { script?: GenScript; approval?: Partial<PaidRunApproval>; store?: MemoryStore; countStore?: MemoryStore; fake?: boolean } = {}): Promise<PaidFixture> {
  const counted = await countedStore({ store: o.countStore ?? o.store, fake: o.fake })
  const built = paidApprovalFor(counted.report, counted.reportSha256, o.approval)
  const approval = o.fake ? markFakePaid(built) : built
  const countOf = new Map(counted.report.items.map((i) => [i.caseId, i.inputTokens]))
  const gen = fakeGenTransport((id) => countOf.get(id) as number, o.script)
  const options: RunOptions = { approval, today: TODAY, cases: CASES, store: counted.store, transport: gen.transport, getKey: () => FAKE_KEY, clock }
  return { ...counted, approval, gen, run: () => runPaid(options) }
}
