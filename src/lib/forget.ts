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
 * the codes and nothing else, none of her answers — as a pending forget: a
 * list for each of the four kinds, so a second unresolved forget adds to the
 * first and never replaces it. The next Forget me sends them first, the app
 * sends them again every time it opens, and Trust shows her the codes she can
 * use. When the browser will not save them the page holds them, until it is
 * reloaded.
 */

const KEEP = '/.netlify/functions/keep'
const PROGRESS = '/.netlify/functions/progress'
const COUPLE = '/.netlify/functions/couple'

/** A forget that has not reached the server yet: only the codes it still needs. */
const PENDING_KEY = 'niyyah.forget.pending.v1'

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
 * How the record is written to this phone. Builds before this one kept one slot
 * per kind (`code`, `id`, `pair`), and BATCH-07D an `intros` list; those are
 * read as they are. This build writes a kind's first code in the old slot and
 * only a second, third… in `more*`, so a record with one code of each kind is
 * the file the build before it wrote. An older build reads the slots and does
 * not know `more*`: it neither retries them nor keeps them when it saves.
 */
interface Stored {
  code?: unknown
  moreCodes?: unknown
  id?: unknown
  moreIds?: unknown
  pair?: unknown
  morePairs?: unknown
  intros?: unknown
  /** The introduction fields BATCH-07D and before wrote. */
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
  /** When anything is unconfirmed: whether this phone's storage holds the codes still to send; false when only this page does, and a reload loses them. */
  kept?: boolean
}

const some = (h: Held) => KINDS.some((k) => h[k].length > 0)

/** Codes, tidied: each exactly a code (never cleaned into one), each once, in a fixed order. */
function tidy(codes: unknown[]): string[] {
  return [...new Set(codes.filter(isStoredCode))].sort()
}

/** A whole record, tidied kind by kind. */
const tidied = (h: Record<Kind, unknown[]>): Held => ({ maps: tidy(h.maps), installs: tidy(h.installs), pairs: tidy(h.pairs), intros: tidy(h.intros) })

/**
 * The codes this page is holding because this phone's storage refused to keep
 * them, for all four kinds and nothing else about her (no contact, no name, no
 * day, no receipt). A reload clears it, and Trust says so.
 */
let mirror: Held = none()

/**
 * The codes a Forget me in this page has had confirmed. An answer that arrives
 * late, or an older operation that settles unconfirmed after a newer one
 * confirmed the same code, must not put it back on the list: a confirmed
 * deletion is not undone by a later silence. Page memory only; a reload clears it.
 */
const confirmed = new Set<string>()
const keyOf = (kind: Kind, code: string) => `${kind}:${code}`

/** For a test that reloads the page: what a reload clears. */
export function resetForgetMirror(): void {
  mirror = none()
  confirmed.clear()
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** The record as it is on this phone and in this page, every kind tidied. Empty lists, not absent. */
function held(): Held {
  let stored: Stored = {}
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const p: unknown = raw ? JSON.parse(raw) : null
    if (p && typeof p === 'object' && !Array.isArray(p)) stored = p as Stored
  } catch {
    /* storage refused or unreadable — the page's own copy, below */
  }
  return tidied({
    maps: [stored.code, ...list(stored.moreCodes), ...mirror.maps],
    installs: [stored.id, ...list(stored.moreIds), ...mirror.installs],
    pairs: [stored.pair, ...list(stored.morePairs), ...mirror.pairs],
    intros: [...list(stored.intros), stored.intro, stored.introPending, ...mirror.intros],
  })
}

/** The forget still waiting for the server, if any: this phone's record and the page's own copy, together. */
export function pendingForget(): Pending | null {
  const h = held()
  if (!some(h)) return null
  return Object.fromEntries(KINDS.filter((k) => h[k].length).map((k) => [k, h[k]])) as Pending
}

/** The file: a kind's first code in the slot an older build reads, the rest in `more*`. */
function toDisk(h: Held): Record<string, unknown> {
  const [code, ...moreCodes] = h.maps
  const [id, ...moreIds] = h.installs
  const [pair, ...morePairs] = h.pairs
  return {
    ...(code ? { code } : {}),
    ...(moreCodes.length ? { moreCodes } : {}),
    ...(id ? { id } : {}),
    ...(moreIds.length ? { moreIds } : {}),
    ...(pair ? { pair } : {}),
    ...(morePairs.length ? { morePairs } : {}),
    ...(h.intros.length ? { intros: h.intros } : {}),
  }
}

