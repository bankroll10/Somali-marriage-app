import { cleanCode, isCode } from '../../src/lib/code'

/**
 * The pending-forget reader and writer of BATCH-07D (`69f8b92`, src/lib/forget.ts), kept as a
 * fixture so a test can run the build before this one against a record this build wrote
 * (docs/DECISIONS.md Part 34, "Compatibility").
 *
 * Faithful, not clever: the field names, the order they are written in, `tidy`, and the two
 * operations that rewrite the record — a Forget me whose deletes did not land, and a retry
 * that settled. Only the page's own copy (`mirror`) is left out, because it is memory and
 * never part of the file. If this drifts from what 07D did, the demonstration proves
 * nothing, so it is held to `git show 69f8b92:src/lib/forget.ts` by reading, not by import.
 */

const KEY = 'niyyah.forget.pending.v1'

interface Pending07d {
  code?: string
  id?: string
  pair?: string
  intros?: string[]
}
interface Stored07d extends Pending07d {
  intro?: unknown
  introPending?: unknown
}

/** 07D's `tidy`: input-cleaning, which turns `QR?TWXY34` into a code. */
function tidy07d(codes: unknown[]): string[] {
  const out = new Set<string>()
  for (const c of codes) {
    if (typeof c !== 'string') continue
    const clean = cleanCode(c)
    if (isCode(clean)) out.add(clean)
  }
  return [...out].sort()
}

/** 07D's `pendingForget`, storage half: what that build would read from this phone. */
export function read07d(): Pending07d | null {
  let stored: Stored07d = {}
  try {
    const raw = localStorage.getItem(KEY)
    const p: unknown = raw ? JSON.parse(raw) : null
    if (p && typeof p === 'object' && !Array.isArray(p)) stored = p as Stored07d
  } catch {
    /* unreadable */
  }
  const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
  const intros = tidy07d([...(Array.isArray(stored.intros) ? stored.intros : []), stored.intro, stored.introPending])
  const p: Pending07d = {
    ...(text(stored.code) ? { code: text(stored.code) } : {}),
    ...(text(stored.id) ? { id: text(stored.id) } : {}),
    ...(text(stored.pair) ? { pair: text(stored.pair) } : {}),
    ...(intros.length ? { intros } : {}),
  }
  return p.code || p.id || p.pair || p.intros?.length ? p : null
}

/** 07D's `savePending`: writes only the fields it knows, whatever else the file held. */
export function save07d(p: Pending07d): void {
  const intros = tidy07d(p.intros ?? [])
  const next: Pending07d = { ...(p.code ? { code: p.code } : {}), ...(p.id ? { id: p.id } : {}), ...(p.pair ? { pair: p.pair } : {}), ...(intros.length ? { intros } : {}) }
  if (next.code || next.id || next.pair || next.intros?.length) localStorage.setItem(KEY, JSON.stringify(next))
  else localStorage.removeItem(KEY)
}

/**
 * 07D's `forgetMe`, from the deletes onward, for a Forget me whose deletes did not land:
 * `asked` is what the phone held, all unresolved; the record is `{...now, ...unresolved}`
 * with the introduction codes unioned. A failed delete rewrites the file.
 */
export function failedForget07d(asked: Pending07d): void {
  const now = read07d() ?? {}
  const unresolved: Pending07d = { ...(asked.code ? { code: asked.code } : {}), ...(asked.id ? { id: asked.id } : {}), ...(asked.pair ? { pair: asked.pair } : {}), intros: asked.intros ?? [] }
  save07d({ ...now, ...unresolved, intros: [...(now.intros ?? []), ...(unresolved.intros ?? [])] })
}

/**
 * 07D's `retryPendingForget` when nothing it sent was confirmed: it re-reads the record as
 * it is now, takes nothing out, and saves — which rewrites the file from the fields it knows.
 */
export function unconfirmedRetry07d(): void {
  const now = read07d()
  if (!now) return
  save07d({ ...(now.code ? { code: now.code } : {}), ...(now.id ? { id: now.id } : {}), ...(now.pair ? { pair: now.pair } : {}), intros: now.intros ?? [] })
}
