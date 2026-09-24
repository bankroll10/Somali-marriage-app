/**
 * One way to call the server, and one vocabulary for what went wrong.
 *
 * Before this, `withTimeout` was copy-pasted byte-identical into five files,
 * hand-rolled in two more, and missing entirely from others — so a hung post
 * left a spinner with no clock to stop it.
 *
 * The larger fault it fixes is not duplication. Every caller collapsed a
 * timeout, an offline phone, a 404, a lapsed record, a 409 and a 503 into one
 * `null`, and a screen holding a `null` cannot say anything true: it either
 * guesses (telling a woman with a perfect link that the link is broken) or
 * says nothing (telling her he has not answered when the check never ran).
 *
 * `restoreDetail` in lib/keep.ts already proved the alternative — it is the
 * one honest failure surface in the product, and it is honest because it kept
 * the distinction its siblings threw away. `Why` generalises that type so the
 * rest of the app can do the same. A caller that genuinely does not care still
 * gets to ignore it; a caller rendering a sentence to a person must not.
 */

/** How long any call may take before we stop waiting. */
export const TIMEOUT_MS = 10_000

/**
 * Why a call did not produce what was asked for.
 *
 * Each one wants a different sentence and a different next move, which is the
 * whole reason they are not one value:
 *
 *  - `unreachable` — no response at all: timed out, offline, blocked. Her
 *    input may be perfect. Retry is safe and usually works.
 *  - `refused` — the server answered, and declined: storage down, or a cap
 *    reached. Deliberately one word, because netlify/shared/limit.ts makes a
 *    rate limit indistinguishable from an outage on purpose.
 *  - `not-a-code` — malformed before it was ever sent.
 *  - `not-found` — well formed, nothing under it.
 *  - `expired` — there was something, and its time ran out. Retrying is futile
 *    and the screen must not suggest it.
 *  - `taken` — someone got there first (409). Not an error in the usual sense;
 *    the thing she wanted done is done.
 *  - `garbled` — a 200 whose body was not what it claimed. Rare and worth
 *    separating, because retrying a malformed answer is pointless.
 */
export type Why = 'unreachable' | 'refused' | 'not-a-code' | 'not-found' | 'expired' | 'taken' | 'garbled'

/**
 * Fetch with a clock. Returns null when no response arrived at all — which is
 * a different fact from a response that said no, and callers must keep them
 * apart.
 */
export async function send(input: string, init: RequestInit = {}, ms: number = TIMEOUT_MS): Promise<Response | null> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: abort.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Read a failed response as one word.
 *
 * Consumes the body, so it is only ever called once and only on a response
 * already known to be unhappy. A 404 is asked which kind it is, because the
 * server distinguishes a code with nothing under it from one whose map lapsed
 * — and it deletes the lapsed one on that read, so the two want opposite
 * advice.
 */
export async function whyOf(res: Response | null): Promise<Why> {
  if (!res) return 'unreachable'
  if (res.status === 409) return 'taken'
  if (res.status === 400) return 'not-a-code'
  if (res.status === 404) {
    try {
      const { error } = (await res.json()) as { error?: string }
      return error === 'expired' ? 'expired' : 'not-found'
    } catch {
      return 'not-found'
    }
  }
  // 503 is the server saying no on purpose: storage down, or a cap reached.
  if (res.status === 503) return 'refused'
  return 'unreachable'
}
