import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { peopleFor } from '../../src/prototype/match/fixtures'
import { initial, locked, reduce, type Action, type Session } from '../../src/prototype/match/flow'
import { SHOWN_LIMIT, evaluate } from '../../src/prototype/match/suggest'
import { completeSelf } from '../../src/prototype/match/flow'
import type { ScenarioId, Side } from '../../src/prototype/match/types'

/**
 * The prototype's state machine (docs/MATCH-PROTOTYPE.md), held by its rules
 * rather than by examples alone: random sequences of every action, with the
 * invariants checked after each step.
 */

function session(side: Side, scenario: ScenarioId): Session {
  let s = reduce(initial(), { type: 'start', side, scenario })
  s = reduce(s, { type: 'show' })
  return s
}

const apply = (s: Session, ...actions: Action[]) => actions.reduce(reduce, s)

const A = 'man-p1' // interested in the tester from the start
const B = 'man-p3' // also interested
const C = 'man-p2' // not interested yet

describe('a conversation opens only when both people have chosen', () => {
  it('not on the tester’s interest alone, and not on theirs alone', () => {
    const s0 = session('woman', 'three')
    const s1 = apply(s0, { type: 'decide', person: C, choice: 'interested' })
    expect(s1.links[C]).toBeUndefined()
    const s2 = apply(s0, { type: 'theyChoose', person: C, on: true })
    expect(s2.links[C]).toBeUndefined()
  })

  it('opens when the second of the two chooses, in either order', () => {
    const s0 = session('woman', 'three')
    expect(apply(s0, { type: 'decide', person: A, choice: 'interested' }).links[A]?.status).toBe('open')
    const theirsFirst = apply(s0, { type: 'theyChoose', person: C, on: true }, { type: 'decide', person: C, choice: 'interested' })
    expect(theirsFirst.links[C]?.status).toBe('open')
    const yoursFirst = apply(s0, { type: 'decide', person: C, choice: 'interested' }, { type: 'theyChoose', person: C, on: true })
    expect(yoursFirst.links[C]?.status).toBe('open')
  })

  it('does not open for someone the tester passed on, whatever they do after', () => {
    const s = apply(session('woman', 'three'), { type: 'decide', person: A, choice: 'passed' }, { type: 'theyChoose', person: A, on: false }, { type: 'theyChoose', person: A, on: true })
    expect(s.links[A]).toBeUndefined()
  })

  it('lets either person write first', () => {
    const open = apply(session('woman', 'three'), { type: 'decide', person: A, choice: 'interested' })
    const youFirst = apply(open, { type: 'send', person: A, text: 'Salaam' })
    expect(youFirst.links[A].messages.map((m) => m.from)).toEqual(['you'])
    const themFirst = apply(open, { type: 'theySend', person: A, text: 'Salaam' })
    expect(themFirst.links[A].messages.map((m) => m.from)).toEqual(['them'])
    expect(apply(open, { type: 'send', person: A, text: '   ' }).links[A].messages).toEqual([])
  })
})

describe('photos', () => {
  const open = () => apply(session('woman', 'three'), { type: 'decide', person: A, choice: 'interested' }, { type: 'decide', person: B, choice: 'interested' })

  it('are not shared by mutual interest, in either direction', () => {
    const s = open()
    for (const id of [A, B]) {
      expect(s.links[id].youShare).toBe(false)
      expect(s.they[id].sharePhoto).toBe(false)
    }
  })

  it('are shared per conversation: sharing with one never shares with the other', () => {
    const s = apply(open(), { type: 'sharePhoto', person: A })
    expect(s.links[A].youShare).toBe(true)
    expect(s.links[B].youShare).toBe(false)
    const t = apply(s, { type: 'theyShare', person: B, on: true })
    expect(t.they[B].sharePhoto).toBe(true)
    expect(t.they[A].sharePhoto).toBe(false)
    expect(t.links[B].youShare).toBe(false)
  })

  it('keep the two directions independent', () => {
    const mine = apply(open(), { type: 'sharePhoto', person: A })
    expect(mine.they[A].sharePhoto).toBe(false)
    const theirs = apply(open(), { type: 'theyShare', person: A, on: true })
    expect(theirs.links[A].youShare).toBe(false)
    const both = apply(mine, { type: 'theyShare', person: A, on: true }, { type: 'stopSharing', person: A })
    expect(both.links[A].youShare).toBe(false)
    expect(both.they[A].sharePhoto).toBe(true)
  })

  it('cannot be shared with someone there is no conversation with', () => {
    const s = session('woman', 'three')
    expect(apply(s, { type: 'sharePhoto', person: C }).links[C]).toBeUndefined()
    expect(apply(s, { type: 'theyShare', person: C, on: true }).they[C].sharePhoto).toBe(false)
  })

  it('stop being shown once a conversation ends or the person is blocked', () => {
    const shared = apply(open(), { type: 'sharePhoto', person: A }, { type: 'theyShare', person: A, on: true }, { type: 'send', person: A, text: 'x' })
    for (const end of [{ type: 'disconnect', person: A }, { type: 'theyEnd', person: A }, { type: 'block', person: A }] as Action[]) {
      const s = apply(shared, end)
      expect(s.links[A].status).not.toBe('open')
      expect(s.links[A].youShare).toBe(false)
      expect(s.links[A].messages).toEqual([])
      expect(s.they[A].sharePhoto).toBe(false)
      // The other conversation is untouched.
      expect(s.links[B]).toEqual(shared.links[B])
    }
  })
})

