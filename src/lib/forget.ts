import { isStoredCode } from './code'
import { rememberedCode } from './keep'
import { rememberedInstallId } from './progress'
import { confirmWithdrawal, forgetIntro, forgetPending, pendingIntro, rememberedIntro } from './introduce'
import { objectBody, sendRead } from './net'
import { clearProgress, loadProgress } from './storage'

/**
 * Forget me.
 *
 * One action, four deletes and a clean phone. Her kept map and everything
 * chained to it go by her map code; the count of her steps goes by her install
 * code; the eleven she sent him goes by its own couple code; her name on the
 * introduction list goes by the code that list handed this phone; then every
 * key this app ever wrote to this phone is removed. What is left is what was
 * never hers to begin with: a tally with no code in it.
 *
 * The couple code is deleted on its own because the map cascade could not
 * reach it. `createCouple` needs no map code, and the cascade in
 * netlify/functions/keep.ts finds the couple code inside a kept snapshot — so
 * a woman who sent him the eleven, kept nothing, and tapped this was told it
 * was done while both sheets sat on the server for the rest of the ninety
 * days. The introduction code is the same shape: its own key, its own delete,
 * joined to nothing else (src/lib/introduce.ts). An attempt to put her name
 * down whose answer never arrived is sent as a delete too, under the code it
 * went out with (docs/BATCH-01-PLAN.md D2).
 *
 * **A delete is confirmed only by an answer its handler gives**
 * (docs/DECISIONS.md Part 34). Not "any 2xx, or a 404": Netlify's catch-all
 * answers 200 with the app's own page for a path with no function behind it, a
 * body can be cut after the status was sent, and a 404 can come from anything
 * between her and the function. Each handler's own answers are the two that
 * confirm — keep and progress `200 {forgotten: true}`, couple `200 {ok: true}`,
 * and for all three `404 {error: 'not_found'}`, which says only that nothing was
 * under that code. Everything else is *unconfirmed*: no claim about whether the
 * server removed anything. The local wipe happens whatever the server said: her
 * phone is hers, and it is the one thing we can guarantee.
 *
 * All but the codes (docs/PRIVACY.md). What a delete did not confirm is kept —
 * the codes and nothing else, none of her answers — **one key per code**
 * (`niyyah.forget.recovery.v1.<kind>.<CODE>`, value "1"), so adding one code and
 * removing another are independent operations and cannot overwrite each other,
 * in this page or across tabs. The next Forget me sends them first, the app
 * sends them again every time it opens, and Trust shows her the codes she can
 * use. When the browser will not save a key the page holds that code, until it
 * is reloaded.
 *
 * **The older record is an import source, never written.** Builds before this one
 * kept the codes in one key, `niyyah.forget.pending.v1`, and rewrote it from only
 * the fields they knew, even when a delete failed (docs/DECISIONS.md Part 35).
 * This build reads that key — at launch, before every Forget me, and when another
 * tab changes it (from the event's old and new values) — copies every valid code
 * into recovery keys, and **never writes or removes it**. A code that is still
 * mentioned there can therefore be imported and asked again on a later launch,
 * for as long as that record stays; each such request is redundant, not a loss,
 * and nothing here claims it is made exactly once.
 */

const KEEP = '/.netlify/functions/keep'
const PROGRESS = '/.netlify/functions/progress'
const COUPLE = '/.netlify/functions/couple'

/**
 * The key an older build wrote its pending forget under, as one record. This
 * build only **reads** it (`importLegacy`): it never writes, rewrites or removes
 * it, whatever it holds.
 */
const LEGACY_KEY = 'niyyah.forget.pending.v1'

/**
 * One key per unresolved code: `<prefix>.<kind>.<CODE>`, value "1". The key's
 * existence is the record; there is no timestamp, contact, name or answer. Older
 * builds never read, write or remove keys they do not know (docs/DECISIONS.md Part 35).
 */
