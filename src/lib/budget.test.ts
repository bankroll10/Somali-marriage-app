import { describe, expect, it } from 'vitest'
import { guideBudget, repliesLeft } from './budget'
import { REPLIES_PER_STEP } from '../data/plus'

describe('the guide budget refills by progress, not by the calendar', () => {
  it('grants a fixed number of replies per rung reached', () => {
    // Arriving is a rung, so nobody starts at zero.
    expect(guideBudget(1, 0)).toBe(REPLIES_PER_STEP)
    expect(guideBudget(3, 0)).toBe(3 * REPLIES_PER_STEP)
  })

  it('grants the same for every follow-up answered, whichever way it went', () => {
    expect(guideBudget(1, 2)).toBe(3 * REPLIES_PER_STEP)
  })

  it('has no month in it', () => {
    // The only inputs are things she did. Nothing here can be waited out.
    expect(guideBudget(1, 0)).toBe(guideBudget(1, 0))
    expect(guideBudget(0, 0)).toBe(0)
  })

  it('never goes negative, even if a rung reads as un-reached again', () => {
    expect(repliesLeft(1, 0, 40)).toBe(0)
    expect(repliesLeft(2, 1, 10)).toBe(3 * REPLIES_PER_STEP - 10)
  })
})
