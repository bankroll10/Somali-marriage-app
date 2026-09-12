import { describe, expect, it } from 'vitest'
import { stageAfterInstrument } from './inferStage'

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
