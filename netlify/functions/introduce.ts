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
 *  - **That she confirmed she is an adult** — one boolean, sent by the screen
 *    she tapped it on and required here, so that no request reaches the list
 *    without the affirmation the screen asks for (docs/BATCH-01-PLAN.md D5).
 *    Never an age, a birth date or a document.
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
 * joined to her map code or her install id.
 *
 * **The code is hers before the record exists.** Until 2026-09-27 this route
 * minted a code per POST, so a request whose answer was lost — a timeout
 * after the write landed — was told "nothing is saved", and the retry it
 * invited wrote a second record the phone could never take off. Now the
 * phone mints the code and sends it (src/lib/introduce.ts); the write is
 * conditional on the key being new, and the same request under the same code
 * is answered `again: true` with the record's own dates rather than written
 * twice. The guarantee is per code: a different code, or a different phone,
 * is a different record; the contact is never indexed. A body without a code
 * — an older client — is still minted for here. A different request under a
 * code that exists is refused (409), never written over: the person is asked
 * on the screen what she wants done.
 *
 * **Withdrawal is durable, and the marker is the authority.** `DELETE` writes
 * `withdrawn/<code>/<day>` — the day it happened, and nothing else — before
 * it deletes the record, and a POST that finds any marker under the code
 * refuses (410) and removes anything it wrote. So a delayed request cannot
 * land after Forget me or "Take my name off" has been answered. A delete can
 * fail after the marker is there — the withdrawal's own, or the late
 * request's cleanup — and then a record sits under a marked code. That
 * record is withdrawn all the same: the founder's list neither shows nor
 * counts it, a retry under the code is refused and tries the delete again,
 * and the sweep deletes it on any run and only then the marker.
 *
 * **Markers are immutable, one key per withdrawal per day.** Netlify Blobs
 * has no conditional delete (`delete(key)` takes no version; @netlify/blobs
 * 11.0.3), so no sequence of "read the marker, then delete it" can be made
 * safe against a withdrawal that lands between the two — and until
 * 2026-09-27 the sweep did exactly that under one key per code, and could
 * take a fresh withdrawal's marker on the strength of an old read. Now each
 * withdrawal writes its own key, dated in the key itself; the sweep deletes
 * a marker only by a key whose own day is old enough, and a withdrawal that
 * lands meanwhile is a different key that nothing deletes. A marker is kept
 * at least two full days (WITHDRAWN_DAYS) and removed by the first weekly
 * sweep after that: between two and eight days in practice, longer if a run
 * fails or the record under it could not be deleted. Within that window
 * nothing can be saved under the code; after it a code could in principle be
 * reused, which is why no screen says "never". A guessed-code DELETE writes a
 * marker too; that is bounded by the forget cap and swept, and it carries
 * nobody.
 *
 * **Reads are strong.** The store is opened with `consistency: 'strong'`:
 * the conflict read after a refused conditional write, the marker checks and
 * the delete's existence check all depend on seeing the latest write, and
 * the SDK's edge path is eventually consistent (@netlify/blobs README).
 *
 * **One removal day** (decision 32, docs/BATCH-01-PLAN.md D3). A name is
 * kept at most 180 days; the weekly sweep runs on Sundays, so the day it
 * goes is the Sunday on or before its 180th day — `removeOn`. The founder's
 * list stops showing it on that day even if a sweep failed; the phone shows
 * the same day, from this server's answer, as the day its removal is
 * scheduled. Scheduled is not deleted: a failed Sunday is caught by /health
 * and the name goes the Sunday after. Nothing reminds anyone; someone who
 * still wants an introduction puts their name down again.
 *
 * Tier 4, like a safety report (docs/PRIVACY.md): the founder reads the list
 * whole, behind the key, and no other route returns a record.
 */

/** A contact, a name, a side, a city, a country, a reach, a code and a flag is the largest thing anyone can send. */
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

/** How long a name stays on the list, at most, from the day it was put down (decision 32). */
export const LIST_DAYS = 180

/**
 * The least time a withdrawal marker is kept: longer than any request could
 * still be in flight. The weekly sweep removes it on the first run after
 * that, so the real retention is two to eight days, and longer if a run fails
 * or the record under it could not be deleted (netlify/functions/sweep.ts).
 */
export const WITHDRAWN_DAYS = 2

