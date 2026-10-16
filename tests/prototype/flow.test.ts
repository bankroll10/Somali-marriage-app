import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { peopleFor } from '../../src/prototype/match/fixtures'
import { UNDO_POLICY, initial, locked, reduce, type Action, type Session } from '../../src/prototype/match/flow'
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

// ── Withdrawing interest and undoing “Not for me” (MATCH-02) ────────────────────

describe('withdrawing interest before a conversation exists', () => {
  it('returns the person to undecided, tells no one, and leaves what they chose untouched', () => {
    const s0 = session('woman', 'three')
    const chose = apply(s0, { type: 'decide', person: C, choice: 'interested' })
    expect(chose.decision[C]).toBe('interested')
    const out = apply(chose, { type: 'withdraw', person: C })
    expect(out.decision[C]).toBe('undecided')
    expect(out.links[C]).toBeUndefined()
    expect(out.they[C]).toEqual(chose.they[C])
    expect(out.notice).toEqual({ kind: 'withdrawn', person: C })
    expect(out.shown).toEqual(chose.shown)
  })

  it('is refused when mutual interest came first: the conversation is open, nothing changes', () => {
    const s0 = session('woman', 'three')
    // The other person had already chosen the tester; the tester's choice made it mutual.
    const open = apply(s0, { type: 'decide', person: A, choice: 'interested' })
    expect(open.links[A]?.status).toBe('open')
    expect(reduce(open, { type: 'withdraw', person: A })).toBe(open)
    // The other order: the tester chose first, then the other person did.
    const second = apply(s0, { type: 'decide', person: C, choice: 'interested' }, { type: 'theyChoose', person: C, on: true })
    expect(second.links[C]?.status).toBe('open')
    expect(second.notice).toEqual({ kind: 'mutual', person: C })
    expect(reduce(second, { type: 'withdraw', person: C })).toBe(second)
  })

  it('when the tester withdraws first, a later choice by the other person opens nothing; choosing again opens at once', () => {
    const s0 = session('woman', 'three')
    const s1 = apply(s0, { type: 'decide', person: C, choice: 'interested' }, { type: 'withdraw', person: C }, { type: 'theyChoose', person: C, on: true })
    expect(s1.links[C]).toBeUndefined()
    expect(s1.decision[C]).toBe('undecided')
    const s2 = apply(s1, { type: 'decide', person: C, choice: 'interested' })
    expect(s2.links[C]?.status).toBe('open')
    // And with no photo shared in either direction, as for any new conversation.
    expect(s2.links[C].youShare).toBe(false)
    expect(s2.they[C].sharePhoto).toBe(false)
  })

  it('cannot bring back a conversation that ended: withdraw, decide and a new choice all leave it ended', () => {
    const s0 = session('woman', 'three')
    const ended = apply(s0, { type: 'decide', person: A, choice: 'interested' }, { type: 'disconnect', person: A })
    expect(ended.links[A].status).toBe('ended')
    for (const a of [{ type: 'withdraw', person: A }, { type: 'decide', person: A, choice: 'interested' }, { type: 'theyChoose', person: A, on: false }, { type: 'theyChoose', person: A, on: true }] as Action[]) {
      expect(apply(ended, a).links[A].status).toBe('ended')
    }
    expect(reduce(ended, { type: 'withdraw', person: A })).toBe(ended)
    const theyEnded = apply(s0, { type: 'decide', person: A, choice: 'interested' }, { type: 'theyEnd', person: A }, { type: 'theyChoose', person: A, on: true })
    expect(theyEnded.links[A].status).toBe('ended')
  })

  it('does nothing for a person who was not chosen, was passed on, or was blocked', () => {
    const s0 = session('woman', 'three')
    expect(reduce(s0, { type: 'withdraw', person: C })).toBe(s0)
    const passed = apply(s0, { type: 'decide', person: C, choice: 'passed' })
    expect(reduce(passed, { type: 'withdraw', person: C })).toBe(passed)
    const blocked = apply(s0, { type: 'decide', person: C, choice: 'interested' }, { type: 'block', person: C })
    expect(reduce(blocked, { type: 'withdraw', person: C })).toBe(blocked)
    expect(blocked.decision[C]).toBe('blocked')
  })

  it('does not move the tester to another screen, and touches no other person', () => {
    const s0 = apply(session('woman', 'three'), { type: 'decide', person: B, choice: 'interested' }, { type: 'decide', person: C, choice: 'interested' }, { type: 'go', stage: 'suggestion', focus: C })
    const out = reduce(s0, { type: 'withdraw', person: C })
    expect(out.stage).toBe('suggestion')
    expect(out.focus).toBe(C)
    expect(out.decision[B]).toBe(s0.decision[B])
    expect(out.links[B]).toEqual(s0.links[B])
  })

  it('lets the answers be edited again only when nothing irreversible has happened', () => {
    const s0 = session('woman', 'three')
    expect(locked(apply(s0, { type: 'decide', person: C, choice: 'interested' }))).toBe(true)
    expect(locked(apply(s0, { type: 'decide', person: C, choice: 'interested' }, { type: 'withdraw', person: C }))).toBe(false)
    expect(locked(apply(s0, { type: 'decide', person: A, choice: 'interested' }, { type: 'disconnect', person: A }))).toBe(true)
    expect(locked(apply(s0, { type: 'decide', person: C, choice: 'passed' }, { type: 'block', person: C }))).toBe(true)
  })
})

