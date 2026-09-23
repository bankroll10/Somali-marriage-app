/**
 * The only line out of this app.
 *
 * Until this existed, every person who opened Niyyah was lost the moment they
 * closed the tab: no email, no account, no server. That makes the marketplace
 * impossible (a matrimonial site is worthless without both sides in one city on
 * the same month) and retention unmeasurable.
 *
 * Deliberately dependency-free and provider-agnostic: point VITE_WAITLIST_URL at
 * anything that accepts a JSON POST — Formspree, Airtable, a Google Apps Script,
 * a Supabase function, your own /api route. One environment variable and this
 * app can collect real people.
 *
 * Honesty rule: if no endpoint is configured we NEVER tell someone they've
 * joined. The UI falls back to a mailto so the signup still reaches a human.
 */

const QUEUE_KEY = 'niyyah.waitlist.queue.v1'

/**
 * What the founder's form is told when someone is counted: which city, and
 * which day. Nothing a person can be reached or known by.
 *
 * It used to carry her email or phone, her city, country and how far she would
 * go, who she was seeking and the hardest part she named — a second copy of the
 * way to reach her, at a third party, that Forget me could not reach, and that
 * Trust and the door needed some hundred and fifty words to confess
 * (docs/PRIVACY.md, C7). The way to reach her now lives in one place, the
 * `contacts` store (netlify/functions/cohort.ts), which Forget me deletes and
 * the founder exports by hand (docs/OPERATING.md). What the form is still for
 * is the email Netlify sends when a row lands: someone joined in Toronto today.
 *
 * Before that, the map code travelled here too (docs/BOARD.md); it was the sole
 * authenticator for a map, and it is not here either.
 */
export interface WaitlistEntry {
  /** Diaspora community id (see data/scenes.ts) — which pool moved. */
  scene?: string
  /** The day. A moment would be one more thing to line up against a store. */
  at: string
}

/** Exactly the two fields, whatever a caller — or an older queue — hands over. */
function ping(entry: WaitlistEntry): WaitlistEntry {
  return { ...(entry.scene ? { scene: entry.scene } : {}), at: String(entry.at ?? '').slice(0, 10) }
}

import { CONTACT_EMAIL } from './site'
import { send } from './net'
import { getScene } from '../data/scenes'

export { CONTACT_EMAIL }

/**
 * Netlify Forms, when the build names one. Chosen over a third-party form
 * service because it needs no account, no key, and no other company holding a
 * list of Somali women who want to get married — the submissions live in the
 * same place the site does.
 *
 * Netlify registers a form by scanning deployed HTML at build time, so
 * public/__forms.html carries a hidden form declaring these fields. Submissions
 * must be url-encoded and name the form; JSON is silently ignored.
 */
function formName(): string | undefined {
  return (import.meta.env.VITE_WAITLIST_FORM as string | undefined) || undefined
}

/**
 * Where a signup is POSTed.
 *
 * "/" — Netlify's documented target. Its form handler matches on the form-name
 * field and runs *before* redirects, so the app's /* → /index.html rewrite does
 * not swallow it. An earlier version posted to /__forms.html instead, on the
 * theory that the rewrite would eat it; that theory was wrong and it cost the
 * first real signup. The registry file still declares the form for build-time
 * detection (see public/__forms.html) — it is just not the submission target.
 */
export const NETLIFY_FORM_ENDPOINT = '/'

/** True when there is somewhere real to send a signup. */
export function waitlistConfigured(): boolean {
  return !!formName() || !!import.meta.env.VITE_WAITLIST_URL
}

export type JoinResult = 'joined' | 'queued' | 'unconfigured'

async function post(raw: WaitlistEntry): Promise<boolean> {
  const entry = ping(raw)
  const form = formName()
  if (form) return postToNetlifyForm(form, entry)

  const url = import.meta.env.VITE_WAITLIST_URL as string | undefined
  if (!url) return false
  // Through `send`, which carries the clock these two posts did not have: a
  // hung form post left "Counting you in…" spinning with nothing to stop it.
  const res = await send(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(entry),
  })
  return !!res?.ok
}

async function postToNetlifyForm(form: string, entry: WaitlistEntry): Promise<boolean> {
  const body = new URLSearchParams({ 'form-name': form })
  // Only send what we have; an empty field is noise in the submissions table.
  if (entry.scene) body.set('scene', entry.scene)
  body.set('at', entry.at)
  const res = await send(NETLIFY_FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return !!res?.ok
}

function readQueue(): WaitlistEntry[] {
  try {
    // An older version queued the whole signup, contact and all; what is sent
    // on is only ever the ping.
    return (JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as WaitlistEntry[]).map(ping)
  } catch {
    return []
  }
}

function writeQueue(entries: WaitlistEntry[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries.slice(-20)))
  } catch {
    /* storage refused — the caller already knows it isn't saved */
  }
}

/**
 * Join. Returns 'joined' only when a server actually accepted it; a failed
 * network keeps the entry for the next visit rather than losing a real person
 * to one bad connection.
 */
export async function joinWaitlist(entry: WaitlistEntry): Promise<JoinResult> {
  if (!waitlistConfigured()) return 'unconfigured'
  const ok = await post(entry)
  if (ok) return 'joined'
  writeQueue([...readQueue(), ping(entry)])
  return 'queued'
}

/** Retry anything stranded by a previous failure. Safe to call on every load. */
export async function flushWaitlistQueue(): Promise<void> {
  if (!waitlistConfigured()) return
  const queued = readQueue()
  if (!queued.length) return
  const stillFailing: WaitlistEntry[] = []
  for (const entry of queued) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await post(entry))) stillFailing.push(entry)
  }
  writeQueue(stillFailing)
}

/** The honest fallback when nothing is wired up yet. */
export function mailtoFor(entry: { scene?: string; gender?: string }): string {
  const subject = encodeURIComponent('Niyyah — count me in')
  const body = encodeURIComponent(
    `Salaam,\n\nPlease count me in when Niyyah opens.\n\nCity: ${(entry.scene && getScene(entry.scene)?.label) ?? entry.scene ?? '—'}\n\n`,
  )
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}
