import { describe, expect, it } from 'vitest'
import { explicitBound, Ledger, LedgerRefusal } from './match-eval/ledger'
import { PRICING, TODAY } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a: what the ledger gained (docs/MATCH-EVAL.md, "Stage 1a"): an input allowance checked apart from the
 * dollar cost, an output-ceiling check, and a halt. Stage 0 callers, which pass no options, behave as before.
 */

const ledger = () => new Ledger({ limitMicros: 10_000_000, pricing: PRICING, maxOutputTokens: 1_500, today: TODAY })
const bound = explicitBound(3_000, () => 2_000)
const req = { system: 's', user: 'u', maxTokens: 1_500 }

describe('the input allowance', () => {
  it('halts on billed input above the allowance even though a tiny output keeps the cost far under the reservation', () => {
    const l = ledger()
    const r = l.reserve(bound, req)
    if (!r.ok) throw new Error('no reservation')
    const out = l.settle(r.id, { inputTokens: 2_301, outputTokens: 1 }, { inputAllowance: 2_300 })
    expect(out).toMatchObject({ ok: true, charge: 'settled', inputOverrun: true, overrun: false, invalid: false })
    expect(l.costOf(2_301, 1)).toBeLessThan(r.micros)
    expect(l.snapshot().halted).toBe(true)
    expect(l.snapshot().spentMicros).toBe(l.costOf(2_301, 1))
  })

  it('does not halt at exactly the allowance', () => {
    const l = ledger()
    const r = l.reserve(bound, req)
    if (!r.ok) throw new Error('no reservation')
    expect(l.settle(r.id, { inputTokens: 2_300, outputTokens: 1 }, { inputAllowance: 2_300 })).toMatchObject({ inputOverrun: false })
    expect(l.snapshot().halted).toBe(false)
  })

  it('rejects an allowance that is not a whole number of at least 1, and leaves the reservation open', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60]) {
      const l = ledger()
      const r = l.reserve(bound, req)
      if (!r.ok) throw new Error('no reservation')
      expect(() => l.settle(r.id, { inputTokens: 5, outputTokens: 5 }, { inputAllowance: bad }), String(bad)).toThrow(LedgerRefusal)
      expect(l.snapshot().reservedMicros).toBe(r.micros)
      expect(l.settle(r.id, { inputTokens: 5, outputTokens: 5 })).toMatchObject({ ok: true, charge: 'settled' })
    }
  })

  it('changes nothing for a reservation id that is unknown or already settled', () => {
    const l = ledger()
    const r = l.reserve(bound, req)
    if (!r.ok) throw new Error('no reservation')
    l.settle(r.id, { inputTokens: 5, outputTokens: 5 }, { inputAllowance: 100 })
    const before = l.snapshot()
    expect(l.settle(r.id, { inputTokens: 5_000, outputTokens: 5 }, { inputAllowance: 100 })).toEqual({ ok: false, reason: 'unknown-reservation' })
    expect(l.settle(999, { inputTokens: 5_000, outputTokens: 5 }, { inputAllowance: 100 })).toEqual({ ok: false, reason: 'unknown-reservation' })
    expect(l.snapshot()).toEqual(before)
  })
})

describe('the output ceiling check', () => {
  it('halts on billed output above the ceiling only when asked to check it', () => {
    const a = ledger()
    const ra = a.reserve(bound, req)
    const b = ledger()
    const rb = b.reserve(bound, req)
    if (!ra.ok || !rb.ok) throw new Error('no reservation')
    expect(a.settle(ra.id, { inputTokens: 10, outputTokens: 1_501 }, { enforceOutputCeiling: true })).toMatchObject({ outputOverrun: true })
    expect(a.snapshot().halted).toBe(true)
    expect(b.settle(rb.id, { inputTokens: 10, outputTokens: 1_501 })).toMatchObject({ outputOverrun: false })
    expect(b.snapshot().halted).toBe(false)
  })

  it('does not halt at exactly the ceiling', () => {
    const l = ledger()
    const r = l.reserve(bound, req)
    if (!r.ok) throw new Error('no reservation')
    expect(l.settle(r.id, { inputTokens: 10, outputTokens: 1_500 }, { enforceOutputCeiling: true })).toMatchObject({ outputOverrun: false })
  })
})

describe('halt', () => {
  it('refuses every later reservation', () => {
    const l = ledger()
    l.halt()
    expect(l.reserve(bound, req)).toMatchObject({ ok: false, reason: 'halted' })
  })
})

describe('Stage 0 behaviour is unchanged', () => {
  it('reports no input or output overrun when no options are passed, and still halts on a cost overrun', () => {
    const l = new Ledger({ limitMicros: 10_000_000, pricing: PRICING, maxOutputTokens: 10, today: TODAY })
    const r = l.reserve(explicitBound(100, () => 50), req)
    if (!r.ok) throw new Error('no reservation')
    expect(l.settle(r.id, { inputTokens: 100, outputTokens: 11 })).toMatchObject({ overrun: true, inputOverrun: false, outputOverrun: false })
    expect(l.snapshot().halted).toBe(true)
  })
})