describe('undoing “Not for me”', () => {
  const passC = (s: Session) => apply(s, { type: 'decide', person: C, choice: 'passed' })

  it('restores undecided and changes nothing else; the person is not told and stays in the same place', () => {
    const s0 = session('woman', 'three')
    const passed = passC(s0)
    expect(passed.decision[C]).toBe('passed')
    expect(passed.undo).toBe(C)
    const back = reduce(passed, { type: 'undoPass', person: C })
    expect(back.decision[C]).toBe('undecided')
    expect(back.undo).toBeNull()
    expect(back.notice).toEqual({ kind: 'undone', person: C })
    expect(back.shown).toEqual(s0.shown)
    expect(back.they).toEqual(s0.they)
    expect(back.links).toEqual(s0.links)
  })

  it('is on offer at once: passing moves to the confirmation screen with the undo already in place', () => {
    const passed = passC(session('woman', 'three'))
    expect(passed.stage).toBe('people')
    expect(passed.focus).toBe(C)
    expect(passed.undo).toBe(C)
  })

  it('survives everything a person can do without deciding: focus, scrolling and disclosures send no action, and the simulated person’s actions keep it', () => {
    const base = apply(session('woman', 'three'), { type: 'decide', person: A, choice: 'interested' })
    const passed = passC(base)
    const kept = apply(
      passed,
      { type: 'theyChoose', person: C, on: true },
      { type: 'theyChoose', person: C, on: false },
      { type: 'theyChoose', person: B, on: true },
      { type: 'theySend', person: A, text: 'Salaam' },
      { type: 'theyShare', person: A, on: true },
      { type: 'theyShare', person: A, on: false },
      { type: 'theyEnd', person: A },
      { type: 'go', stage: 'people' }, // the screen already shown is not navigating away
    )
    expect(kept.undo).toBe(C)
    expect(kept.decision[C]).toBe('passed')
    expect(reduce(kept, { type: 'undoPass', person: C }).decision[C]).toBe('undecided')
  })

  it('is cleared by the next deliberate decision, by leaving the screen, by every safety action, and by editing', () => {
    const base = session('woman', 'three')
    const cleared: [string, Action][] = [
      ['a later decision', { type: 'decide', person: A, choice: 'interested' }],
      ['a later pass', { type: 'decide', person: B, choice: 'passed' }],
      ['a withdrawal', { type: 'withdraw', person: A }],
      ['leaving the screen', { type: 'go', stage: 'suggestions' }],
      ['a different person’s page', { type: 'go', stage: 'people', focus: A }],
      ['opening the notes', { type: 'go', stage: 'notes' }],
      ['opening a safety sheet', { type: 'openSheet', kind: 'report', person: A }],
      ['closing a safety sheet', { type: 'closeSheet' }],
      ['a block', { type: 'block', person: B }],
      ['a report', { type: 'report', person: A, reason: 'Something else', note: '' }],
      ['a disconnect', { type: 'disconnect', person: A }],
      ['sending a message', { type: 'send', person: A, text: 'Salaam' }],
      ['sharing a photo', { type: 'sharePhoto', person: A }],
      ['editing a name', { type: 'name', value: 'Maryam' }],
    ]
    for (const [why, a] of cleared) {
      // A person to withdraw, disconnect, message or share with must exist, so give every case the same starting history.
      const start = apply(passC(apply(base, { type: 'decide', person: A, choice: 'interested' }, { type: 'decide', person: B, choice: 'interested' })), { type: 'go', stage: 'people', focus: C })
      expect(start.undo, why).toBe(C)
      const out = reduce(start, a)
      if (out !== start) expect(out.undo, why).toBeNull()
    }
    // The ones that must change state, change it and clear.
    expect(reduce(passC(base), { type: 'go', stage: 'suggestions' }).undo).toBeNull()
    expect(reduce(passC(base), { type: 'openSheet', kind: 'block', person: C }).undo).toBeNull()
    expect(reduce(passC(base), { type: 'block', person: C }).undo).toBeNull()
    expect(reduce(passC(base), { type: 'decide', person: A, choice: 'interested' }).undo).toBeNull()
  })

  it('names every action in one explicit policy, so a new action cannot quietly keep or lose it', () => {
    const types = ['start', 'go', 'name', 'age', 'answer', 'accept', 'firm', 'words', 'show', 'decide', 'withdraw', 'undoPass', 'send', 'sharePhoto', 'stopSharing', 'theyChoose', 'theySend', 'theyShare', 'theyEnd', 'openSheet', 'closeSheet', 'disconnect', 'block', 'report', 'reset']
    expect(Object.keys(UNDO_POLICY).sort()).toEqual([...types].sort())
    const kept = Object.entries(UNDO_POLICY).filter(([, v]) => v === 'keep').map(([k]) => k)
    expect(kept.sort()).toEqual(['theyChoose', 'theyEnd', 'theySend', 'theyShare'])
  })

  it('after mutual interest came first for someone else, still restores only this person', () => {
    const s = apply(session('woman', 'three'), { type: 'decide', person: C, choice: 'passed' }, { type: 'theyChoose', person: C, on: true })
    expect(s.links[C]).toBeUndefined() // a pass stands even when the other person has chosen
    const back = reduce(s, { type: 'undoPass', person: C })
    expect(back.decision[C]).toBe('undecided')
    expect(back.links[C]).toBeUndefined() // undoing never opens anything by itself
    expect(reduce(back, { type: 'decide', person: C, choice: 'interested' }).links[C]?.status).toBe('open')
  })

  it('is refused for anyone not just passed on, and never undoes a block', () => {
    const base = session('woman', 'three')
    expect(reduce(base, { type: 'undoPass', person: C })).toBe(base)
    const passed = passC(base)
    expect(reduce(passed, { type: 'undoPass', person: A })).toBe(passed)
    const blocked = apply(passed, { type: 'block', person: C })
    expect(blocked.decision[C]).toBe('blocked')
    expect(reduce(blocked, { type: 'undoPass', person: C })).toBe(blocked)
  })
})

