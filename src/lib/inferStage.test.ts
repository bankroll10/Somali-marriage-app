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
  it('either instrument, with nothing else said, means she is talking to someone — never further', () => {
    expect(stageAfterInstrument('read', 'preparing', false)).toBe('talking')
    expect(stageAfterInstrument('eleven', 'preparing', false)).toBe('talking')
  })

  it('never infers a decision: deciding and married are only ever said', () => {
    // The eleven used to be taken as `deciding`, which placed a curious
    // stranger — or a man who had only answered her link — at "Deciding
    // together", and counted the `deciding` rung for a tool being used.
    for (const kind of ['read', 'eleven'] as const) {
      for (const stage of ['preparing', 'talking', 'deciding', 'married'] as const) {
        for (const situated of [false, true]) {
          const inferred = stageAfterInstrument(kind, stage, situated)
          expect(inferred === 'deciding' || inferred === 'married', `${kind} from ${stage}`).toBe(false)
        }
      }
    }
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
