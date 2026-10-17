import { verifyPricing, type Pricing } from '../ledger'
import { SETTINGS } from './requests'

/**
 * Approval records for the two live steps (docs/MATCH-EVAL.md, "Stage 1a").
 *
 * They are separate on purpose. The COUNT approval lets one command call the free counting endpoint and produce an
 * immutable report; it cannot reach the generation endpoint and carries no dollar limit. The PAID-RUN approval is made
 * AFTER that report exists, binds the report by its hash, and lets a second command spend money without counting again.
 * No approval has to name a hash that only the step it authorises can produce.
 *
 * Model, prompt and spending approvals are three explicit gates. Any gate that is not `approved` refuses the step.
 * Nothing here is approved: the plan's recommendations are proposals until a person fills a gate in.
 */

export type Gate = { status: 'pending' } | { status: 'approved'; by: string; on: string }

/** Its own variable, never the Guide's. Only the name is held here; nothing in this folder reads the environment. */
export const CREDENTIAL_VARIABLE = 'MATCH_EVAL_ANTHROPIC_API_KEY'

/** Both official sources the retention assumption rests on. */
export const RETENTION_SOURCES = [
  'https://platform.claude.com/docs/en/manage-claude/api-and-data-retention',
  'https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data',
] as const

/**
 * The conservative reading. The platform page says conversation content is not retained by default for models that are
 * not "Covered Models"; Anthropic's commercial retention article says API inputs and outputs are removed within 30
 * days. They disagree, so the longer is assumed until a person reconciles them.
 */
export const RETENTION_ASSUMPTION =
  'Assume Anthropic keeps the inputs and outputs of API requests for up to 30 days, and for up to 2 years where its safety systems flag them. ' +
  'The platform data-retention page says conversation content is not retained by default for models that are not Covered Models; the commercial retention article says 30 days. ' +
  'The longer period is assumed until the two are reconciled. Zero data retention is not requested. The 22 cases are synthetic; no participant data is involved.'

export class ApprovalRefusal extends Error {
  readonly reasons: string[]
  constructor(reasons: string[]) {
    super(`Not approved: ${reasons.join('; ')}.`)
    this.reasons = reasons
  }
}

export interface CountApproval {
  kind: 'match-eval-count-approval/1'
  countRunId: string
  model: string
  casesFileSha256: string
  promptSha256: string
  schemaSha256: string
  settingsSha256: string
  /** The 22 counting bodies. Independent of the output ceiling. */
  countRequestSetSha256: string
  examplesSha256: string
  /** The 22 requests plus the size probes; nothing else may be counted. */
  maxCountCalls: number
  /** The estimated input allowance, as a whole-number percentage of each counted request. */
  allowancePercent: number
  credentialVariable: string
  workspaceName: string
  count: Gate
  expiresOn: string
}

