import { describe, expect, it } from 'vitest'
import type { DayAvailability, Qty } from '../shared/types.ts'
import { dayState, daysThatFit, deadlineCopy, fit, linesCopy, longDate, productState, reduceToFit, shortCopy } from '../src/lib/cart.ts'

/** The order page's rules, which never touch the cart on their own. */
const day = (over: Partial<DayAvailability> = {}): DayAvailability => ({
  date: '2026-09-21',
  blocked: false,
  cutoffAt: '2026-09-19T22:00:00.000Z',
  open: true,
  remaining: { sourdough: 3, banana: 4 },
  held: { sourdough: 0, banana: 0 },
  ...over,
})
const q = (sourdough = 0, banana = 0): Qty => ({ sourdough, banana })

describe('does the whole cart fit', () => {
  it('reports every short line and never trims anything', () => {
    expect(fit(day(), q(2, 1))).toEqual({ ok: true })
    expect(fit(day({ remaining: q(3, 1) }), q(2, 2))).toEqual({ ok: false, short: [{ id: 'banana', asked: 2, free: 1 }] })
    expect(fit(day({ remaining: q(0, 0) }), q(1, 1))).toEqual({ ok: false, short: [{ id: 'sourdough', asked: 1, free: 0 }, { id: 'banana', asked: 1, free: 0 }] })
  })

  it('reduce-to-fit is explicit and exact', () => {
    expect(reduceToFit(q(2, 2), day({ remaining: q(3, 1) }))).toEqual(q(2, 1))
    expect(reduceToFit(q(2, 2), day({ remaining: q(0, 0) }))).toEqual(q(0, 0))
    expect(shortCopy([{ id: 'banana', asked: 2, free: 1 }])).toBe('only 1 banana bread free (you asked for 2)')
    expect(shortCopy([{ id: 'sourdough', asked: 1, free: 0 }])).toBe('no sourdough free (you asked for 1)')
  })
})

describe('what a day is, for this cart', () => {
  it('blocked and closed come first; sold out is nothing free and nothing held; held-only may come back', () => {
    expect(dayState(day({ blocked: true, remaining: q(0, 0) }), q())).toBe('blocked')
    expect(dayState(day({ open: false }), q())).toBe('closed')
    expect(dayState(day({ remaining: q(0, 0) }), q())).toBe('sold_out')
    expect(dayState(day({ remaining: q(0, 0), held: q(2, 0) }), q())).toBe('held_only')
    expect(dayState(day({ remaining: q(0, 4) }), q())).toBe('ok') // one product gone does not close the day
  })
  it('with a cart, a day that cannot take all of it is short, not closed', () => {
    expect(dayState(day({ remaining: q(3, 1) }), q(2, 2))).toBe('short')
    expect(dayState(day({ remaining: q(3, 1) }), q(2, 1))).toBe('ok')
    expect(dayState(day({ remaining: q(0, 4) }), q(1, 0))).toBe('short')
    expect(daysThatFit([day({ remaining: q(0, 4) }), day({ date: '2026-09-23' })], q(1, 0)).map((d) => d.date)).toEqual(['2026-09-23'])
  })
  it('a product is sold out only when nothing is held either, and low below capacity', () => {
    expect(productState(day(), 'sourdough', 3)).toEqual({ kind: 'plenty' })
    expect(productState(day({ remaining: q(1, 4) }), 'sourdough', 3)).toEqual({ kind: 'low', free: 1 })
    expect(productState(day({ remaining: q(0, 4) }), 'sourdough', 3)).toEqual({ kind: 'sold_out' })
    expect(productState(day({ remaining: q(0, 4), held: q(2, 0) }), 'sourdough', 3)).toEqual({ kind: 'held', held: 2 })
    expect(productState(day({ remaining: q(0, 4) }), 'banana', 4)).toEqual({ kind: 'plenty' })
  })
})

describe('dates, in words', () => {
  it('gives the full weekday and month, and the year once it matters', () => {
    expect(longDate('2026-09-21', '2026-09-18')).toBe('Monday, September 21')
    expect(longDate('2026-09-21', '2026-09-18', 'always')).toBe('Monday, September 21, 2026')
    expect(longDate('2027-01-04', '2026-12-30')).toBe('Monday, January 4, 2027')
    expect(linesCopy(q(2, 1))).toBe('2 sourdough · 1 banana bread')
  })
  it('states the deadline in Chicago time, on both sides of daylight saving', () => {
    expect(deadlineCopy('2026-09-19T22:00:00.000Z', '2026-09-18')).toBe('Saturday, September 19 at 5:00 PM')
    expect(deadlineCopy('2026-11-28T23:00:00.000Z', '2026-11-25')).toBe('Saturday, November 28 at 5:00 PM')
    expect(deadlineCopy('2027-01-02T23:00:00.000Z', '2026-12-30')).toBe('Saturday, January 2, 2027 at 5:00 PM')
  })
})
