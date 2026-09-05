import { describe, expect, it } from 'vitest'
import {
  MIN_AGE_DAYS,
  READ_STALE_DAYS,
  followedThrough,
  noteFollowUp,
  openFollowUp,
  readIsStale,
  resolveFollowUp,
  writeBackState,
} from './followup'
import type { FollowUp } from '../types'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-06-01T12:00:00.000Z')
const ago = (days: number) => new Date(NOW - days * DAY).toISOString()

const one = (over: Partial<FollowUp> = {}): FollowUp => ({
  id: 'a',
  source: 'beforeYes',
  topic: 'money-home',
  at: ago(5),
  ...over,
})

describe('when it asks', () => {
  it('waits until enough days have passed that the answer could have changed', () => {
    expect(openFollowUp([one({ at: ago(MIN_AGE_DAYS - 1) })], 'woman', NOW)).toBeNull()
    expect(openFollowUp([one({ at: ago(MIN_AGE_DAYS) })], 'woman', NOW)).not.toBeNull()
  })

  it('asks about one thing at a time, the most recent first', () => {
    const ask = openFollowUp(
      [one({ id: 'old', topic: 'qabiil', at: ago(30) }), one({ id: 'new', topic: 'money-home', at: ago(4) })],
      'woman',
      NOW,
    )
    expect(ask?.followUp.id).toBe('new')
  })

  it('stops asking once she has answered, whatever she answered', () => {
    for (const outcome of ['asked', 'not-yet', 'differently'] as const) {
      expect(openFollowUp([one({ outcome })], 'woman', NOW)).toBeNull()
    }
  })

  it('never asks about something the eleven does not have', () => {
    expect(openFollowUp([one({ topic: 'not-a-topic' })], 'woman', NOW)).toBeNull()
    expect(openFollowUp([one({ source: 'read', topic: 'not-a-dimension' })], 'woman', NOW)).toBeNull()
  })

  it('asks about words the guide gave her, and shows them again', () => {
    const words = 'Does anyone in your life know about me?'
    const ask = openFollowUp([one({ source: 'guide', topic: 'he texts late', words })], 'woman', NOW)!
    expect(ask.question).toContain('guide')
    expect(ask.script.words).toBe(words)
    expect(ask.writesBack).toBe(false)
  })

  it('asks about the words she took for her family, by the script she took', () => {
    const ask = openFollowUp([one({ source: 'family', topic: 'first-with-hooyo' })], 'woman', NOW)!
    expect(ask.question).toMatch(/hooyo/i)
    expect(ask.script.words.length).toBeGreaterThan(20)
    expect(ask.travel).toBe('family')
    expect(ask.writesBack).toBe(false)
  })

  it('never asks a man about a script that is only for a woman, or anyone about one that does not exist', () => {
    expect(openFollowUp([one({ source: 'family', topic: 'tell-wali-online' })], 'man', NOW)).toBeNull()
    expect(openFollowUp([one({ source: 'family', topic: 'not-a-script' })], 'woman', NOW)).toBeNull()
  })

  it('does not ask about a guide commitment that carries no words', () => {
    expect(openFollowUp([one({ source: 'guide', topic: 'x' })], 'woman', NOW)).toBeNull()
  })

  it('has nothing to say when there is nothing open — the normal case', () => {
    expect(openFollowUp([], 'woman', NOW)).toBeNull()
  })
})