/**
 * Write the record. True when this phone's storage took it, or when there was
 * nothing to keep; false when it refused, in which case the page holds every
 * code instead (`mirror`) and the caller says so.
 */
function savePending(p: Held): boolean {
  const next = tidied(p)
  try {
    if (some(next)) localStorage.setItem(PENDING_KEY, JSON.stringify(toDisk(next)))
    else localStorage.removeItem(PENDING_KEY)
    mirror = none()
    return true
  } catch {
    /* storage refused; Trust still names the codes it can on screen */
    mirror = next
    return false
  }
}

/** What each delete came to, code by code, for each kind. */
type Landed = Record<Kind, Map<string, boolean>>

/**
 * Send each distinct code's delete once, in parallel, and say which landed. A
 * confirmed code is remembered for this page (`confirmed`) as it is answered.
 */
async function deleteAll(p: Held): Promise<Landed> {
  const out: Landed = { maps: new Map(), installs: new Map(), pairs: new Map(), intros: new Map() }
  await Promise.all(
    KINDS.flatMap((kind) =>
      p[kind].map(async (code) => {
        const landed = await ask(kind, code)
        out[kind].set(code, landed)
        if (landed) confirmed.add(keyOf(kind, code))
      }),
    ),
  )
  return out
}

const allLanded = (done: Landed) => KINDS.every((k) => [...done[k].values()].every(Boolean))

/** The codes a set of deletes did not land, and nothing else. */
const left = (p: Held, done: Landed): Held => ({
  maps: p.maps.filter((c) => !done.maps.get(c)),
  installs: p.installs.filter((c) => !done.installs.get(c)),
  pairs: p.pairs.filter((c) => !done.pairs.get(c)),
  intros: p.intros.filter((c) => !done.intros.get(c)),
})

/**
 * The record as it is *now*, less the codes this operation sent and was
 * answered for. Never the record as it was when the operation began, and never
 * anything added: a Forget me that wrote codes while a retry was in flight keeps
 * them when the retry lands, a code the retry could not confirm is not removed
 * by it, and one it could not confirm that something newer already removed is
 * not put back.
 */
function afterRetry(sent: Held, done: Landed): Held {
  const now = held()
  const kept = (kind: Kind) => now[kind].filter((c) => !(sent[kind].includes(c) && done[kind].get(c)))
  return { maps: kept('maps'), installs: kept('installs'), pairs: kept('pairs'), intros: kept('intros') }
}

/**
 * Send a pending forget again. Called on every launch and before every Forget
 * me; a code goes from the record only when its own delete was answered by one
 * of its handler's answers. True when everything it sent landed. Each call
 * waits for one round of deletes, each bounded at `TIMEOUT_MS`, in parallel.
 */
export async function retryPendingForget(): Promise<boolean> {
  const pending = held()
  if (!some(pending)) return true
  const done = await deleteAll(pending)
  savePending(afterRetry(pending, done))
  return allLanded(done)
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
  // What did not land is kept — its codes only — to be sent again, alongside
  // whatever the record holds *now*: an earlier forget's codes are not replaced
  // by this one's. Read and written in the same breath, so nothing that settled
  // meanwhile is overwritten with an older copy; and a code another operation in
  // this page has confirmed since is not put back.
  const now = held()
  const unresolved = left(asked, done)
  const merged: Held = none()
  for (const kind of KINDS) merged[kind] = [...now[kind], ...unresolved[kind].filter((c) => !confirmed.has(keyOf(kind, c)))]
  const kept = savePending(merged)
  const still = held()
  return {
    map: still.maps.length === 0,
    progress: still.installs.length === 0,
    couple: still.pairs.length === 0,
    intro: still.intros.length === 0,
    ...(still.maps.length ? { mapHeld: still.maps } : {}),
    ...(still.intros.length ? { introHeld: still.intros } : {}),
    ...(some(still) ? { kept } : {}),
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