describe('regression: what MATCH-02 must not change', () => {
  it('keeps either-person-first messaging, per-connection photos and safety actions working after a withdraw and an undo elsewhere', () => {
    let s = session('woman', 'three')
    s = apply(s, { type: 'decide', person: A, choice: 'interested' }, { type: 'decide', person: B, choice: 'interested' })
    s = apply(s, { type: 'decide', person: C, choice: 'interested' }, { type: 'withdraw', person: C })
    s = apply(s, { type: 'send', person: A, text: 'Salaam' }, { type: 'theySend', person: B, text: 'Hello' })
    expect(s.links[A].messages.map((m) => m.from)).toEqual(['you'])
    expect(s.links[B].messages.map((m) => m.from)).toEqual(['them'])
    s = apply(s, { type: 'sharePhoto', person: A }, { type: 'theyShare', person: B, on: true })
    expect(s.links[A].youShare).toBe(true)
    expect(s.links[B].youShare).toBe(false)
    expect(s.they[A].sharePhoto).toBe(false)
    expect(s.they[B].sharePhoto).toBe(true)
    s = apply(s, { type: 'disconnect', person: A })
    expect(s.links[A]).toEqual({ status: 'ended', messages: [], youShare: false })
    expect(s.links[B].status).toBe('open')
    expect(s.they[B].sharePhoto).toBe(true)
    s = apply(s, { type: 'block', person: B })
    expect(s.decision[B]).toBe('blocked')
    expect(s.links[B].status).toBe('blocked')
  })
})