describe('what it says', () => {
  const cases: FollowUp[] = [
    one(),
    one({ topic: 'live' }),
    one({ topic: 'second-wife' }),
    one({ source: 'couple', topic: 'children' }),
    one({ source: 'read', topic: 'public' }),
    one({ source: 'read', topic: 'family' }),
    one({ source: 'guide', topic: 'he texts late', words: 'Does anyone in your life know about me?' }),
    one({ source: 'family', topic: 'first-with-hooyo' }),
    one({ source: 'family', topic: 'open-mahr-and-living' }),
  ]

  it('never judges him, and never tells her to stay or go', () => {
    const banned = [
      'good man', 'bad man', 'a player', 'red flag', 'leave him', 'dump him', 'end it',
      'walk away', 'you deserve better', 'you should marry', "don't marry", 'dealbreaker',
      'you failed', 'you still haven', 'come back', 'streak', 'keep it up',
    ]
    for (const f of cases) {
      const ask = openFollowUp([f], 'woman', NOW)!
      const text = [ask.question, ask.label, ask.script.why, ask.script.words, ask.script.tells].join(' ').toLowerCase()
      for (const phrase of banned) expect(text, `${f.source}:${f.topic}`).not.toContain(phrase)
    }
  })

  it('never puts a digit in front of her', () => {
    for (const f of cases) {
      const ask = openFollowUp([f], 'woman', NOW)!
      expect(`${ask.question} ${ask.label}`).not.toMatch(/\d/)
    }
  })

  it('reads from her side, and from his', () => {
    const hers = openFollowUp([one({ source: 'read', topic: 'public' })], 'woman', NOW)!
    const his = openFollowUp([one({ source: 'read', topic: 'public' })], 'man', NOW)!
    expect(hers.question).toContain('him')
    expect(his.question).toContain('her')
  })

  it('offers the words again, and says when saying yes can update the eleven', () => {
    expect(openFollowUp([one()], 'woman', NOW)!.writesBack).toBe(true)
    expect(openFollowUp([one({ source: 'read', topic: 'public' })], 'woman', NOW)!.writesBack).toBe(false)
  })
})

describe('where the words can travel', () => {
  it('sends each source’s words back to the instrument they came from', () => {
    const travel = (f: FollowUp) => openFollowUp([f], 'woman', NOW)!.travel
    expect(travel(one({ source: 'read', topic: 'public' }))).toBe('read')
    expect(travel(one({ source: 'guide', topic: 'x', words: 'Say this.' }))).toBe('guide')
    expect(travel(one())).toBe('eleven')
    expect(travel(one({ source: 'couple', topic: 'children' }))).toBe('couple')
  })
})

describe('keeping the record', () => {
  it('does not stack a second ask for the same open thing', () => {
    const once = noteFollowUp([], 'beforeYes', 'money-home', ago(5))
    expect(noteFollowUp(once, 'beforeYes', 'money-home', ago(4))).toHaveLength(1)
  })

  it('asks again about a topic she has already resolved', () => {
    const done = resolveFollowUp(noteFollowUp([], 'beforeYes', 'money-home', ago(30)), 'beforeYes:money-home:' + ago(30), 'asked')
    expect(noteFollowUp(done, 'beforeYes', 'money-home', ago(1))).toHaveLength(2)
  })

  it('only "asked" is a conversation that actually happened', () => {
    const base = noteFollowUp([], 'beforeYes', 'live', ago(9))
    const id = base[0].id
    expect(followedThrough(resolveFollowUp(base, id, 'asked'))).toBe(true)
    expect(followedThrough(resolveFollowUp(base, id, 'not-yet'))).toBe(false)
    expect(followedThrough(resolveFollowUp(base, id, 'differently'))).toBe(false)
    expect(followedThrough(base)).toBe(false)
  })

  it('keeps the guide’s words on the record it writes', () => {
    const noted = noteFollowUp([], 'guide', 'he texts late', ago(0), 'Does anyone know about me?')
    expect(noted[0].words).toBe('Does anyone know about me?')
    expect(noted[0].source).toBe('guide')
  })

  it('writes the talk back into the eleven as it actually went', () => {
    expect(writeBackState(true)).toBe('agree')
    expect(writeBackState(false)).toBe('differ')
  })
})

describe('a read a month old', () => {
  const read = { at: ago(READ_STALE_DAYS), answers: {} }

  it('is asked about after a month, not before', () => {
    expect(readIsStale({ at: ago(READ_STALE_DAYS - 1), answers: {} }, NOW)).toBe(false)
    expect(readIsStale(read, NOW)).toBe(true)
  })

  it('goes quiet for another month once she says it still stands', () => {
    expect(readIsStale({ ...read, checkedAt: ago(2) }, NOW)).toBe(false)
    expect(readIsStale({ ...read, checkedAt: ago(READ_STALE_DAYS) }, NOW)).toBe(true)
  })
})
