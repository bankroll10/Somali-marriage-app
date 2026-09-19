import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STALE_DAYS, answeredOf, clearAllDrafts, clearDraft, isStale, loadDraft, resumeIndex, saveDraft } from './draft'

/**
 * A draft is an obstacle removed, not a hook. These pin both halves: that it
 * gives her answers back, and that it cannot quietly grow into a reminder.
 */

function installStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  })
  return store
}

let store: Map<string, string>
beforeEach(() => {
  store = installStorage()
})
afterEach(() => vi.unstubAllGlobals())

const DAY = 24 * 60 * 60 * 1000

describe('a part-finished instrument', () => {
  it('gives back exactly what was answered', () => {
    saveDraft('read', { a: '1', b: '2' }, 'woman')
    expect(loadDraft('read')?.answers).toEqual({ a: '1', b: '2' })
    expect(loadDraft('read')?.gender).toBe('woman')
  })

  it('keeps the two instruments apart', () => {
    saveDraft('read', { a: '1' }, 'woman')
    saveDraft('eleven', { z: '9' }, 'man')
    expect(loadDraft('read')?.answers).toEqual({ a: '1' })
    expect(loadDraft('eleven')?.answers).toEqual({ z: '9' })
    clearDraft('read')
    expect(loadDraft('read')).toBeNull()
    expect(loadDraft('eleven')).not.toBeNull()
  })

  it('records a day and never a time', () => {
    saveDraft('read', { a: '1' }, 'woman', new Date('2026-09-19T21:43:07.918Z'))
    expect(loadDraft('read')?.at).toBe('2026-09-19')
  })

  it('expires, and clears itself on the way past', () => {
    const at = new Date('2026-08-01T00:00:00.000Z')
    saveDraft('read', { a: '1' }, 'woman', at)
    const justInside = at.getTime() + (STALE_DAYS - 1) * DAY
    expect(loadDraft('read', justInside)).not.toBeNull()
    const past = at.getTime() + (STALE_DAYS + 1) * DAY
    expect(loadDraft('read', past)).toBeNull()
    // Gone from storage, not merely hidden — nothing sweeps this.
    expect(store.size).toBe(0)
  })

  it('treats an empty answer set as nothing to resume', () => {
    saveDraft('read', {}, 'woman')
    expect(loadDraft('read')).toBeNull()
    expect(store.size).toBe(0)
  })

  it('survives storage being unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    })
    expect(() => saveDraft('read', { a: '1' }, 'woman')).not.toThrow()
    expect(loadDraft('read')).toBeNull()
  })

  it('ignores a corrupted store rather than throwing on the way into a screen', () => {
    store.set('niyyah.draft.v1', 'not json')
    expect(loadDraft('read')).toBeNull()
  })

  it('clears everything for Start over', () => {
    saveDraft('read', { a: '1' }, 'woman')
    saveDraft('eleven', { z: '9' }, 'man')
    clearAllDrafts()
    expect(loadDraft('read')).toBeNull()
    expect(loadDraft('eleven')).toBeNull()
  })

  it('is stale by its own clock, not by a missing date', () => {
    expect(isStale({ answers: { a: '1' }, gender: 'woman', at: 'nonsense' })).toBe(true)
  })
})

describe('where she picks up', () => {
  const ids = ['q1', 'q2', 'q3', 'q4']

  it('is the first unanswered question, not the count', () => {
    // She answered 1, 2 and 4 — out of order is possible after an edit to the
    // question set. A count would send her to q4 and skip q3 for ever.
    expect(resumeIndex(ids, { q1: 'a', q2: 'a', q4: 'a' })).toBe(2)
  })

  it('lands on the last question when everything known is answered', () => {
    expect(resumeIndex(ids, { q1: 'a', q2: 'a', q3: 'a', q4: 'a' })).toBe(3)
  })

  it('counts only answers the instrument still asks for', () => {
    // A question that was cut should not inflate "you answered 9 of 11".
    expect(answeredOf(ids, { q1: 'a', q2: 'a', retired: 'a' })).toBe(2)
  })
})
