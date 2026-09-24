import { rememberedCode } from './keep'
import { rememberedInstallId } from './progress'
import { clearProgress, loadProgress } from './storage'
import { send } from './net'

/**
 * Forget me.
 *
 * One action, three deletes and a clean phone. Her kept map and everything
 * chained to it go by her map code; the count of her steps goes by her install
 * code; the eleven she sent him goes by its own couple code; then every key
 * this app ever wrote to this phone is removed. What is left is what was never
 * hers to begin with: a tally with no code in it.
 *
 * The couple code is deleted on its own because the map cascade could not
 * reach it. `createCouple` needs no map code, and the cascade in
 * netlify/functions/keep.ts finds the couple code inside a kept snapshot — so
 * a woman who sent him the eleven, kept nothing, and tapped this was told it
 * was done while both sheets sat on the server for the rest of the ninety
 * days. Trust says "deletes ... the eleven you sent him" without a condition,
 * and now that is true of her too (docs/DECISIONS.md).
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

interface Pending {
  code?: string
  id?: string
  pair?: string
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
  /** The map code still held on the server when `map` is false, to show her. */
  code?: string
}

/** The forget still waiting for the server, if any. */
export function pendingForget(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const p = raw ? (JSON.parse(raw) as Pending) : null
    return p && (p.code || p.id || p.pair) ? p : null
  } catch {
    return null
  }
}

function savePending(p: Pending) {
  try {
    if (p.code || p.id || p.pair) localStorage.setItem(PENDING_KEY, JSON.stringify(p))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* storage refused; Trust still names the code on screen */
  }
}

/** Send one set of codes' deletes, and say which landed. */
async function deleteAll(p: Pending): Promise<{ map: boolean; progress: boolean; couple: boolean }> {
  const [map, progress, couple] = await Promise.all([
    p.code ? del(`${KEEP}?code=${encodeURIComponent(p.code)}`) : Promise.resolve(true),
    p.id ? del(`${PROGRESS}?id=${encodeURIComponent(p.id)}`) : Promise.resolve(true),
    p.pair ? del(`${COUPLE}?code=${encodeURIComponent(p.pair)}`) : Promise.resolve(true),
  ])
  return { map, progress, couple }
}

/**
 * Send a pending forget again. Called on every launch and before every Forget
 * me; the key goes only once every delete it names has landed.
 */
export async function retryPendingForget(): Promise<boolean> {
  const pending = pendingForget()
  if (!pending) return true
  const done = await deleteAll(pending)
  const left: Pending = {
    ...(done.map ? {} : { code: pending.code }),
    ...(done.progress ? {} : { id: pending.id }),
    ...(done.couple ? {} : { pair: pending.pair }),
  }
  savePending(left)
  return done.map && done.progress && done.couple
}

export async function forgetMe(): Promise<Forgotten> {
  // Anything an earlier Forget me could not finish, first.
  await retryPendingForget()
  const code = rememberedCode() ?? undefined
  const id = rememberedInstallId() ?? undefined
  // Read before the phone is wiped. A 404 from any of the three means it was
  // already gone — the map cascade may well have taken the couple with it —
  // which is the same as done.
  const pair = loadProgress()?.couple?.code
  // Not her reports. They used to be withdrawn here, by the receipts this phone
  // held — so a forget me made with someone standing over her erased the only
  // record of what he did, and he never had to know there was one
  // (docs/SECURITY.md, coercion). A report is a message to the founder, and like
  // any sent message it is not taken back by clearing a phone: it stays until
  // she has read it, and then only the kind of harm and what was done remain
  // (netlify/functions/safety.ts). Trust says so.
  const done = await deleteAll({ code, id, pair })
  clearEverything()
  // What did not land is kept — its codes only — to be sent again.
  const still = pendingForget() ?? {}
  savePending({
    ...still,
    ...(done.map || !code ? {} : { code }),
    ...(done.progress || !id ? {} : { id }),
    ...(done.couple || !pair ? {} : { pair }),
  })
  const left = pendingForget()
  return {
    map: done.map && !left?.code,
    progress: done.progress && !left?.id,
    couple: done.couple && !left?.pair,
    ...(left?.code ? { code: left.code } : {}),
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
}