export interface PaidRunApproval {
  kind: 'match-eval-paid-run-approval/1'
  runId: string
  model: string
  /** Which count run's report this run consumes, and the sha256 of that immutable report. */
  countRunId: string
  countReportSha256: string
  countRequestSetSha256: string
  generationRequestSetSha256: string
  casesFileSha256: string
  promptSha256: string
  schemaSha256: string
  settingsSha256: string
  /** Bound alongside the request hashes; none of the three is ever sent to a model. */
  expectationsSha256: string
  rubricSha256: string
  analysisSha256: string
  calls: number
  samples: number
  maxOutputTokens: number
  allowancePercent: number
  tripwirePercent: number
  limitMicros: number
  pricing: Pricing
  retention: { assumption: string; sources: string[] }
  credentialVariable: string
  workspaceName: string
  approvals: { model: Gate; prompt: Gate; spend: Gate }
  expiresOn: string
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
const isId = (s: unknown): boolean => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{2,60}$/.test(s)
const isCount = (n: unknown, min = 0): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min

function gateProblems(name: string, g: Gate | undefined): string[] {
  if (!g || g.status !== 'approved') return [`the ${name} approval is pending`]
  const out: string[] = []
  if (typeof g.by !== 'string' || g.by.trim() === '') out.push(`the ${name} approval names nobody`)
  if (!isDate(g.on)) out.push(`the ${name} approval has no date`)
  return out
}

function same(label: string, have: unknown, want: unknown): string[] {
  return have === want ? [] : [`${label} does not match (the approval has ${JSON.stringify(have)}, the step would use ${JSON.stringify(want)})`]
}

/** What the count step is about to do, computed fresh from the code and the cases. */
export interface CountFacts {
  model: string
  casesFileSha256: string
  promptSha256: string
  schemaSha256: string
  settingsSha256: string
  countRequestSetSha256: string
  examplesSha256: string
  countCalls: number
}

export function countApprovalProblems(a: CountApproval | undefined, f: CountFacts, today: string): string[] {
  if (!a || a.kind !== 'match-eval-count-approval/1') return ['there is no count approval record']
  const p: string[] = []
  if (!isId(a.countRunId)) p.push('the count run id is missing or malformed')
  p.push(...gateProblems('count', a.count))
  p.push(...same('the model', a.model, f.model), ...same('the model in the requests', f.model, SETTINGS.model))
  p.push(...same('the cases file hash', a.casesFileSha256, f.casesFileSha256))
  p.push(...same('the prompt hash', a.promptSha256, f.promptSha256))
  p.push(...same('the schema hash', a.schemaSha256, f.schemaSha256))
  p.push(...same('the settings hash', a.settingsSha256, f.settingsSha256))
  p.push(...same('the counting request set hash', a.countRequestSetSha256, f.countRequestSetSha256))
  p.push(...same('the size probes hash', a.examplesSha256, f.examplesSha256))
  p.push(...same('the number of count calls', a.maxCountCalls, f.countCalls))
  if (!isCount(a.allowancePercent, 1) || a.allowancePercent > 100) p.push('the input allowance must be a whole percentage from 1 to 100')
  p.push(...same('the credential variable', a.credentialVariable, CREDENTIAL_VARIABLE))
  if (typeof a.workspaceName !== 'string' || a.workspaceName.trim() === '') p.push('the workspace name is missing')
  if (!isDate(a.expiresOn)) p.push('the expiry is not a date')
  else if (Date.parse(a.expiresOn) < Date.parse(today)) p.push(`the approval expired on ${a.expiresOn}`)
  return p
}

export function assertCountApproved(a: CountApproval | undefined, f: CountFacts, today: string): void {
  const p = countApprovalProblems(a, f, today)
  if (p.length > 0) throw new ApprovalRefusal(p)
}

/** What the paid step is about to do, computed fresh. The report figures come from the report file it was handed. */
export interface PaidFacts {
  model: string
  countReportSha256: string
  countRequestSetSha256: string
  generationRequestSetSha256: string
  casesFileSha256: string
  promptSha256: string
  schemaSha256: string
  settingsSha256: string
  expectationsSha256: string
  rubricSha256: string
  analysisSha256: string
  eligibleCases: number
  report: { allowancePercent: number; suggestedMinimumCeiling: number }
}

export function paidApprovalProblems(a: PaidRunApproval | undefined, f: PaidFacts, today: string): string[] {
  if (!a || a.kind !== 'match-eval-paid-run-approval/1') return ['there is no paid-run approval record']
  const p: string[] = []
  if (!isId(a.runId)) p.push('the run id is missing or malformed')
  p.push(...gateProblems('model', a.approvals?.model), ...gateProblems('prompt', a.approvals?.prompt), ...gateProblems('spending', a.approvals?.spend))
  p.push(...same('the model', a.model, f.model), ...same('the model in the requests', f.model, SETTINGS.model))
  p.push(...same('the count report hash', a.countReportSha256, f.countReportSha256))
  p.push(...same('the counting request set hash', a.countRequestSetSha256, f.countRequestSetSha256))
  p.push(...same('the generation request set hash', a.generationRequestSetSha256, f.generationRequestSetSha256))
  p.push(...same('the cases file hash', a.casesFileSha256, f.casesFileSha256))
  p.push(...same('the prompt hash', a.promptSha256, f.promptSha256))
  p.push(...same('the schema hash', a.schemaSha256, f.schemaSha256))
  p.push(...same('the settings hash', a.settingsSha256, f.settingsSha256))
  p.push(...same('the expectations (version 2) hash', a.expectationsSha256, f.expectationsSha256))
  p.push(...same('the review rubric hash', a.rubricSha256, f.rubricSha256))
  p.push(...same('the preregistered analysis hash', a.analysisSha256, f.analysisSha256))
  if (!isCount(a.samples, 1)) p.push('samples must be a whole number of at least 1')
  else p.push(...same('the number of calls', a.calls, f.eligibleCases * a.samples))
  if (!isCount(a.maxOutputTokens, 1)) p.push('the output ceiling must be a whole number of at least 1')
  else if (a.maxOutputTokens < f.report.suggestedMinimumCeiling) {
    p.push(`the output ceiling ${a.maxOutputTokens} is below ${f.report.suggestedMinimumCeiling}, the counted size of a reply that uses every stated cap in full; it would truncate an ordinary full-size reply`)
  }
  p.push(...same('the input allowance percentage', a.allowancePercent, f.report.allowancePercent))
  if (!isCount(a.tripwirePercent, 1) || a.tripwirePercent > 100) p.push('the calibration tripwire must be a whole percentage from 1 to 100')
  if (!isCount(a.limitMicros, 1)) p.push('the dollar limit must be a whole number of micro-dollars of at least 1')
  const price = verifyPricing(a.pricing, today)
  if (!price.ok) p.push(...price.reasons)
  else if (a.pricing.model !== a.model) p.push('the pricing record is for a different model')
  const r = a.retention
  if (!r || typeof r.assumption !== 'string' || !/30 days/.test(r.assumption) || !/2 years/.test(r.assumption)) p.push('the retention assumption must state the conservative periods (30 days, and 2 years if flagged)')
  for (const s of RETENTION_SOURCES) if (!r || !Array.isArray(r.sources) || !r.sources.includes(s)) p.push(`the retention record must cite ${s}`)
  p.push(...same('the credential variable', a.credentialVariable, CREDENTIAL_VARIABLE))
  if (typeof a.workspaceName !== 'string' || a.workspaceName.trim() === '') p.push('the workspace name is missing')
  if (!isDate(a.expiresOn)) p.push('the expiry is not a date')
  else if (Date.parse(a.expiresOn) < Date.parse(today)) p.push(`the approval expired on ${a.expiresOn}`)
  return p
}

export function assertPaidApproved(a: PaidRunApproval | undefined, f: PaidFacts, today: string): void {
  const p = paidApprovalProblems(a, f, today)
  if (p.length > 0) throw new ApprovalRefusal(p)
}

/** A blank record with every gate pending, for the founder to fill in. It is never valid as it stands. */
export function blankPaidApproval(): PaidRunApproval {
  return {
    kind: 'match-eval-paid-run-approval/1',
    runId: '',
    model: '',
    countRunId: '',
    countReportSha256: '',
    countRequestSetSha256: '',
    generationRequestSetSha256: '',
    casesFileSha256: '',
    promptSha256: '',
    schemaSha256: '',
    settingsSha256: '',
    expectationsSha256: '',
    rubricSha256: '',
    analysisSha256: '',
    calls: 0,
    samples: 3,
    maxOutputTokens: 0,
    allowancePercent: 15,
    tripwirePercent: 10,
    limitMicros: 0,
    pricing: { model: '', inputPerMTok: 0, outputPerMTok: 0, source: '', confirmedOn: '', confirmedBy: '' },
    retention: { assumption: RETENTION_ASSUMPTION, sources: [...RETENTION_SOURCES] },
    credentialVariable: CREDENTIAL_VARIABLE,
    workspaceName: '',
    approvals: { model: { status: 'pending' }, prompt: { status: 'pending' }, spend: { status: 'pending' } },
    expiresOn: '',
  }
}