const RECOVERY_PREFIX = 'niyyah.forget.recovery.v1'
const recoveryKey = (kind: Kind, code: string) => `${RECOVERY_PREFIX}.${kind}.${code}`

/** The four things Forget me deletes, each by a code of its own. */
type Kind = 'maps' | 'installs' | 'pairs' | 'intros'
const KINDS: Kind[] = ['maps', 'installs', 'pairs', 'intros']

/** Codes, and nothing else, for each kind. */
type Held = Record<Kind, string[]>
const none = (): Held => ({ maps: [], installs: [], pairs: [], intros: [] })

/**
 * What a failed forget still has to delete, as `pendingForget` reports it: the
 * codes of each kind not yet confirmed gone, a kind with none left out.
 */
export interface Pending {
  maps?: string[]
  installs?: string[]
  pairs?: string[]
  intros?: string[]
}

/**
 * The older record, as any earlier build wrote it: the base build one slot per
 * kind and a single `intro`; 07D an `intros` list (and the historical `intro` /
 * `introPending`); 07E a first code in the slot and the rest in `more*`.
 */
interface Stored {
  code?: unknown
  moreCodes?: unknown
  id?: unknown
  moreIds?: unknown
  pair?: unknown
  morePairs?: unknown
  intros?: unknown
  intro?: unknown
  introPending?: unknown
}

/** Every key this app writes. Kept in one place so nothing is left behind. */
export const LOCAL_KEYS = [
  'niyyah.intake.v1',
  'niyyah.keep.code.v1',
  // The revision and first-keep key that ride beside the code (src/lib/keep.ts).
  'niyyah.keep.rev.v1',
  'niyyah.keep.once.v1',
  'niyyah.install.v1',
  'niyyah.via.v1',
  // Her name on the introduction list: the code it is under, and the day
  // (src/lib/introduce.ts). Never the contact.
  'niyyah.intro.v1',
  // An attempt to put it down whose answer never came: its code and the day.
  'niyyah.intro.pending.v1',
  // A place at the door not yet sent, from before 2026-09-24, when the door
  // was removed. Nothing writes it now; it held a way to reach her.
  'niyyah.waitlist.queue.v1',
  // The session event log an older version kept here. Nothing writes it now.
  'niyyah.events.v1',
  // A read or an eleven she was part-way through — see src/lib/draft.ts.
  // Forget me promises the phone is cleared, and this is on the phone.
  'niyyah.draft.v1',
  // The coded link this device is part-way through — see src/lib/entry.ts.
  'niyyah.entry.v1',
  // Receipts from before 2026-09-23, when forget me still withdrew reports.
  // Nothing writes it now; it is cleared from phones that still hold it.
  'niyyah.reports.v1',
]

/** What one delete came to. `failed` is *unconfirmed*: it says nothing about whether the server removed the record. */
type Answer = 'removed' | 'nothing' | 'failed'

/**
 * Read a keep, progress or couple DELETE's answer, and as nothing else:
 * exactly 200 with a JSON object whose `field` is `true` (the handler's own
 * answer; its other fields are ignored), or exactly 404 with a JSON object whose
 * `error` is `not_found` (nothing was under the code). A 200 with any other
 * body, any other 2xx, a 404 with any other body, 400, 5xx and no answer are
 * all `failed`. A 404 confirms absence of *this* code and nothing more: the map
 * handler runs no cascade for it, and the couple has a delete of its own.
 */
const answerOf = (field: 'forgotten' | 'ok') => async (res: Response): Promise<Answer> => {
  if (res.status === 200) return (await objectBody(res))?.[field] === true ? 'removed' : 'failed'
  if (res.status === 404) return (await objectBody(res))?.error === 'not_found' ? 'nothing' : 'failed'
  return 'failed'
}

const del = (url: string, field: 'forgotten' | 'ok') => sendRead<Answer>(url, { method: 'DELETE' }, answerOf(field), 'failed')

