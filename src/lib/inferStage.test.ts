import { describe, expect, it } from 'vitest'
import { countsAsArrival, hasHomeFor, marriedOpensEnding, stageAfterInstrument } from './inferStage'

describe('who has a Home', () => {
  it('a map, a said stage, or being counted — a counted man with three answers is not sent back to Welcome', () => {
    expect(hasHomeFor({ completed: false, stage: 'preparing', counted: false })).toBe(false)
    expect(hasHomeFor({ completed: true, stage: 'preparing', counted: false })).toBe(true)
    expect(hasHomeFor({ completed: false, stage: 'talking', counted: false })).toBe(true)
    expect(hasHomeFor({ completed: false, stage: 'preparing', counted: true })).toBe(true)
  })
})

describe('the instrument answers the situation question', () => {
  it('a read with nothing else said means she is talking to someone; the eleven means deciding', () => {
    expect(stageAfterInstrument('read', 'preparing', false)).toBe('talking')
    expect(stageAfterInstrument('eleven', 'preparing', false)).toBe('deciding')
  })

  it('never overrides what she actually said', () => {
    expect(stageAfterInstrument('read', 'preparing', true)).toBeUndefined()
    expect(stageAfterInstrument('read', 'deciding', false)).toBeUndefined()
    expect(stageAfterInstrument('eleven', 'talking', false)).toBeUndefined()
    expect(stageAfterInstrument('eleven', 'married', false)).toBeUndefined()
  })
})

describe('saying you are married', () => {
  it('opens the ending, not the guide — the stage\'s own screen was unreachable from the only place anyone says it', () => {
    expect(marriedOpensEnding('talking', false)).toBe(true)
    expect(marriedOpensEnding('deciding', false)).toBe(true)
    expect(marriedOpensEnding('preparing', false)).toBe(true)
  })

  it('stops opening it once she has recorded one, and never reopens it for someone already married', () => {
    expect(marriedOpensEnding('talking', true)).toBe(false)
    expect(marriedOpensEnding('married', false)).toBe(false)
    expect(marriedOpensEnding('married', true)).toBe(false)
  })
})

describe('who counts as an arrival', () => {
  it('a relative on a vouch link does not — he was asked to attest, and never offered a conversation', () => {
    expect(countsAsArrival('vouch', false)).toBe(false)
  })

  it('he does once this phone has a map of its own, because then he is here for himself', () => {
    expect(countsAsArrival('vouch', true)).toBe(true)
  })

  it('every other arrival counts, map or no map — that is what the denominator is for', () => {
    for (const kind of ['read', 'eleven', 'couple', 'families', 'door', null]) {
      expect(countsAsArrival(kind, false)).toBe(true)
      expect(countsAsArrival(kind, true)).toBe(true)
    }
  })
})
