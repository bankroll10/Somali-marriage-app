import { describe, expect, it } from 'vitest'
import { LEDGER_IDS, ledger, ledgerDone, type LedgerInput } from './ledger'

/**
 * The ledger replaces a trust score. The tests that matter are that it can
 * only report what happened, and that nothing in it can be read as a grade.
 */
const none: LedgerInput = {
  completed: false,
  read: null,
  beforeYes: null,
  answers: {},
  keptCode: null,
  waitlist: null,
  vouch: null,
}
const all: LedgerInput = {
  completed: true,
  read: { at: 'x', answers: {} },
  beforeYes: { at: 'x', answers: {} },
  answers: { household: 'near-family', work: 'both', 'money-home': 'expected' },
  keptCode: 'ACDEFG',
  waitlist: { contact: 'a@b.c', joinedAt: 'x' },
  vouch: { relationship: 'brother', firstName: 'Ali', at: 'x' },
}

describe('the ledger', () => {
  it('starts with nothing done and says so as facts', () => {
    const rows = ledger(none)
    expect(rows.every((r) => !r.done)).toBe(true)
    expect(rows.map((r) => r.id)).toEqual(LEDGER_IDS)
    expect(ledgerDone(none)).toEqual([])
  })

  it('flips every entry on exactly its evidence', () => {
    expect(ledgerDone(all)).toEqual(LEDGER_IDS)
    expect(ledgerDone({ ...none, completed: true })).toEqual(['map'])
    expect(ledgerDone({ ...none, read: all.read })).toEqual(['read'])
    expect(ledgerDone({ ...none, beforeYes: all.beforeYes })).toEqual(['beforeYes'])
    expect(ledgerDone({ ...none, keptCode: 'ACDEFG' })).toEqual(['kept'])
    expect(ledgerDone({ ...none, waitlist: all.waitlist })).toEqual(['counted'])
    expect(ledgerDone({ ...none, vouch: all.vouch })).toEqual(['vouched'])
  })

  it('counts "how you’d live" only when all three are answered', () => {
    expect(ledgerDone({ ...none, answers: { household: 'near-family' } })).toEqual([])
    expect(ledgerDone({ ...none, answers: { household: 'near-family', work: 'both' } })).toEqual([])
    expect(ledgerDone({ ...none, answers: all.answers })).toEqual(['living'])
    // A cleared chip is stored as '' — that is not an answer.
    expect(ledgerDone({ ...none, answers: { ...all.answers, work: '' } })).toEqual([])
  })

  it('is never a score: no digits, no percentages, no grade words', () => {
    for (const input of [none, all, { ...none, completed: true, read: all.read }]) {
      for (const r of ledger(input)) {
        expect(r.line).not.toMatch(/\d/)
        expect(r.label).not.toMatch(/\d/)
        expect(`${r.label} ${r.line}`).not.toMatch(/score|level|points|%|trusted|complete your/i)
      }
    }
  })

  it('keeps a stable order whatever is done', () => {
    expect(ledger(all).map((r) => r.id)).toEqual(ledger(none).map((r) => r.id))
  })
})
