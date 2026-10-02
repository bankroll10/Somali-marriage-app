import { cleanCode, isCode } from './code'
import { rememberedCode } from './keep'
import { rememberedInstallId } from './progress'
import { confirmWithdrawal, forgetIntro, forgetPending, pendingIntro, rememberedIntro } from './introduce'
import { clearProgress, loadProgress } from './storage'
import { send } from './net'

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
 * days. Trust says "deletes ... the eleven you sent him" without a condition,
 * and now that is true of her too (docs/DECISIONS.md). The introduction code
 * is the same shape: its own key, its own delete, joined to nothing else
 * (src/lib/introduce.ts). An attempt to put her name down whose answer never
 * arrived is sent as a delete too, under the code it went out with: the
 * server marks the code, so a request still on its way cannot land after
 * this (docs/BATCH-01-PLAN.md D2).
 *
 * Each server call is best-effort and reported honestly — a 404 means it was
 * already gone, which is the same as done. The local wipe happens whatever
 * the server said: her phone is hers, and it is the one thing we can
 * guarantee.
 *
 * All but one key (docs/PRIVACY.md). When a server delete fails, the codes
 * it needed are kept — the codes and nothing else, none of her answers — as a
 * pending forget. The phone used to be wiped whatever happened, and Trust
 * told her to tap Forget me again: but the retry had no code left to send, so
 * it reported success while her map stayed on the server for a year, and she could not even write in
 * with the code, because it was gone too. Now the next Forget me sends the
 * pending codes first, the app sends them again every time it opens, and
 * Trust shows her the code so a person can do it by hand.
 */

const KEEP = '/.netlify/functions/keep'
const PROGRESS = '/.netlify/functions/progress'
const COUPLE = '/.netlify/functions/couple'

/** A forget that has not reached the server yet: only the codes it still needs. */
const PENDING_KEY = 'niyyah.forget.pending.v1'

/**
 * What a failed forget still has to delete: codes, and nothing else.
 *
 * `intros` is every introduction code not yet confirmed gone — the receipt's
 * and any attempt's, from this forget or an earlier one, in one list. Until
 * BATCH-07D the record held at most two (`intro`, `introPending`), and a second
 * unresolved forget replaced the first's code. A record written that way is
 * still read (both fields are folded into `intros`) and is written back in the
 * new shape the next time it is saved; a build before this one ignores `intros`.
 */
interface Pending {
  code?: string
  id?: string
  pair?: string
  intros?: string[]
}

/** The shape an earlier build wrote: at most one receipt code and one attempt code. */
interface StoredPending extends Pending {
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

async function del(url: string): Promise<boolean> {
  const res = await send(url, { method: 'DELETE' })
  // A 404 is success: there was nothing there to forget.
  return !!res && (res.ok || res.status === 404)
}

export interface Forgotten {
  /** The kept map and everything under its code — or true when there was none. */
  map: boolean
  /** The count of her steps — or true when this phone never had a code. */
  progress: boolean
  /** The eleven she sent him — or true when she never sent one. */
  couple: boolean
  /** Her name on the introduction list — or true when she never put it down. False means *unconfirmed*, not necessarily still there. */
  intro: boolean
  /** The map code still held on the server when `map` is false, to show her. */
  code?: string
  /** Every introduction code not yet confirmed gone, when `intro` is false. Never more than codes. */
  introHeld?: string[]
  /** Whether this phone's storage holds `introHeld`; false when only this page does, and a reload loses it. */
  introKept?: boolean
}

const some = (p: Pending) => !!(p.code || p.id || p.pair || p.intros?.length)

/** Introduction codes, tidied: valid ones only, upper-case, each once, in a fixed order. */
function tidy(codes: unknown[]): string[] {
  const out = new Set<string>()
  for (const c of codes) {
    if (typeof c !== 'string') continue
    const clean = cleanCode(c)
    if (isCode(clean)) out.add(clean)
  }
  return [...out].sort()
}

/**
 * The codes this page is holding because this phone's storage refused to keep
 * them: introduction codes only, and nothing else about her (no contact, no
 * name, no day, no receipt). The same fallback `src/lib/introduce.ts` gives its
 * receipt, and the same limit: a reload clears it. Map, count and couple codes
 * have no such copy, as before.
 */
let mirror: string[] = []

/** For a test that reloads the page: what a reload clears. */
export function resetForgetMirror(): void {
  mirror = []
}

/** The forget still waiting for the server, if any: this phone's record and the page's own copy of the introduction codes. */
export function pendingForget(): Pending | null {
  let stored: StoredPending = {}
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const p: unknown = raw ? JSON.parse(raw) : null
    if (p && typeof p === 'object' && !Array.isArray(p)) stored = p as StoredPending
  } catch {
    /* storage refused or unreadable — the page's own copy, below */
  }
  const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
  const intros = tidy([...(Array.isArray(stored.intros) ? stored.intros : []), stored.intro, stored.introPending, ...mirror])
  const p: Pending = {
    ...(text(stored.code) ? { code: text(stored.code) } : {}),
    ...(text(stored.id) ? { id: text(stored.id) } : {}),
    ...(text(stored.pair) ? { pair: text(stored.pair) } : {}),
    ...(intros.length ? { intros } : {}),
  }
  return some(p) ? p : null
}

/**
 * Write the record. True when this phone's storage took it, or when there was
 * nothing to keep; false when it refused, in which case the introduction codes
 * are held by the page instead (`mirror`) and the caller says so.
 */