/** Send one code's delete. The introduction list has its own answers (src/lib/introduce.ts); the other three share `answerOf`. */
async function ask(kind: Kind, code: string): Promise<boolean> {
  const q = encodeURIComponent(code)
  const answer =
    kind === 'maps' ? await del(`${KEEP}?code=${q}`, 'forgotten') : kind === 'installs' ? await del(`${PROGRESS}?id=${q}`, 'forgotten') : kind === 'pairs' ? await del(`${COUPLE}?code=${q}`, 'ok') : await confirmWithdrawal(code)
  return answer !== 'failed'
}

export interface Forgotten {
  /** The kept map and everything under its code — confirmed gone, or true when there was none. False means *unconfirmed*, not necessarily still there. */
  map: boolean
  /** The count of her steps — confirmed, or true when this phone never had a code. */
  progress: boolean
  /** The eleven she sent him — confirmed, or true when she never sent one. */
  couple: boolean
  /** Her name on the introduction list — confirmed, or true when she never put it down. */
  intro: boolean
  /** Every map code not yet confirmed, when `map` is false: shown to her. The step id and the couple code are never shown. */
  mapHeld?: string[]
  /** Every introduction code not yet confirmed, when `intro` is false. Never more than codes. */
  introHeld?: string[]
  /** When anything is unconfirmed: whether this phone's storage holds every code still to send; false when any is held only by this page, and a reload loses it. */
  kept?: boolean
  /**
   * True when the keys this phone keeps for an unfinished forget could not be read completely (storage
   * refused the scan, or two scans never agreed). That is *unknown*, not "nothing is waiting": the
   * flags above describe only what could be seen, and the page is not replaced.
   */
  unchecked?: boolean
}

const some = (h: Held) => KINDS.some((k) => h[k].length > 0)

/** Codes, tidied: each exactly a code (never cleaned into one), each once, in a fixed order. */
function tidy(codes: unknown[]): string[] {
  return [...new Set(codes.filter(isStoredCode))].sort()
}

/** A whole set of codes, tidied kind by kind. */
const tidied = (h: Record<Kind, unknown[]>): Held => ({ maps: tidy(h.maps), installs: tidy(h.installs), pairs: tidy(h.pairs), intros: tidy(h.intros) })

const union = (...hs: Held[]): Held => tidied({ maps: hs.flatMap((h) => h.maps), installs: hs.flatMap((h) => h.installs), pairs: hs.flatMap((h) => h.pairs), intros: hs.flatMap((h) => h.intros) })

const sameHeld = (a: Held, b: Held) => KINDS.every((k) => a[k].join() === b[k].join())

/**
 * The codes this page is holding because this phone's storage refused to keep
 * them, for all four kinds and nothing else about her (no contact, no name, no
 * day, no receipt). A reload clears it, and Trust says so.
 */
let mirror: Held = none()

/**
 * For each code a delete in this page has had confirmed, the sequence number of
 * the request that confirmed it. Page memory only; a reload clears it.
 *
 * It does two different jobs, and only one of them is a block on a later write:
 *  - an **import** of an older record's mention of the code is skipped (the page
 *    already saw the answer, so asking again is waste); but
 *  - a **capture** of a failed request is skipped only when a *later* request
 *    confirmed the code. A request made after that confirmation is a new
 *    attempt, even for the same code, and its failure is kept.
 */
const confirmedAt = new Map<string, number>()
let sequence = 0

/**
 * For each code, the sequence number of the newest request this page has sent.
 * A confirmation settles a code only when no newer request for it is still
 * unresolved: an older success that arrives late says nothing about a newer
 * attempt that failed or is still in flight (the progress endpoint writes no
 * marker, so a record can exist again after the older deletion). Page memory
 * only, per page; tabs do not share it.
 */
const askedAt = new Map<string, number>()

/** The codes this page wrote a recovery key for and has not settled: its own writes, known exactly, never inferred from a scan. */
const added = new Set<string>()

