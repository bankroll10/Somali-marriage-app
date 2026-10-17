import type { ProviderRequest } from './types'

/**
 * Spend accounting for a future live run (docs/MATCH-EVAL.md). Pure code, tested with a fake provider and fake
 * numbers. NOTHING HERE IS A LIVE SPENDING GUARANTEE: the bound below is a value the caller states, and the items in
 * `liveReadiness()` are unresolved. A live run is refused until each is resolved.
 *
 * What the ledger does hold itself to:
 * - The full permitted request cost is reserved before a request is sent.
 * - A call that reports usage settles to its actual cost and releases the difference.
 * - A timeout, an error after sending, or missing usage keeps the full reservation as an uncertain charge. It is never
 *   released and never retried silently.
 * - A plan that does not fit the limit is refused whole. The ledger never reduces calls, cases or samples to fit.
 * - Money is whole micro-dollars: tokens times dollars per million tokens, rounded up.
 * - Every number it is given (limit, output ceiling, counts, token bounds, measurements, usage) must be a finite,
 *   non-negative safe integer; where zero would make no sense (an output ceiling, a token bound) it must be at least
 *   one. Invalid configuration is rejected before any call. Invalid reported usage keeps the full reservation and halts
 *   the ledger. An unknown or already-settled reservation id changes nothing.
 */

/** A pricing record that a person confirmed. The code holds no prices of its own. */
export interface Pricing {
  model: string
  /** Dollars per million input tokens. */
  inputPerMTok: number
  /** Dollars per million output tokens. */
  outputPerMTok: number
  /** Where the figures were read from. */
  source: string
  /** YYYY-MM-DD, the day someone checked them. */
  confirmedOn: string
  confirmedBy: string
}

/** A finite, safe integer of at least `min`. NaN, Infinity, fractions, strings and unsafe magnitudes all fail. */
const isCount = (n: unknown, min = 0): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min

export type PricingCheck = { ok: true } | { ok: false; reasons: string[] }

export function verifyPricing(p: Pricing | undefined, today: string, maxAgeDays = 30): PricingCheck {
  if (!p) return { ok: false, reasons: ['no pricing record'] }
  const reasons: string[] = []
  if (!p.source || p.source.trim() === '') reasons.push('the pricing record names no source')
  if (!p.confirmedBy || p.confirmedBy.trim() === '') reasons.push('nobody confirmed the pricing record')
  if (!Number.isFinite(p.inputPerMTok) || p.inputPerMTok <= 0) reasons.push('the input price must be a positive number')
  if (!Number.isFinite(p.outputPerMTok) || p.outputPerMTok <= 0) reasons.push('the output price must be a positive number')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.confirmedOn) || Number.isNaN(Date.parse(p.confirmedOn))) reasons.push('confirmedOn is not a date (YYYY-MM-DD)')
  else {
    const age = (Date.parse(today) - Date.parse(p.confirmedOn)) / 86_400_000
    if (age < 0) reasons.push('confirmedOn is in the future')
    else if (age > maxAgeDays) reasons.push(`the pricing record is stale (confirmed ${Math.floor(age)} days ago; the limit is ${maxAgeDays})`)
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons }
}

export class LedgerRefusal extends Error {
  readonly reasons: string[]
  constructor(reasons: string[]) {
    super(`The run is refused: ${reasons.join('; ')}.`)
    this.reasons = reasons
  }
}

/**
 * A stated ceiling on a request's input tokens. In Stage 0 it is an explicit value, `verified` is false, and the
 * measure is a stand-in; none of this establishes an upper bound for any real model.
 */
export interface TokenBound {
  max: number
  verified: boolean
  method: string
  measure(req: ProviderRequest): number
}

export const explicitBound = (max: number, measure: (req: ProviderRequest) => number = (r) => r.system.length + r.user.length): TokenBound => ({
  max,
  verified: false,
  method: 'an explicit value for tests; characters stand in for tokens; not a verified bound',
  measure,
})

export type Plan =
  | { ok: true; calls: number; perCallMicros: number; requiredMicros: number; limitMicros: number; availableMicros: number }
  | { ok: false; calls: number; perCallMicros: number; requiredMicros: number; limitMicros: number; availableMicros: number; message: string }

export type Reserve =
  | { ok: true; id: number; micros: number }
  | { ok: false; reason: 'request-over-bound' | 'invalid-measurement' | 'reservation-does-not-fit' | 'halted'; needMicros: number; availableMicros: number }

