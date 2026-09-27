import { createHash } from 'node:crypto'
import fc from 'fast-check'
import { buildRead } from '../../src/lib/read'
import { buildBeforeYes } from '../../src/lib/beforeYes'
import { coupleReading, type Joint } from '../../src/lib/couple'
import { readQuestions } from '../../src/data/read'
import { beforeYesTopics, STATES } from '../../src/data/beforeYes'
import { modes } from '../../src/data/coach'
import * as coach from '../../src/lib/coach'
import type { CoachContext } from '../../src/data/coach'
import { readAnswers, beforeYesAnswers } from '../support/arbitrary'
import { contextFor, registry } from './scripts'
import type { Gender } from '../../src/types'

/**
 * A fingerprint of every piece of relationship content (docs/GUIDE-EVAL.md,
 * "Relationship judgment", F): every script, every Read question and option,
 * every Eleven topic and state, every fixed Guide reply and voice answer, and
 * what the Read and the Eleven say across a fixed sample of answers.
 *
 * ./lock.test.ts fails when one changes and content.lock.json was not updated
 * with it. Updating marks the changed entries `judged: false` (the live judge
 * reads them next: tests/judgment-live.test.ts) and `somaliReview: 'pending'`
 * (the sessions' queue: docs/PROTOCOL.md). So a change to relationship content
 * cannot pass silently: it is at least a line in a diff that says who has not
 * yet read it.
 */

export interface LockEntry {
  sha: string
  judged: boolean
  somaliReview: 'pending' | 'done'
}

const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16)
const GENDERS: Gender[] = ['woman', 'man']
/** Fixed, so the sample is the same on every run and every machine. */
const SEED = 20260926

export function fingerprints(): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (key: string, value: unknown) => (out[key] = sha(typeof value === 'string' ? value : JSON.stringify(value)))

  for (const e of registry()) put(`script ${e.id}`, [e.words, e.why, e.tells])

  for (const g of GENDERS) {
    for (const q of readQuestions(g)) put(`read question ${q.id}:${g}`, q)
    const reads = fc.sample(readAnswers(g), { numRuns: 200, seed: SEED }).map((a) => buildRead(a, g)!)
    for (const band of ['early', 'strong', 'mixed', 'thin', 'caution']) {
      const said = [...new Set(reads.filter((r) => r.band === band).flatMap((r) => [r.headline, r.summary, r.careful ?? '', r.caution ?? '', ...(r.watch ?? [])]))].sort()
      put(`read says ${band}:${g}`, said)
    }

    for (const t of beforeYesTopics(g)) put(`eleven topic ${t.id}:${g}`, { label: t.label, prompt: t.prompt, why: t.why })
    const sheets = fc.sample(beforeYesAnswers(g), { numRuns: 200, seed: SEED }).map((a) => buildBeforeYes(a, g)!)
    put(`eleven says:${g}`, [...new Set(sheets.flatMap((r) => [r.headline, r.summary]))].sort())
    const kinds: Joint[] = ['both-agree', 'both-settled', 'both-not-talked', 'one-thinks-talked', 'differ-somewhere', 'unknown-somewhere']
    put(`couple says:${g}`, kinds.map((k) => coupleReading(Object.fromEntries(beforeYesTopics(g).map((t) => [t.id, k])), g)))

    const ctx = contextFor(g)
    for (const m of modes) {
      put(`voice ${m.id}:${g}`, [m.greeting(ctx), m.fallback(ctx), ...m.intents.map((i) => i.respond(ctx))])
    }
    for (const [name, value] of Object.entries(coach))
      if (typeof value === 'function' && /[a-z]Reply$/.test(name) && value.length === 1 && name !== 'localReply')
        put(`guide ${name}:${g}`, (value as (c: CoachContext) => string)(ctx))
  }
  put('eleven states', STATES)
  for (const [name, value] of Object.entries(coach)) if (typeof value === 'string' && name.endsWith('_REPLY')) put(`guide ${name}`, value)
  return out
}

/** The lock after an update: unchanged entries keep their status; changed and new ones wait to be read. */
export function updated(previous: Record<string, LockEntry>, now: Record<string, string>): Record<string, LockEntry> {
  const out: Record<string, LockEntry> = {}
  for (const key of Object.keys(now).sort()) {
    const was = previous[key]
    out[key] = was && was.sha === now[key] ? was : { sha: now[key], judged: false, somaliReview: 'pending' }
  }
  return out
}

/** What differs between the lock and the content, in words. */
export function drift(lock: Record<string, LockEntry>, now: Record<string, string>): string[] {
  const out: string[] = []
  for (const key of Object.keys(now)) if (!lock[key]) out.push(`new: ${key}`)
  else if (lock[key].sha !== now[key]) out.push(`changed: ${key}`)
  for (const key of Object.keys(lock)) if (!(key in now)) out.push(`gone: ${key}`)
  return out
}