/** The prefix of a withdrawal marker: `withdrawn/<code>/<day>`. Keys under it carry a day and nobody. */
export const WITHDRAWN = 'withdrawn/'

/** Every marker under one code starts with this. */
export const markerPrefix = (code: string) => `${WITHDRAWN}${code}/`
/** The key of the marker for one withdrawal of one code on one day. Immutable once written. */
export const markerKey = (code: string, at: string) => `${markerPrefix(code)}${at}`
/** The code a marker key is under. */
export const markerCode = (key: string) => key.slice(WITHDRAWN.length).split('/')[0]
/** The day in a marker key, or null when the key carries none this route could have written. */
export function markerDay(key: string): string | null {
  const at = key.slice(WITHDRAWN.length).split('/')[1]
  return at && /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : null
}

const DAY = 24 * 60 * 60 * 1000

/**
 * The day a name put down on `at` is scheduled to go: the Sunday (00:00 UTC,
 * when the sweep runs) on or before `at` plus 180 days. Null when `at` is not
 * a day this route could have written. The client's twin is `removeOnOf` in
 * src/lib/introduce.ts, held equal by tests/vocab-sync.test.ts.
 */
export function removeOn(at: unknown): string | null {
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(at)) return null
  const ms = Date.parse(`${at}T00:00:00Z`)
  if (Number.isNaN(ms)) return null
  const last = new Date(ms + LIST_DAYS * DAY)
  return day(last.getTime() - last.getUTCDay() * DAY)
}

export interface Introduction {
  contact: string
  firstName?: string
  gender: 'woman' | 'man'
  scene: string
  country: string
  reach: 'city' | 'country'
  /** She confirmed she is 18 or older, on the screen that sent this. Absent on records from before 2026-09-27's batch. */
  adult?: true
  at: string
}

/** Every key a stored record may carry, so a test can hold the shape (tests/introduce-function.test.ts). */
export const INTRODUCTION_KEYS = ['contact', 'firstName', 'gender', 'scene', 'country', 'reach', 'adult', 'at', 'v'] as const

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

/** The same request, field for field — what makes a retry a retry and not a second person. */
export function sameRequest(a: Introduction, b: Introduction): boolean {
  return (
    a.contact === b.contact &&
    (a.firstName ?? '') === (b.firstName ?? '') &&
    a.gender === b.gender &&
    a.scene === b.scene &&
    a.country === b.country &&
    a.reach === b.reach &&
    a.adult === b.adult
  )
}

/** What the phone is told, and keeps: the code, and the server's own two days. */
const receipt = (code: string, at: string, again = false) =>
  Response.json({ saved: true, code, at, removeOn: removeOn(at), ...(again ? { again: true } : {}) })

type Store = ReturnType<typeof getStore>

/**
 * Is any withdrawal marker under this code? A list by the code's prefix, on
 * the store opened strong — `list` inherits the store's consistency in the
 * installed SDK (`makeRequest` takes the store's mode when the call names
 * none), so this sees a marker written a moment ago.
 */
const withdrawnAny = async (store: Store, code: string) => (await store.list({ prefix: markerPrefix(code) })).blobs.length > 0

/**
 * A request under a code that carries a withdrawal marker: refused, and
 * whatever sits under the code — this request's own write, or one an earlier
 * cleanup could not remove — is deleted if it can be. When that delete fails
 * the answer is still 410: the marker stands, the founder's list already
 * leaves the record out, and the sweep finishes it. The failure is counted
 * so /health sees it.
 */
async function withdrawn(store: Store, code: string): Promise<Response> {
  try {
    await store.delete(code)
  } catch (err) {
    await failed('introduce', 'a withdrawn record could not be removed; the sweep will', err)
  }
  return Response.json({ error: 'withdrawn' }, { status: 410 })
}