describe('the people shown', () => {
  it('are at most three, fixed once, and never refilled', () => {
    const s = session('woman', 'three')
    expect(s.shown).toHaveLength(3)
    const after = apply(s, { type: 'decide', person: A, choice: 'passed' }, { type: 'decide', person: B, choice: 'passed' }, { type: 'show' })
    expect(after.shown).toEqual(s.shown)
  })

  it('are empty when no one is eligible, and the state never relaxes a requirement to fill it', () => {
    const s = session('woman', 'none')
    expect(s.shown).toEqual([])
    expect(apply(s, { type: 'show' }).shown).toEqual([])
    expect(s.me.asks.timeline.firm).toBe('requirement')
  })

  it('can be recomputed from changed asks only while the tester has not acted on anyone', () => {
    const s = session('woman', 'three')
    // Loosening is the tester's own explicit edit, and it is allowed before anyone is chosen or passed on.
    const edited = apply(s, { type: 'firm', id: 'timeline', value: 'preference' }, { type: 'show' })
    expect(locked(edited)).toBe(false)
    expect(edited.shown.length).toBeLessThanOrEqual(SHOWN_LIMIT)
    // After the first choice the asks are read-only.
    const acted = apply(s, { type: 'decide', person: C, choice: 'passed' })
    expect(locked(acted)).toBe(true)
    const tried = apply(acted, { type: 'firm', id: 'timeline', value: 'any' }, { type: 'answer', id: 'timeline', value: 't-later' }, { type: 'accept', id: 'children', option: 'c-none', on: true })
    expect(tried.me).toEqual(acted.me)
  })

  it('a blocked or passed person is never shown again', () => {
    const s = apply(session('woman', 'three'), { type: 'block', person: A }, { type: 'decide', person: B, choice: 'passed' }, { type: 'show' })
    expect(s.shown).toEqual(session('woman', 'three').shown)
    expect(s.decision[A]).toBe('blocked')
    expect(s.decision[B]).toBe('passed')
  })
})

describe('reports and the sheets', () => {
  it('a report is recorded locally and does not end a conversation or block anyone', () => {
    const open = apply(session('woman', 'three'), { type: 'decide', person: A, choice: 'interested' })
    const s = apply(open, { type: 'openSheet', kind: 'report', person: A }, { type: 'report', person: A, reason: 'Something else', note: ' made-up ' })
    expect(s.reports).toEqual([{ person: A, reason: 'Something else', note: 'made-up' }])
    expect(s.links[A].status).toBe('open')
    expect(s.decision[A]).toBe('interested')
    expect(s.sheet).toBeNull()
  })

  it('a block of someone not yet chosen still removes them, with no link to end', () => {
    const s = apply(session('woman', 'three'), { type: 'block', person: C })
    expect(s.decision[C]).toBe('blocked')
    expect(s.links[C]).toBeUndefined()
  })
})

// ── Properties, over random sequences of every action ────────────────────────────

const IDS = peopleFor('woman').map((p) => p.id)
const person = fc.constantFrom(...IDS)
const text = fc.constantFrom('Salaam', 'A made-up line', '  ', 'Another one')