const keyOf = (kind: Kind, code: string) => `${kind}:${code}`
const splitKey = (k: string): [Kind, string] => {
  const i = k.indexOf(':')
  return [k.slice(0, i) as Kind, k.slice(i + 1)]
}

/** For a test that reloads the page: what a reload clears. */
export function resetForgetMirror(): void {
  mirror = none()
  confirmedAt.clear()
  askedAt.clear()
  added.clear()
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/**
 * Every valid code an older record names, or null when the string is not a
 * JSON object (absent, cut, an array, a string): that is not read, and not
 * touched either way. A value that is not exactly a code is not imported and
 * not converted into one.
 */
function legacyCodes(raw: unknown): Held | null {
  if (typeof raw !== 'string') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const s = parsed as Stored
  return tidied({
    maps: [s.code, ...list(s.moreCodes)],
    installs: [s.id, ...list(s.moreIds)],
    pairs: [s.pair, ...list(s.morePairs)],
    intros: [...list(s.intros), s.intro, s.introPending],
  })
}

const isPersisted = (kind: Kind, code: string): boolean => {
  try {
    return localStorage.getItem(recoveryKey(kind, code)) !== null
  } catch {
    return false
  }
}

/**
 * Keep one code: its own key. True when this phone's storage holds it (it did
 * already, or this write took); false when it refused, in which case the page
 * holds it (`mirror`) and `kept` says so. One `setItem`, no read-modify-write.
 */
function add(kind: Kind, code: string): boolean {
  if (isPersisted(kind, code)) {
    mirror[kind] = mirror[kind].filter((c) => c !== code)
    return true
  }
  try {
    localStorage.setItem(recoveryKey(kind, code), '1')
    added.add(keyOf(kind, code))
    mirror[kind] = mirror[kind].filter((c) => c !== code)
    return true
  } catch {
    /* storage refused; Trust still names the codes it can on screen */
    mirror[kind] = tidy([...mirror[kind], code])
    return false
  }
}

/** Try again to put every code this page holds only in memory into storage. */
function flush(): void {
  for (const kind of KINDS) for (const code of [...mirror[kind]]) add(kind, code)
}

/**
 * Copy the valid codes an older record names into recovery keys. **Import, not
 * capture:** a code this page has already had confirmed is skipped (its
 * mention in the older record is stale). Nothing is written or removed on the
 * older key; a code it still mentions can be imported and asked again on a
 * later launch, for as long as that record stays.
 */
export function importLegacy(sources: unknown[]): void {
  for (const raw of sources) {
    const codes = legacyCodes(raw)
    if (!codes) continue
    for (const kind of KINDS) {
      for (const code of codes[kind]) {
        if (confirmedAt.has(keyOf(kind, code))) continue
        add(kind, code)
      }
    }
  }
}

function importCurrentLegacy(): void {
  let raw: string | null
  try {
    raw = localStorage.getItem(LEGACY_KEY)
  } catch {
    return
  }
  importLegacy([raw])
}

/**
 * Another tab changed the older key. The key may be overwritten or removed
 * again before this runs, and a removal by an older tab is exactly when an
 * unconfirmed code would be lost, so the codes in the event's *old and new*
 * values are both imported. An event reaches only other, live pages of this
 * origin: a closed, discarded or suspended page never gets one, so this narrows
 * the window and guarantees nothing.
 */
export function onLegacyStorageEvent(e: { key: string | null; oldValue: string | null; newValue: string | null }): void {
  if (e.key !== LEGACY_KEY) return
  importLegacy([e.oldValue, e.newValue])
}

/** One pass over this origin's keys. Null when storage refused the scan. */
function scanOnce(): Held | null {
  try {
    // Snapshot the keys first: another tab adding or removing a key shifts the indices under us.
    const keys: string[] = []
    const n = localStorage.length
    for (let i = 0; i < n; i++) {
      const k = localStorage.key(i)
      if (k !== null) keys.push(k)
    }
    const found = none()
    const head = `${RECOVERY_PREFIX}.`
    for (const k of keys) {
      if (!k.startsWith(head)) continue
      const rest = k.slice(head.length)
      const dot = rest.indexOf('.')
      if (dot < 0) continue
      const kind = rest.slice(0, dot) as Kind
      const code = rest.slice(dot + 1)
      if (KINDS.includes(kind) && isStoredCode(code)) found[kind].push(code)
    }
    return tidied(found)
  } catch {
    return null
  }
}

/**
 * The recovery keys, best effort. The scan is live against other tabs, so it
 * repeats (at most three times) until two consecutive passes agree; if storage
 * refuses it, or they never agree, the result is **incomplete**: what was seen,
 * and a statement that it may not be everything. "Not seen in this scan" is
 * never "deleted": nothing in this file removes, confirms or clears a code
 * because a scan did not show it.
 */
function scan(): { held: Held; complete: boolean } {
  let seen = none()
  let previous: Held | null = null
  for (let pass = 0; pass < 3; pass++) {
    const now = scanOnce()
    if (!now) return { held: seen, complete: false }
    seen = union(seen, now)
    if (previous && sameHeld(previous, now)) return { held: now, complete: true }
    previous = now
  }
  return { held: seen, complete: false }
}

/** Every code waiting: the scanned keys, this page's own writes (checked directly), and the page's copy; and whether the scan was complete. */
function readHeld(): { held: Held; complete: boolean } {
  const seen = scan()
  const own = none()
  for (const k of [...added]) {
    const [kind, code] = splitKey(k)
    let present = true
    try {
      present = localStorage.getItem(recoveryKey(kind, code)) !== null
    } catch {
      /* cannot verify; it is this page's own write, so keep it */
    }
    if (present) own[kind].push(code)
    else added.delete(k)
  }
  return { held: union(seen.held, own, mirror), complete: seen.complete }
}

/** The forget still waiting for the server, if any: the recovery keys and the page's own copy, together. */
export function pendingForget(): Pending | null {
  const { held } = readHeld()
  if (!some(held)) return null
  return Object.fromEntries(KINDS.filter((k) => held[k].length).map((k) => [k, held[k]])) as Pending
}

/** What each delete came to, code by code, and the sequence number of the request that asked. */
type Landed = Record<Kind, Map<string, { landed: boolean; seq: number }>>

/**
 * A strict, recognised answer settled this code: remove its recovery key (and
 * the page's copy) and remember which request settled it. Only a confirmation
 * does this, and it removes exactly that code; a removal that storage refuses
 * leaves the key, and the code is simply asked again. An answer for an *older*
 * request does not settle a code that a *newer* request has not confirmed: the
 * newer attempt's own outcome does, whichever order the two answers arrive in.
 */
function settle(kind: Kind, code: string, seq: number): void {
  const k = keyOf(kind, code)
  confirmedAt.set(k, Math.max(confirmedAt.get(k) ?? 0, seq))
  // A newer request for this code has not been confirmed (it failed, or is in
  // flight): this older answer does not settle it. Its own outcome will.
  if ((askedAt.get(k) ?? 0) > confirmedAt.get(k)!) return
  mirror[kind] = mirror[kind].filter((c) => c !== code)
  added.delete(k)
  try {
    localStorage.removeItem(recoveryKey(kind, code))
  } catch {
    /* storage refused; asked again at the next trigger */
  }
}

/** Send each distinct code's delete once, in parallel, settling each as its own answer arrives. */
async function deleteAll(p: Held): Promise<Landed> {
  const out: Landed = { maps: new Map(), installs: new Map(), pairs: new Map(), intros: new Map() }
  await Promise.all(
    KINDS.flatMap((kind) =>
      p[kind].map(async (code) => {
        const seq = ++sequence
        askedAt.set(keyOf(kind, code), seq)
        const landed = await ask(kind, code)
        out[kind].set(code, { landed, seq })
        if (landed) settle(kind, code, seq)
      }),
    ),
  )
  return out
}

const allLanded = (done: Landed) => KINDS.every((k) => [...done[k].values()].every((r) => r.landed))

/**
 * Keep what a Forget me could not confirm: one key per code. A failed request
 * is skipped only when a *later* request confirmed the same code (an older
 * attempt ending after a newer one is stale). A request made after an earlier
 * confirmation is a new attempt, even for the same code, and is kept.
 */
function capture(done: Landed): void {
  for (const kind of KINDS) {
    for (const [code, r] of done[kind]) {
      if (r.landed) continue
      if ((confirmedAt.get(keyOf(kind, code)) ?? 0) > r.seq) continue
      add(kind, code)
    }
  }
}

/**
 * Send a pending forget again. Called on every launch and before every Forget
 * me: it first imports an older record and tries to persist anything the page
 * holds only in memory, then asks for every code waiting; a code leaves only
 * when its own delete was answered by one of its handler's answers. True when
 * everything it sent landed **and** the keys could be read completely: an
 * incomplete read is not "nothing is waiting". Each call waits for one round of
 * deletes, each bounded at `TIMEOUT_MS`, in parallel.
 */
export async function retryPendingForget(): Promise<boolean> {
  importCurrentLegacy()
  flush()
  const { held, complete } = readHeld()
  if (!some(held)) return complete
  const done = await deleteAll(held)
  return complete && allLanded(done)
}

export async function forgetMe(): Promise<Forgotten> {
  // Anything an earlier Forget me could not finish, first — one round, so the
  // whole of this call waits for at most two (this one, and the one below).
  await retryPendingForget()
  // What this phone holds, read before it is wiped, and only what is exactly a
  // code. The receipt this phone holds — in storage, or, when storage refused it,
  // in this page's memory (src/lib/introduce.ts) — and the attempt it is still
  // waiting on: either way the code is sent. The same code held twice is one code.
  const asked: Held = tidied({
    maps: [rememberedCode()],
    installs: [rememberedInstallId()],
    pairs: [loadProgress()?.couple?.code],
    intros: [rememberedIntro()?.code, pendingIntro()?.code],
  })
  // Not her reports. They used to be withdrawn here, by the receipts this phone
  // held — so a forget me made with someone standing over her erased the only
  // record of what he did, and he never had to know there was one
  // (docs/SECURITY.md, coercion). A report is a message to the founder, and like
  // any sent message it is not taken back by clearing a phone: it stays until
  // she has read it, and then only the kind of harm and what was done remain
  // (netlify/functions/safety.ts). Trust says so.
  const done = await deleteAll(asked)
  clearEverything()
  // What did not land is kept — its codes only, each under its own key — and
  // nothing already kept is read back and rewritten, so an earlier forget's
  // codes cannot be replaced by this one's.
  capture(done)
  flush()
  const { held, complete } = readHeld()
  const kept = KINDS.every((k) => held[k].every((c) => isPersisted(k, c)))
  return {
    map: held.maps.length === 0,
    progress: held.installs.length === 0,
    couple: held.pairs.length === 0,
    intro: held.intros.length === 0,
    ...(held.maps.length ? { mapHeld: held.maps } : {}),
    ...(held.intros.length ? { introHeld: held.intros } : {}),
    ...(some(held) ? { kept } : {}),
    ...(complete ? {} : { unchecked: true }),
  }
}

/**
 * Take every key this app writes off this phone.
 *
 * Shared with the error screen's "Start completely fresh", which used to call
 * `clearProgress` alone and leave the kept code behind — the exact
 * irreversible-overwrite path `useNiyyah`'s own startFresh documents
 * (docs/DESIGN.md).
 */
export function clearEverything(): void {
  clearProgress()
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* storage refused; there is nothing more to do than try */
    }
  }
  // And the page's own copies of the introduction receipt and the pending
  // attempt, which a phone whose storage refused is holding in memory
  // (src/lib/introduce.ts). Read above, before the deletes; cleared here.
  forgetIntro()
  forgetPending()
}