// ── Properties, over random sequences of every action ────────────────────────────

const IDS = peopleFor('woman').map((p) => p.id)
const person = fc.constantFrom(...IDS)
const text = fc.constantFrom('Salaam', 'A made-up line', '  ', 'Another one')

const action: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ type: fc.constant('decide' as const), person, choice: fc.constantFrom('interested' as const, 'passed' as const) }),
  fc.record({ type: fc.constant('withdraw' as const), person }),
  fc.record({ type: fc.constant('undoPass' as const), person }),
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

const TESTER_ACTIONS = new Set(['decide', 'withdraw', 'undoPass', 'send', 'sharePhoto', 'stopSharing', 'disconnect', 'block', 'report', 'openSheet', 'closeSheet', 'go', 'show'])

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
  // A block stays. A pass is undone only by `undoPass` on the person just passed on, and interest is withdrawn only by `withdraw`.
  for (const [id, d] of Object.entries(prev.decision)) {
    if (d === 'blocked') expect(next.decision[id]).toBe('blocked')
    if (d === 'passed' && next.decision[id] === 'undecided') {
      expect(a.type).toBe('undoPass')
      expect(prev.undo).toBe(id)
    }
    if (d === 'interested' && next.decision[id] === 'undecided') {
      expect(a.type).toBe('withdraw')
      expect(prev.links[id]).toBeUndefined()
    }
  }
  // The pending undo names only someone currently passed on, and no link ever exists for them.
  if (next.undo) {
    expect(next.decision[next.undo]).toBe('passed')
    expect(next.links[next.undo]).toBeUndefined()
  }
  // A withdraw or an undo changes the decision, the undo and the notice, and nothing else.
  if (a.type === 'withdraw' || a.type === 'undoPass') {
    expect({ ...next, decision: 0, undo: 0, notice: 0 }).toEqual({ ...prev, decision: 0, undo: 0, notice: 0 })
  }
  // The undo ends only by the explicit policy: kept by the simulated person, cleared by a deliberate act.
  if (prev.undo && UNDO_POLICY[a.type] === 'keep') expect(next.undo).toBe(prev.undo)
  if (prev.undo && UNDO_POLICY[a.type] === 'clear' && next !== prev && !(a.type === 'go' && next.stage === prev.stage && next.focus === prev.focus)) expect(next.undo).toBeNull()
  // A conversation that has ended or been blocked is never reopened, whatever the sequence.
  for (const [id, l] of Object.entries(prev.links)) if (l.status !== 'open') expect(next.links[id].status).toBe(l.status)
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