const action: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ type: fc.constant('decide' as const), person, choice: fc.constantFrom('interested' as const, 'passed' as const) }),
  fc.record({ type: fc.constant('theyChoose' as const), person, on: fc.boolean() }),
  fc.record({ type: fc.constant('send' as const), person, text }),
  fc.record({ type: fc.constant('theySend' as const), person, text }),
  fc.record({ type: fc.constant('sharePhoto' as const), person }),
  fc.record({ type: fc.constant('stopSharing' as const), person }),
  fc.record({ type: fc.constant('theyShare' as const), person, on: fc.boolean() }),
  fc.record({ type: fc.constant('theyEnd' as const), person }),
  fc.record({ type: fc.constant('disconnect' as const), person }),
  fc.record({ type: fc.constant('block' as const), person }),
  fc.record({ type: fc.constant('report' as const), person, reason: fc.constant('Something else'), note: text }),
  fc.record({ type: fc.constant('openSheet' as const), kind: fc.constantFrom('disconnect' as const, 'block' as const, 'report' as const), person }),
  fc.record({ type: fc.constant('closeSheet' as const) }),
  fc.record({ type: fc.constant('go' as const), stage: fc.constantFrom('people' as const, 'suggestions' as const, 'conversation' as const), focus: person }),
  fc.record({ type: fc.constant('show' as const) }),
)

const TESTER_ACTIONS = new Set(['decide', 'send', 'sharePhoto', 'stopSharing', 'disconnect', 'block', 'report', 'openSheet', 'closeSheet', 'go', 'show'])

function check(prev: Session, next: Session, a: Action) {
  // A conversation exists only because both chose.
  for (const [id, l] of Object.entries(next.links)) {
    if (l.status === 'open') {
      expect(next.decision[id]).toBe('interested')
      expect(next.they[id].interestedInYou).toBe(true)
    } else {
      // Ended or blocked: nothing to show, and no photo either way. It never reopens.
      expect(l.messages).toEqual([])
      expect(l.youShare).toBe(false)
      expect(next.they[id].sharePhoto).toBe(false)
    }
    // Ended never reopens; a block may follow an ending, and a block stays.
    if (prev.links[id]?.status === 'ended') expect(l.status).not.toBe('open')
    if (prev.links[id]?.status === 'blocked') expect(l.status).toBe('blocked')
  }
  // A new conversation starts with no photo shared in either direction.
  for (const id of Object.keys(next.links)) {
    if (!prev.links[id]) {
      expect(next.links[id].youShare).toBe(false)
      expect(next.they[id].sharePhoto).toBe(false)
    }
  }
  // An action about one person changes nothing about another.
  if ('person' in a) {
    for (const id of IDS) {
      if (id === a.person) continue
      expect(next.links[id]).toEqual(prev.links[id])
      expect(next.they[id]).toEqual(prev.they[id])
      expect(next.decision[id]).toEqual(prev.decision[id])
    }
  }
  // What the made-up people chose is changed only by them (or by a conversation ending).
  if (TESTER_ACTIONS.has(a.type)) {
    for (const id of IDS) expect(next.they[id].interestedInYou).toBe(prev.they[id].interestedInYou)
  }
  // At most three shown, all eligible, fixed once the tester has acted.
  expect(next.shown.length).toBeLessThanOrEqual(SHOWN_LIMIT)
  const self = completeSelf(next.me)!
  const eligible = new Set(evaluate(self, peopleFor('woman')).eligible.map((p) => p.id))
  for (const id of next.shown) expect(eligible.has(id)).toBe(true)
  if (locked(prev)) expect(next.shown).toEqual(prev.shown)
  // Passed and blocked are never undone: a pass may become a block, and a block stays.
  for (const [id, d] of Object.entries(prev.decision)) {
    if (d === 'passed') expect(['passed', 'blocked']).toContain(next.decision[id])
    if (d === 'blocked') expect(next.decision[id]).toBe('blocked')
  }
  // A report never changes who is blocked or connected.
  if (a.type === 'report') {
    expect(next.links).toEqual(prev.links)
    expect(next.decision).toEqual(prev.decision)
  }
}

describe('properties over random sequences', () => {
  it.each<[Side, ScenarioId]>([
    ['woman', 'three'],
    ['woman', 'one'],
    ['woman', 'none'],
  ])('hold for %s / %s', (side, scenario) => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 60 }), (actions) => {
        let s = session(side, scenario)
        for (const a of actions) {
          const next = reduce(s, a)
          check(s, next, a)
          s = next
        }
      }),
      { numRuns: 300 },
    )
  })
})
