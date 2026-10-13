import { getStore } from '@netlify/blobs'
import { failed } from '../shared/ops'
import { CODE, normalise } from '../shared/code'
import { day } from '../shared/day'
import { isFounder, notFounder } from '../shared/founder'
import { overHourlyCap, rateLimited } from '../shared/limit'

/**
 * The introduction list: a name put down, by hand, for a serious introduction.
 *
 * **New requests are closed (release R3, 2026-10-13).** `POST` answers 410
 * `{ error: 'closed' }` before it reads a body, checks a cap, mints a code or
 * opens a store, so a refused request writes nothing and spends nothing. Founder-led
 * introduction intake is no longer the operating model, and matching is not
 * available. Everything that lets a person or the founder deal with an
 * earlier request is unchanged: `GET` (the founder's list), `DELETE` (a name
 * comes off by its code, from any phone), the 180-day lifetime and the weekly
 * sweep (netlify/functions/sweep.ts). The text below describes what a request
 * made while intake was open holds, and why; it is history, not a promise
 * that anything will be done with it.
 *
 * A request already running under the previous function when R3 deployed may
 * have completed afterwards. Such a request was accepted under the old promise
 * and is a possible late acceptance; it is not evidence that the promised
 * introduction process was carried out for that person. Nothing here checks
 * whether any process followed it.
 *
 * Niyyah was started so that serious Somali singles could meet each other and
 * move toward marriage. Two women signed up for exactly that through the old
 * door; the door was deleted on 2026-09-24 as a goal with nobody in it, and
 * the weekly sweep then took the only way to reach them (docs/DECISIONS.md
 * Part 22). Introductions between serious Somali singles are a foundational
 * capability of Niyyah (decision 26), restored one staged gate at a time
 * (Part 23). This is the gate before the first introduction: one route that
 * writes down who wants an introduction and how to reach them.
 *
 * What is written, and why only this:
 *
 *  - **A way to reach her**, an email or a phone number, as she typed it.
 *    Without it a name on the list means nothing.
 *  - **Her first name**, if she gives one, so the founder's first message is
 *    addressed to a person. Optional.
 *  - **Woman or man; her city, and its country** (or the country she names,
 *    when she is somewhere else); **how far she would go**.
 *  - **The day.**
 *
 * These say who to call, not who fits. Whether two people could be
 * introduced is decided by the founder, by hand, after a screening
 * conversation with each of them (decision 29); nothing here matches anyone.
 * Introductions are beginning in Minneapolis–St. Paul (decision 28); a name
 * from anywhere else is accepted and kept for later, and the screen says so.
 *
 * What is refused, by shape: her map, her answers, her read, anything from the
 * eleven, her age, a photo, a sentence about what she wants. The list is not a
 * profile and nothing here ranks anyone (docs/PRODUCT.md §6). Nothing on it is
 * joined to her map code or her install id: the key is a code minted here and
 * held on her phone, so that she can take her name off (DELETE), and nothing
 * else opens it.
 *
 * Nobody is enrolled by using anything else. A finished read, eleven or map
 * is not interest in meeting someone (decision 25): the only way onto this
 * list is this POST, from the screen that says what it is for.
 *
 * **A name is kept at most 180 days** (decision 32). The weekly sweep removes
 * it at the last run before its `until` (netlify/functions/sweep.ts), and the
 * founder's list stops showing it on that day even if a sweep failed. Someone
 * who still wants an introduction puts their name down again; nothing reminds
 * anyone. Sooner if she takes it off, or the founder does at her request.
 *
 * Tier 4, like a safety report (docs/PRIVACY.md): the founder reads the list
 * whole, behind the key, and no other route returns a record.
 */

/** Names taken off in one hour, from everyone: the read-cap shape from keep.ts, since this deletes by a guessed code. */
const DEFAULT_FORGET_CAP = 600

/** How long a name stays on the list, at most, from the day it was put down (decision 32). */
export const LIST_DAYS = 180

const DAY = 24 * 60 * 60 * 1000

/**
 * The day a name put down on `at` comes off: `at` plus 180 days. Null when
 * `at` is not a day this route could have written.
 */
export function removeBy(at: unknown): string | null {
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(at)) return null
  const ms = Date.parse(`${at}T00:00:00Z`)
  return Number.isNaN(ms) ? null : day(ms + LIST_DAYS * DAY)
}

export interface Introduction {
  contact: string
  firstName?: string
  gender: 'woman' | 'man'
  scene: string
  country: string
  reach: 'city' | 'country'
  at: string
}

/** Every key a stored record may carry, so a test can hold the shape (tests/introduce-function.test.ts). */
export const INTRODUCTION_KEYS = ['contact', 'firstName', 'gender', 'scene', 'country', 'reach', 'at', 'v'] as const

export default async function handler(req: Request) {
  // ── Closed ────────────────────────────────────────────────────────────────
  // Before the store is opened, a body is read, a cap is spent or a code is
  // minted: nothing about a refused request is kept. 410, not 503 or 4xx of
  // another kind, because an older page still open on someone's phone maps
  // every unrecognised status to "That did not reach us, so nothing is saved",
  // which is true, where 503 would send her to write "and it goes on by hand".
  if (req.method === 'POST') {
    return Response.json({ error: 'closed' }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
  }

  const store = getStore('introductions')

  // ── The founder's list ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!isFounder(req)) return notFounder()
    try {
      const { blobs } = await store.list()
      const today = day()
      const people: (Introduction & { code: string; until: string })[] = []
      let skipped = 0
      // Past its 180 days and still here only because a sweep has not run:
      // counted, never shown (decision 32).
      let lapsed = 0
      for (const { key } of blobs) {
        // One record that cannot be read costs that record, never the list.
        try {
          const record = (await store.get(key, { type: 'json' })) as Introduction | null
          const until = removeBy(record?.at)
          if (!record || typeof record.contact !== 'string' || !until) skipped += 1
          else if (today >= until) lapsed += 1
          else people.push({ ...record, code: key, until })
        } catch {
          skipped += 1
        }
      }
      people.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
      // By city and side, for the founder's own reading of where names are.
      // Not floored — the records are returned whole above, and this is the
      // founder's own list. Never shown to anyone else: there is no public
      // count (decision 27).
      const counts: Record<string, { women: number; men: number }> = {}
      for (const p of people) {
        const c = (counts[p.scene] ??= { women: 0, men: 0 })
        c[p.gender === 'woman' ? 'women' : 'men'] += 1
      }
      // Never cached: every row is a way to reach a real person.
      return Response.json({ people, counts, total: people.length, skipped, lapsed }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (err) {
      await failed('introduce', 'list failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Taking a name off ─────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const code = normalise(new URL(req.url).searchParams.get('code') ?? '')
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    if (await overHourlyCap('introduce-forget', DEFAULT_FORGET_CAP)) return rateLimited()
    try {
      if (!(await store.getMetadata(code))) return Response.json({ error: 'not_found' }, { status: 404 })
      await store.delete(code)
      return Response.json({ removed: true })
    } catch (err) {
      await failed('introduce', 'remove failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  return Response.json({ error: 'GET or DELETE only' }, { status: 405 })
}
