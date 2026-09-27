import { getStore } from '@netlify/blobs'
import { failed } from '../shared/ops'
import { readJson } from '../shared/body'
import { CODE, mint, normalise } from '../shared/code'
import { day } from '../shared/day'
import { isFounder, notFounder } from '../shared/founder'
import { overHourlyCap, rateLimited } from '../shared/limit'
import { stamp } from '../shared/record'
import { COUNTRIES, GENDERS, REACH, SCENES, SCENE_COUNTRY } from '../shared/vocab'

/**
 * The introduction list: a name put down, by hand, for a serious introduction.
 *
 * Niyyah was started so that serious Somali singles could meet each other and
 * move toward marriage. Two women signed up for exactly that through the old
 * door; the door was deleted on 2026-09-24 as "a 40/40 goal with nobody in
 * it", and the weekly sweep then took the only way to reach them
 * (docs/DECISIONS.md Part 22). This is the smallest thing that keeps the
 * promise those two women acted on: one route that writes down who wants an
 * introduction and how to reach them, so that the founder can make
 * introductions by hand — one at a time, with both people's yes before either
 * hears the other's name (docs/PRODUCT.md, "The introduction pilot").
 *
 * What is written, and why only this:
 *
 *  - **A way to reach her**, an email or a phone number, as she typed it.
 *    Without it a name on the list means nothing.
 *  - **Her first name**, if she gives one, so the founder's first message is
 *    addressed to a person. Optional.
 *  - **Woman or man; her city, and its country** (or the country she names,
 *    when she is somewhere else); **how far she would go**. Whether two people
 *    could be introduced at all is a question of these four and nothing else
 *    the product could ask; the rest is the founder's conversation with each
 *    of them, by hand, before any introduction.
 *  - **The day.**
 *
 * What is refused, by shape: her map, her answers, her read, anything from the
 * eleven, her age, a photo, a sentence about what she wants. The list is not a
 * profile and nothing here ranks anyone (docs/PRODUCT.md §6). Nothing on it is
 * joined to her map code or her install id: the key is a code minted here and
 * held on her phone, so that she can take her name off (DELETE), and nothing
 * else opens it.
 *
 * Nobody is enrolled by using anything else. A finished read, eleven or map
 * is not interest in meeting someone (docs/DECISIONS.md Part 22): the only way
 * onto this list is this POST, from the screen that says what it is for.
 *
 * Tier 4, like a safety report (docs/PRIVACY.md): the founder reads the list
 * whole, behind the key, and no other route returns a record. The weekly
 * sweep never opens this store (netlify/functions/sweep.ts): a name stays
 * until its owner takes it off, or the founder does at her request.
 */

/** A contact, a name, a side, a city, a country and a reach is the largest thing anyone can send. */
const MAX_BODY = 2_048
/** An email or a phone number: long enough for any real one, short enough that nothing else fits. */
const MAX_CONTACT = 200
const MAX_NAME = 40
/**
 * Names put down in one hour, from everyone. Thirty real people do not join
 * in an hour at this stage; a circuit breaker, not a member limit
 * (netlify/shared/limit.ts).
 */
const DEFAULT_HOURLY_CAP = 60
/** Names taken off in one hour, from everyone: the read-cap shape from keep.ts, since this deletes by a guessed code. */
const DEFAULT_FORGET_CAP = 600

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

/**
 * Could this reach anyone at all? An `@` with a dotted domain after it, or at
 * least seven digits. The phone asks more carefully (src/lib/contact.ts); the
 * server refuses only what could never work, so a typo is not stored as a
 * person.
 */
export function reachable(raw: string): boolean {
  if (raw.includes('@')) {
    const parts = raw.split('@')
    if (parts.length !== 2 || !parts[0] || /\s/.test(raw)) return false
    const dot = parts[1].lastIndexOf('.')
    return dot > 0 && parts[1].length - dot > 2
  }
  return /^[+()\-.\s\d]+$/.test(raw) && (raw.match(/\d/g) ?? []).length >= 7
}

