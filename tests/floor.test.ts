import { describe, expect, it } from 'vitest'
import { K_FLOOR, floor, floorRows } from '../netlify/shared/floor'

/**
 * A small cell in a split by city is a person wearing a number. The floor turns
 * it into null — never a number, never a missing key.
 */
describe('the floor', () => {
  it('reads a cell under five as null, never as a number, never as missing', () => {
    const out = floor({ arrived: 4, read: 1, eleven: 0, married: 5, counted: 12 })
    expect(out).toEqual({ arrived: null, read: null, eleven: null, married: 5, counted: 12 })
    expect(Object.keys(out).sort()).toEqual(['arrived', 'counted', 'eleven', 'married', 'read'])
  })

  it('is five', () => {
    expect(K_FLOOR).toBe(5)
    expect(floor({ a: 5 }).a).toBe(5)
    expect(floor({ a: 4 }).a).toBeNull()
  })

  it('floors every row of a table on its own', () => {
    const out = floorRows({ toronto: { arrived: 3, married: 7 }, london: { arrived: 9, married: 2 } })
    expect(out).toEqual({ toronto: { arrived: null, married: 7 }, london: { arrived: 9, married: null } })
  })
})
