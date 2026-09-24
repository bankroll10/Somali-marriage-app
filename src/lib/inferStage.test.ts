import { describe, expect, it } from 'vitest'
import { hasHomeFor, marriedOpensEnding, stageAfterInstrument } from './inferStage'

describe('who has a Home', () => {
  it('a map, or a said stage', () => {
    expect(hasHomeFor({ completed: false, stage: 'preparing' })).toBe(false)
    expect(hasHomeFor({ completed: true, stage: 'preparing' })).toBe(true)
    expect(hasHomeFor({ completed: false, stage: 'talking' })).toBe(true)
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