export default async function handler(req: Request) {
  const store = getStore({ name: 'introductions', consistency: 'strong' })

  // ── The founder's list ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!isFounder(req)) return notFounder()
    try {
      const { blobs } = await store.list()
      const today = day()
      const people: (Introduction & { code: string; removeOn: string })[] = []
      let skipped = 0
      // Past its day and still here only because a sweep has not run:
      // counted, never shown (decision 32).
      let lapsed = 0
      // Under a withdrawal marker and still here only because a delete
      // failed: taken off, whatever the store holds. Counted, never shown.
      const marked = new Set(blobs.filter(({ key }) => key.startsWith(WITHDRAWN)).map(({ key }) => markerCode(key)))
      let withdrawn = 0
      for (const { key } of blobs) {
        if (key.startsWith(WITHDRAWN)) continue
        if (marked.has(key)) {
          withdrawn += 1
          continue
        }
        // One record that cannot be read costs that record, never the list.
        try {
          const record = (await store.get(key, { type: 'json' })) as Introduction | null
          const goes = removeOn(record?.at)
          if (!record || typeof record.contact !== 'string' || !goes) skipped += 1
          else if (today >= goes) lapsed += 1
          else people.push({ ...record, code: key, removeOn: goes })
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
      return Response.json({ people, counts, total: people.length, skipped, lapsed, withdrawn }, { headers: { 'Cache-Control': 'no-store' } })
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
      // The marker first, so a request still in flight under this code finds
      // it and refuses (below). Its own key, dated today: a withdrawal on a
      // later day is another key, so the sweep's removal of an old marker can
      // never take the one a fresh withdrawal depends on. A second withdrawal
      // the same day is the same key, and `onlyIfNew` leaves it as it is.
      // Then the record, if there is one; if that delete fails the marker
      // stays, the list leaves the record out, and the sweep or the next
      // withdrawal deletes it.
      const today = day()
      await store.setJSON(markerKey(code, today), { at: today }, { onlyIfNew: true })
      const had = !!(await store.getMetadata(code))
      if (had) await store.delete(code)
      // `removed: false` is not an error: nothing was under the code, and
      // for the marker's days nothing can be put under it. An older client
      // reads a 200 as gone.
      return Response.json({ removed: had })
    } catch (err) {
      await failed('introduce', 'remove failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Putting a name down ───────────────────────────────────────────────────
  if (req.method !== 'POST') return Response.json({ error: 'GET, POST or DELETE only' }, { status: 405 })

  const body = await readJson<{ code?: unknown; contact?: unknown; firstName?: unknown; gender?: unknown; scene?: unknown; country?: unknown; reach?: unknown; adult?: unknown }>(req, MAX_BODY)
  if (body instanceof Response) return body

  // The code the phone holds, when it sends one. Its shape is checked here;
  // whether anything is under it is the conditional write's business.
  const held = body.code === undefined ? null : normalise(body.code)
  if (held !== null && !CODE.test(held)) return Response.json({ error: 'bad_code' }, { status: 400 })
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
  // The affirmation, exactly `true`: not "yes", not 1, not absent. A client
  // from before this gate sends nothing here and is refused — it cannot be
  // told why in words it has, and it must not get through in silence
  // (docs/OPS.md, "Updating an installed app").
  if (body.adult !== true) return Response.json({ error: 'bad_adult' }, { status: 400 })
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
    adult: true,
    at: day(),
  }
  try {
    if (held) {
      // Already taken off under this code — by her, or by Forget me — before
      // this request arrived: nothing is written, the screen is told, and
      // anything an earlier cleanup left under the code is tried again.
      if (await withdrawnAny(store, held)) return withdrawn(store, held)
      const { modified } = await store.setJSON(held, stamp(record), { onlyIfNew: true })
      if (!modified) {
        // Something is under the code. Hers, sent again — or someone else's,
        // or hers with different details. Read back, never written over.
        const existing = (await store.get(held, { type: 'json' })) as Introduction | null
        if (await withdrawnAny(store, held)) return withdrawn(store, held)
        if (!existing) return Response.json({ error: 'withdrawn' }, { status: 410 })
        if (!sameRequest(existing, record)) return Response.json({ error: 'taken' }, { status: 409 })
        return receipt(held, existing.at, true)
      }
      // Written — unless a withdrawal landed between the check above and the
      // write, in which case a marker is there now and this record goes.
      if (await withdrawnAny(store, held)) return withdrawn(store, held)
      return receipt(held, record.at)
    }
    // No code from the phone (a client from before 2026-09-27's batch): onto
    // a code nobody holds. A collision costs a retry, never a person
    // (netlify/shared/code.ts).
    const code = await mint((c, v) => store.setJSON(c, v, { onlyIfNew: true }), stamp(record))
    if (!code) {
      await failed('introduce', 'every minted code collided')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    // Said only once the record is there: the screen shows its receipt on
    // this answer and on nothing else.
    return receipt(code, record.at)
  } catch (err) {
    await failed('introduce', 'write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
