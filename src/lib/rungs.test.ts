import { describe, expect, it } from 'vitest'
import { RUNG_IDS, rungsFrom, type RungId, type RungInput } from './rungs'

const base: RungInput = {
  situated: false,
  completed: false,
  stage: 'preparing',
  read: null,
  beforeYes: null,
  couple: null,
  vouch: null,
  waitlist: null,
  followedThrough: false,
}

const record = { at: '2026-01-01T00:00:00.000Z', answers: {} }

describe('the ladder', () => {
  it('a person who has only opened it has reached exactly one rung', () => {
    expect(rungsFrom(base)).toEqual(['arrived'])
  })

  it('every rung flips on exactly its own evidence', () => {
    const cases: [Partial<RungInput>, RungId][] = [
      [{ situated: true }, 'situated'],
      [{ completed: true }, 'mapped'],
      [{ read: record }, 'read'],
      [{ beforeYes: record }, 'eleven'],
      [{ couple: { code: 'ACDEFG', at: 'x' } }, 'asked-him'],
      [{ couple: { code: 'ACDEFG', at: 'x', answered: 'y' } }, 'he-answered'],
      [{ followedThrough: true }, 'followed-through'],
      [{ vouch: { relationship: 'brother', firstName: 'Ahmed', at: 'x' } }, 'vouched'],
      [{ waitlist: { contact: 'a@b.c', joinedAt: 'x' } }, 'counted'],
      [{ stage: 'deciding' }, 'deciding'],
    ]
    for (const [patch, id] of cases) {
      expect(rungsFrom({ ...base, ...patch }), id).toContain(id)
      expect(rungsFrom(base), id).not.toContain(id)
    }
  })

  it('asking him is reached before he answers, never the other way round', () => {
    expect(rungsFrom({ ...base, couple: { code: 'ACDEFG', at: 'x' } })).not.toContain('he-answered')
    const both = rungsFrom({ ...base, couple: { code: 'ACDEFG', at: 'x', answered: 'y' } })
    expect(both).toContain('asked-him')
    expect(both).toContain('he-answered')
  })

  it('married implies deciding — the arc does not skip backwards', () => {
    const r = rungsFrom({ ...base, stage: 'married' })
    expect(r).toContain('deciding')
    expect(r).toContain('married')
  })

  it('returns rungs in ladder order, and never an id outside the ladder', () => {
    const all = rungsFrom({
      situated: true,
      completed: true,
      stage: 'married',
      read: record,
      beforeYes: record,
      couple: { code: 'ACDEFG', at: 'x', answered: 'y' },
      vouch: { relationship: 'father', firstName: 'Yusuf', at: 'x' },
      waitlist: { contact: 'a@b.c', joinedAt: 'x' },
      followedThrough: true,
    })
    expect(all).toEqual(RUNG_IDS)
    for (const id of all) expect(RUNG_IDS).toContain(id)
  })

  it('measures nothing that could be moved by keeping someone on a screen', () => {
    // The vocabulary is the guarantee: no session, duration, count or streak
    // can be reported, because there is no rung for one.
    for (const id of RUNG_IDS) {
      expect(id).not.toMatch(/session|time|minute|day|streak|count(?!ed)|message|open|visit|tap|swipe|screen/i)
    }
  })
})
