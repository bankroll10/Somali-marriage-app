import { isEligible, judge } from '../../../src/prototype/match/suggest'
import { personOf, selfOf } from './cases'
import { checkOutput, type CheckResult } from './checks'
import { buildInput, buildRequest } from './contract'
import { LedgerRefusal, type Ledger, type TokenBound } from './ledger'
import type { Provider } from './provider'
import type { EvalCase } from './types'

/**
 * Arm B's runner, written against the Provider interface and exercised only with a fake one (docs/MATCH-EVAL.md).
 *
 * Order matters and is tested: eligibility first, from the existing rules code; then the request is built from the
 * input alone; then the full permitted cost is reserved; only then is anything sent.
 */

export type ArmBResult =
  | { status: 'skipped-ineligible'; caseId: string; sample?: number }
  | { status: 'refused'; caseId: string; reason: 'request-over-bound' | 'invalid-measurement' | 'reservation-does-not-fit' | 'halted'; sample?: number }
  | { status: 'called'; caseId: string; charge: 'settled' | 'held'; raw?: string; check?: CheckResult; error?: string; overrun?: boolean; invalidUsage?: boolean; sample?: number }

export async function runArmB(c: EvalCase, provider: Provider, ledger: Ledger, bound: TokenBound): Promise<ArmBResult> {
  if (!isEligible(judge(selfOf(c), personOf(c)))) return { status: 'skipped-ineligible', caseId: c.id }
  const input = buildInput(c)
  const req = buildRequest(input, ledger.maxOutputTokens)
  const slot = ledger.reserve(bound, req)
  if (!slot.ok) return { status: 'refused', caseId: c.id, reason: slot.reason }
  let completion
  try {
    completion = await provider.complete(req)
  } catch (e) {
    ledger.hold(slot.id)
    return { status: 'called', caseId: c.id, charge: 'held', error: e instanceof Error ? e.message : 'the provider failed' }
  }
  const check = checkOutput(completion.text, input)
  if (!completion.usage) {
    ledger.hold(slot.id)
    return { status: 'called', caseId: c.id, charge: 'held', raw: completion.text, check }
  }
  const settled = ledger.settle(slot.id, completion.usage)
  if (!settled.ok) return { status: 'called', caseId: c.id, charge: 'held', raw: completion.text, check, error: settled.reason }
  if (settled.invalid) return { status: 'called', caseId: c.id, charge: 'held', raw: completion.text, check, invalidUsage: true }
  return { status: 'called', caseId: c.id, charge: 'settled', raw: completion.text, check, ...(settled.overrun ? { overrun: true } : {}) }
}

export type RunReport =
  | { status: 'completed'; results: ArmBResult[] }
  | { status: 'stopped'; reason: string; results: ArmBResult[] }
  | { status: 'refused-before-start'; callsPlanned: number; requiredMicros: number; limitMicros: number; message: string }
  | { status: 'invalid-configuration'; reasons: string[] }

/**
 * Plans the whole run first. If it does not fit, nothing is sent and the report says what to revise; the plan is never
 * shortened. During the run, anything that stops it (a refused reservation, usage above the reservation) stops it for
 * good and says why.
 */
export async function runPlanned(o: { cases: EvalCase[]; samples: number; provider: Provider; ledger: Ledger; bound: TokenBound }): Promise<RunReport> {
  if (typeof o.samples !== 'number' || !Number.isSafeInteger(o.samples) || o.samples < 1) {
    return { status: 'invalid-configuration', reasons: ['samples must be a finite safe integer of at least 1'] }
  }
  const eligible = o.cases.filter((c) => isEligible(judge(selfOf(c), personOf(c))))
  const callsPlanned = eligible.length * o.samples
  let plan
  try {
    plan = o.ledger.plan(callsPlanned, o.bound)
  } catch (e) {
    if (e instanceof LedgerRefusal) return { status: 'invalid-configuration', reasons: e.reasons }
    throw e
  }
  if (!plan.ok) return { status: 'refused-before-start', callsPlanned, requiredMicros: plan.requiredMicros, limitMicros: plan.limitMicros, message: plan.message }
  const results: ArmBResult[] = []
  for (let sample = 1; sample <= o.samples; sample++) {
    for (const c of o.cases) {
      const r = { ...(await runArmB(c, o.provider, o.ledger, o.bound)), sample }
      results.push(r)
      if (r.status === 'refused') return { status: 'stopped', reason: r.reason, results }
      if (r.status === 'called' && r.invalidUsage) return { status: 'stopped', reason: 'invalid-usage', results }
      if (r.status === 'called' && r.overrun) return { status: 'stopped', reason: 'usage-exceeded-reservation', results }
    }
  }
  return { status: 'completed', results }
}
