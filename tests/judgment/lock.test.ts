import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { drift, fingerprints, updated, type LockEntry } from './lock'

/**
 * The content lock (docs/GUIDE-EVAL.md, "Relationship judgment", F).
 *
 * Changing any relationship content fails this until the lock is updated on
 * purpose:
 *
 *   UPDATE_JUDGMENT_LOCK=1 npx vitest run tests/judgment/lock.test.ts
 *
 * which marks what changed as not yet judged and not yet read by the Somali
 * sessions. The diff to content.lock.json is then the review queue.
 */

const LOCK = new URL('./content.lock.json', import.meta.url)
const UPDATE = process.env.UPDATE_JUDGMENT_LOCK === '1'

describe('the content lock', () => {
  const now = fingerprints()

  it('fingerprints every kind of relationship content', () => {
    const kinds = new Set(Object.keys(now).map((k) => k.split(' ')[0]))
    for (const k of ['script', 'read', 'eleven', 'couple', 'voice', 'guide']) expect(kinds, k).toContain(k)
    expect(Object.keys(now).length).toBeGreaterThan(150)
  })

  it('is deterministic: the same content fingerprints the same', () => {
    expect(fingerprints()).toEqual(now)
  })

  it('matches the content: a change to relationship content is not silent', () => {
    const previous: Record<string, LockEntry> = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : {}
    if (UPDATE) {
      writeFileSync(LOCK, `${JSON.stringify(updated(previous, now), null, 2)}\n`)
      return
    }
    expect(
      drift(previous, now),
      'Relationship content changed. Run UPDATE_JUDGMENT_LOCK=1 npx vitest run tests/judgment/lock.test.ts; what changed is marked for the judge and the Somali sessions (docs/GUIDE-EVAL.md).',
    ).toEqual([])
  })

  it('marks a changed entry as unread, and keeps an unchanged one as it was', () => {
    const before: Record<string, LockEntry> = {
      a: { sha: '1', judged: true, somaliReview: 'done' },
      b: { sha: '2', judged: true, somaliReview: 'done' },
    }
    const after = updated(before, { a: '1', b: '3', c: '4' })
    expect(after.a).toEqual(before.a)
    expect(after.b).toEqual({ sha: '3', judged: false, somaliReview: 'pending' })
    expect(after.c).toEqual({ sha: '4', judged: false, somaliReview: 'pending' })
  })
})