/** A named city knows its country; somewhere else has to be told one. Null when she cannot be placed. */
export function countryOf(scene: string, told: unknown): string | null {
  if (scene !== 'other') return SCENE_COUNTRY[scene] ?? null
  return typeof told === 'string' && COUNTRIES.has(told) ? told : null
}

export default async function handler(req: Request) {
  const store = getStore('introductions')

  // ── The founder's list ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!isFounder(req)) return notFounder()
    try {
      const { blobs } = await store.list()
      const people: (Introduction & { code: string })[] = []
      let skipped = 0
      for (const { key } of blobs) {
        // One record that cannot be read costs that record, never the list.
        try {
          const record = (await store.get(key, { type: 'json' })) as Introduction | null
          if (record && typeof record.contact === 'string') people.push({ ...record, code: key })
          else skipped += 1
        } catch {
          skipped += 1
        }
      }
      people.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
      // By city and side: the recruitment numbers docs/PRODUCT.md's milestone
      // is read against. Not floored — the records are returned whole above,
      // and this is the founder's own list.
      const counts: Record<string, { women: number; men: number }> = {}
      for (const p of people) {
        const c = (counts[p.scene] ??= { women: 0, men: 0 })
        c[p.gender === 'woman' ? 'women' : 'men'] += 1
      }
      // Never cached: every row is a way to reach a real person.
      return Response.json({ people, counts, total: people.length, skipped }, { headers: { 'Cache-Control': 'no-store' } })
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

  // ── Putting a name down ───────────────────────────────────────────────────
  if (req.method !== 'POST') return Response.json({ error: 'GET, POST or DELETE only' }, { status: 405 })

  const body = await readJson<{ contact?: unknown; firstName?: unknown; gender?: unknown; scene?: unknown; country?: unknown; reach?: unknown }>(req, MAX_BODY)
  if (body instanceof Response) return body

  const contact = typeof body.contact === 'string' ? body.contact.trim() : ''
  if (!contact || contact.length > MAX_CONTACT || !reachable(contact)) return Response.json({ error: 'bad_contact' }, { status: 400 })
  const gender = typeof body.gender === 'string' && GENDERS.has(body.gender) ? (body.gender as Introduction['gender']) : null
  if (!gender) return Response.json({ error: 'bad_gender' }, { status: 400 })
  const scene = typeof body.scene === 'string' && SCENES.has(body.scene) ? body.scene : null
  if (!scene) return Response.json({ error: 'bad_scene' }, { status: 400 })
  const country = countryOf(scene, body.country)
  if (!country) return Response.json({ error: 'bad_country' }, { status: 400 })
  // Silence means her city. The product never assumes anyone would move.
  const told = body.reach === undefined ? 'city' : body.reach
  if (typeof told !== 'string' || !REACH.has(told)) return Response.json({ error: 'bad_reach' }, { status: 400 })
  const reach = told as Introduction['reach']
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, MAX_NAME) : ''

  // Bounded, like every public write — after validation, so a bad body spends nothing.
  if (await overHourlyCap('introduce', DEFAULT_HOURLY_CAP)) return rateLimited()

  const record: Introduction = {
    contact,
    ...(firstName ? { firstName } : {}),
    gender,
    scene,
    country,
    reach,
    at: day(),
  }
  try {
    // Onto a code nobody holds: a collision costs a retry, never a person
    // (netlify/shared/code.ts).
    const code = await mint((c, v) => store.setJSON(c, v, { onlyIfNew: true }), stamp(record))
    if (!code) {
      await failed('introduce', 'every minted code collided')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    // Said only once the record is there: the screen shows "you're on the
    // list" on this answer and on nothing else.
    return Response.json({ saved: true, code })
  } catch (err) {
    await failed('introduce', 'write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