function savePending(p: Pending): boolean {
  const intros = tidy(p.intros ?? [])
  const next: Pending = { ...(p.code ? { code: p.code } : {}), ...(p.id ? { id: p.id } : {}), ...(p.pair ? { pair: p.pair } : {}), ...(intros.length ? { intros } : {}) }
  try {
    if (some(next)) localStorage.setItem(PENDING_KEY, JSON.stringify(next))
    else localStorage.removeItem(PENDING_KEY)
    mirror = []
    return true
  } catch {
    /* storage refused; Trust still names the codes on screen */
    mirror = intros
    return false
  }
}

/** What each delete came to: the three that count a bare success, and each introduction code by its own answer. */
type Landed = { map: boolean; progress: boolean; couple: boolean; intro: Map<string, boolean> }

/** Confirm each distinct introduction code once, by the strict contract. One request per code, however many places held it. */
async function confirmIntros(codes: string[]): Promise<Map<string, boolean>> {
  const answers = await Promise.all(codes.map(async (c) => [c, (await confirmWithdrawal(c)) !== 'failed'] as const))
  return new Map(answers)
}

/** Send one set of codes' deletes, and say which landed. */
async function deleteAll(p: Pending): Promise<Landed> {
  const [map, progress, couple, intro] = await Promise.all([
    p.code ? del(`${KEEP}?code=${encodeURIComponent(p.code)}`) : Promise.resolve(true),
    p.id ? del(`${PROGRESS}?id=${encodeURIComponent(p.id)}`) : Promise.resolve(true),
    p.pair ? del(`${COUPLE}?code=${encodeURIComponent(p.pair)}`) : Promise.resolve(true),
    confirmIntros(p.intros ?? []),
  ])
  return { map, progress, couple, intro }
}

const allLanded = (done: Landed) => done.map && done.progress && done.couple && [...done.intro.values()].every(Boolean)

/** The codes a set of deletes did not land, and nothing else. */
const left = (p: Pending, done: Landed): Pending => ({
  ...(done.map || !p.code ? {} : { code: p.code }),
  ...(done.progress || !p.id ? {} : { id: p.id }),
  ...(done.couple || !p.pair ? {} : { pair: p.pair }),
  intros: (p.intros ?? []).filter((c) => !done.intro.get(c)),
})

/**
 * The record as it is *now*, less the codes this operation sent and was
 * answered for. Never the record as it was when the operation began: a Forget
 * me that wrote codes while a retry was in flight must keep them when the
 * retry lands, and a code the retry could not confirm is not removed by it.
 */
function afterRetry(sent: Pending, done: Landed): Pending {
  const now = pendingForget() ?? {}
  return {
    ...(now.code && !(done.map && now.code === sent.code) ? { code: now.code } : {}),
    ...(now.id && !(done.progress && now.id === sent.id) ? { id: now.id } : {}),
    ...(now.pair && !(done.couple && now.pair === sent.pair) ? { pair: now.pair } : {}),
    intros: (now.intros ?? []).filter((c) => !(sent.intros?.includes(c) && done.intro.get(c))),
  }
}

/**
 * Send a pending forget again. Called on every launch and before every Forget
 * me; a code goes from the record only when its own delete was answered.
 * True when everything it sent landed. Each call waits for one round of
 * deletes, the introduction ones bounded at `TIMEOUT_MS` each, in parallel.
 */
export async function retryPendingForget(): Promise<boolean> {
  const pending = pendingForget()
  if (!pending) return true
  const done = await deleteAll(pending)
  savePending(afterRetry(pending, done))
  return allLanded(done)
}

export async function forgetMe(): Promise<Forgotten> {
  // Anything an earlier Forget me could not finish, first — one round, so the
  // whole of this call waits for at most two (this one, and the one below).
  await retryPendingForget()
  const code = rememberedCode() ?? undefined
  const id = rememberedInstallId() ?? undefined
  // The receipt this phone holds — in storage, or, when storage refused it,
  // in this page's memory (src/lib/introduce.ts) — and the attempt it is still
  // waiting on: either way the code is sent, so a name saved in a browser that
  // is not saving still comes off. The same code held twice is one code.
  const intros = tidy([rememberedIntro()?.code, pendingIntro()?.code])
  // Read before the phone is wiped. A 404 from any of the other three means it
  // was already gone — the map cascade may well have taken the couple with it —
  // which is the same as done.
  const pair = loadProgress()?.couple?.code
  // Not her reports. They used to be withdrawn here, by the receipts this phone
  // held — so a forget me made with someone standing over her erased the only
  // record of what he did, and he never had to know there was one
  // (docs/SECURITY.md, coercion). A report is a message to the founder, and like
  // any sent message it is not taken back by clearing a phone: it stays until
  // she has read it, and then only the kind of harm and what was done remain
  // (netlify/functions/safety.ts). Trust says so.
  const asked: Pending = { code, id, pair, intros }
  const done = await deleteAll(asked)
  clearEverything()
  // What did not land is kept — its codes only — to be sent again, alongside
  // whatever the record holds *now*: an earlier forget's introduction codes
  // are not replaced by this one's. Read and written in the same breath, so
  // nothing that settled meanwhile is overwritten with an older copy.
  const now = pendingForget() ?? {}
  const unresolved = left(asked, done)
  const kept = savePending({ ...now, ...unresolved, intros: [...(now.intros ?? []), ...(unresolved.intros ?? [])] })
  const still = pendingForget()
  const introHeld = still?.intros ?? []
  return {
    map: done.map && !still?.code,
    progress: done.progress && !still?.id,
    couple: done.couple && !still?.pair,
    intro: introHeld.length === 0,
    ...(still?.code ? { code: still.code } : {}),
    ...(introHeld.length ? { introHeld, introKept: kept } : {}),
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