export type Settle =
  | { ok: true; charge: 'settled' | 'held'; overrun: boolean; inputOverrun: boolean; outputOverrun: boolean; invalid: boolean }
  | { ok: false; reason: 'unknown-reservation' }

/** Checks a live run makes on every response, apart from the dollar cost. Stage 0 callers pass none. */
export interface SettleOptions {
  /** The input tokens this request was allowed (its counted size plus the stated allowance). Billed input above it halts the ledger even when the cost is small. */
  inputAllowance?: number
  /** Billed output above the ceiling should be impossible; if it happens, halt. */
  enforceOutputCeiling?: boolean
}

export interface Snapshot {
  limitMicros: number
  spentMicros: number
  heldMicros: number
  reservedMicros: number
  remainingMicros: number
  halted: boolean
}

const dollars = (micros: number): string => `$${(micros / 1_000_000).toFixed(2)}`

export class Ledger {
  readonly maxOutputTokens: number
  private readonly limit: number
  private readonly pricing: Pricing
  private spent = 0
  private held = 0
  private open = new Map<number, number>()
  private next = 1
  private stopped = false

  constructor(o: { limitMicros: number; pricing: Pricing; maxOutputTokens: number; today: string }) {
    const reasons: string[] = []
    if (!isCount(o.limitMicros)) reasons.push('the spending limit must be a finite, non-negative safe integer (micro-dollars)')
    if (!isCount(o.maxOutputTokens, 1)) reasons.push('the output ceiling must be a finite safe integer of at least 1')
    if (typeof o.today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.today) || Number.isNaN(Date.parse(o.today))) reasons.push('today is not a date (YYYY-MM-DD)')
    else {
      const check = verifyPricing(o.pricing, o.today)
      if (!check.ok) reasons.push(...check.reasons)
    }
    if (reasons.length > 0) throw new LedgerRefusal(reasons)
    this.limit = o.limitMicros
    this.pricing = o.pricing
    this.maxOutputTokens = o.maxOutputTokens
  }

  costOf(inputTokens: number, outputTokens: number): number {
    return Math.ceil(inputTokens * this.pricing.inputPerMTok + outputTokens * this.pricing.outputPerMTok)
  }

  /** Rejects a bound that is not usable, and a worst-case cost that is not a safe integer. Throws before anything is sent. */
  private checkBound(bound: TokenBound): number {
    const reasons: string[] = []
    if (!bound || !isCount(bound.max, 1)) reasons.push('the token bound must be a finite safe integer of at least 1')
    if (!bound || typeof bound.measure !== 'function') reasons.push('the token bound has no measure')
    if (reasons.length > 0) throw new LedgerRefusal(reasons)
    const worst = this.costOf(bound.max, this.maxOutputTokens)
    if (!isCount(worst)) throw new LedgerRefusal(['the worst-case cost of one request is not a safe integer'])
    return worst
  }

  /** The most one request may cost: the whole permitted input bound plus the whole output ceiling. */
  worstCase(bound: TokenBound): number {
    return this.checkBound(bound)
  }

  private reserved(): number {
    let t = 0
    for (const v of this.open.values()) t += v
    return t
  }

  snapshot(): Snapshot {
    const reservedMicros = this.reserved()
    return { limitMicros: this.limit, spentMicros: this.spent, heldMicros: this.held, reservedMicros, remainingMicros: this.limit - this.spent - this.held - reservedMicros, halted: this.stopped }
  }

  /** Whether a whole planned run fits. It is all or nothing: nothing is reduced to make it fit. */
  plan(calls: number, bound: TokenBound): Plan {
    if (!isCount(calls)) throw new LedgerRefusal(['the number of planned calls must be a finite, non-negative safe integer'])
    const perCallMicros = this.checkBound(bound)
    const requiredMicros = calls * perCallMicros
    if (!isCount(requiredMicros)) throw new LedgerRefusal(['the cost of the whole plan is not a safe integer'])
    const availableMicros = this.snapshot().remainingMicros
    const base = { calls, perCallMicros, requiredMicros, limitMicros: this.limit, availableMicros }
    if (requiredMicros <= availableMicros) return { ok: true, ...base }
    return {
      ok: false,
      ...base,
      message: `The planned run needs up to ${dollars(requiredMicros)} (${calls} calls at up to ${dollars(perCallMicros)} each) and ${dollars(availableMicros)} is available. Nothing was reduced. Revise the limit, the cases, the samples, or max tokens, and ask again.`,
    }
  }

  reserve(bound: TokenBound, req: ProviderRequest): Reserve {
    const needMicros = this.checkBound(bound)
    const availableMicros = this.snapshot().remainingMicros
    if (this.stopped) return { ok: false, reason: 'halted', needMicros, availableMicros }
    const measured: unknown = bound.measure(req)
    if (!isCount(measured)) return { ok: false, reason: 'invalid-measurement', needMicros, availableMicros }
    if (measured > bound.max) return { ok: false, reason: 'request-over-bound', needMicros, availableMicros }
    if (needMicros > availableMicros) return { ok: false, reason: 'reservation-does-not-fit', needMicros, availableMicros }
    const id = this.next++
    this.open.set(id, needMicros)
    return { ok: true, id, micros: needMicros }
  }

  /**
   * The call reported usage. Valid usage is charged and the rest released; usage above the reservation halts the ledger.
   * Usage that is not a pair of finite, non-negative safe integers (or whose cost is not one) is not trusted: the whole
   * reservation is kept as an uncertain charge and the ledger halts. An id that is not open changes nothing.
   *
   * With `inputAllowance`, billed input above the allowance halts the ledger on its own, whatever the dollar cost: a
   * small output cannot hide an input overrun.
   */
  settle(id: number, usage: { inputTokens: number; outputTokens: number }, o: SettleOptions = {}): Settle {
    if (o.inputAllowance !== undefined && !isCount(o.inputAllowance, 1)) throw new LedgerRefusal(['the input allowance must be a finite safe integer of at least 1'])
    const reserved = this.open.get(id)
    if (reserved === undefined) return { ok: false, reason: 'unknown-reservation' }
    this.open.delete(id)
    const u = usage as Partial<{ inputTokens: unknown; outputTokens: unknown }> | null | undefined
    const valid = typeof u === 'object' && u !== null && isCount(u.inputTokens) && isCount(u.outputTokens)
    const actual = valid ? this.costOf(u.inputTokens as number, u.outputTokens as number) : Number.NaN
    if (!valid || !isCount(actual)) {
      this.held += reserved
      this.stopped = true
      return { ok: true, charge: 'held', overrun: false, inputOverrun: false, outputOverrun: false, invalid: true }
    }
    this.spent += actual
    const overrun = actual > reserved
    const inputOverrun = o.inputAllowance !== undefined && (u.inputTokens as number) > o.inputAllowance
    const outputOverrun = o.enforceOutputCeiling === true && (u.outputTokens as number) > this.maxOutputTokens
    if (overrun || inputOverrun || outputOverrun) this.stopped = true
    return { ok: true, charge: 'settled', overrun, inputOverrun, outputOverrun, invalid: false }
  }

  /** Stops the ledger: every later reservation is refused. Used when a run must stop for a reason the ledger cannot see. */
  halt(): void {
    this.stopped = true
  }

  /** The charge is uncertain: keep the whole reservation. It is never released. An id that is not open changes nothing. */
  hold(id: number): boolean {
    const reserved = this.open.get(id)
    if (reserved === undefined) return false
    this.open.delete(id)
    this.held += reserved
    return true
  }
}

export interface Readiness {
  item: 'model-specific-token-count' | 'verified-pricing' | 'approval-record' | 'provider-adapter'
  status: 'unresolved'
  why: string
}

/** What must exist before any live run. All four are unresolved; none is implemented or claimed. */
export function liveReadiness(): Readiness[] {
  return [
    {
      item: 'model-specific-token-count',
      status: 'unresolved',
      why: 'A counting method for the chosen model that covers the complete request: system text, user text and any provider overhead. A character count or a safety factor does not establish an upper bound.',
    },
    { item: 'verified-pricing', status: 'unresolved', why: 'A pricing record for the chosen model with a source and a confirmation date, confirmed by the founder. The code holds none.' },
    { item: 'approval-record', status: 'unresolved', why: 'Run id, model, maximum calls, dollar limit, case-set hash and prompt hash, approved in writing for that one run.' },
    { item: 'provider-adapter', status: 'unresolved', why: 'A real provider behind the Provider interface, reading its own credential and never the Guide’s. None is written; Stage 0 connects none.' },
  ]
}

export function assertLiveReady(): never {
  throw new Error(`Live execution is not available. Unresolved: ${liveReadiness().map((i) => i.item).join(', ')}.`)
}
