import { describe, expect, it } from 'vitest'
import { hasHomeFor, stageAfterInstrument } from './inferStage'

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
