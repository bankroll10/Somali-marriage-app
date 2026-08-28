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

export interface WaitlistEntry {
  email: string
  /** Diaspora community id (see data/scenes.ts) — this is the city signal. */
  scene?: string
  gender?: string
  /** Readiness score, so demand can be read against seriousness. */
  overall?: number
  at: string
}

export const CONTACT_EMAIL = 'salaam@niyyah.app'

/**
 * Netlify Forms, when the build names one. Chosen over a third-party form
 * service because it needs no account, no key, and no other company holding a
 * list of Somali women who want to get married — the submissions live in the
 * same place the site does.
 *
 * Netlify registers a form by scanning the deployed HTML at build time, so
 * index.html carries a hidden form declaring these fields. Submissions must be
 * url-encoded and name the form; JSON is silently ignored.
 */
function formName(): string | undefined {
  return (import.meta.env.VITE_WAITLIST_FORM as string | undefined) || undefined
}

/** True when there is somewhere real to send a signup. */
export function waitlistConfigured(): boolean {
  return !!formName() || !!import.meta.env.VITE_WAITLIST_URL
}

export type JoinResult = 'joined' | 'queued' | 'unconfigured'

async function post(entry: WaitlistEntry): Promise<boolean> {
  const form = formName()
  if (form) return postToNetlifyForm(form, entry)

  const url = import.meta.env.VITE_WAITLIST_URL as string | undefined
  if (!url) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(entry),
    })
    return res.ok
  } catch {
    return false
  }
}

async function postToNetlifyForm(form: string, entry: WaitlistEntry): Promise<boolean> {
  const body = new URLSearchParams({ 'form-name': form })
  // Only send what we have; an empty field is noise in the submissions table.
  if (entry.email) body.set('email', entry.email)
  if (entry.scene) body.set('scene', entry.scene)
  if (entry.gender) body.set('gender', entry.gender)
  if (typeof entry.overall === 'number') body.set('overall', String(entry.overall))
  body.set('at', entry.at)
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    return res.ok
  } catch {
    return false
  }
}

function readQueue(): WaitlistEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as WaitlistEntry[]
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
  writeQueue([...readQueue(), entry])
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
export function mailtoFor(entry: Pick<WaitlistEntry, 'scene' | 'gender'>): string {
  const subject = encodeURIComponent('Niyyah — I want in')
  const body = encodeURIComponent(
    `Salaam,\n\nI'd like a place when Niyyah opens.\n\nCommunity: ${entry.scene ?? '—'}\n\n`,
  )
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}
