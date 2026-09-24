/**
 * The founder's key.
 *
 * Every readout this product produces — the ladder, how pairs come out on the
 * eleven, the guide's health, the safety queue, the backup — is
 * the only thing here a second team could not build for themselves, which is
 * exactly why none of it should be a public URL. This gates those routes
 * behind one bearer token, read from `FOUNDER_KEY`.
 *
 * **Unset means closed.** It used to mean open, on the reasoning that every
 * readout was aggregate and a public tally is embarrassing rather than
 * dangerous. That reasoning was wrong about two routes and weak about the
 * rest: `/export` returns every progress record whole, and the cost of a misconfigured deploy was silent
 * publication that the founder would learn of from a cold-start log line
 * (docs/BOARD.md). The cost of failing closed is one environment variable,
 * and the recovery is one line in docs/DEPLOY.md: set `FOUNDER_KEY`. Local
 * runs and tests set it too — a readout that answers without a key is the bug
 * this file exists to make impossible.
 *
 * Shared, not a function: Netlify treats every file in `netlify/functions` as
 * a deployable handler, so this lives beside that directory and is inlined by
 * the bundler. `tests/deploy-layout.test.ts` keeps it from wandering in.
 */

import { sameSecret } from './secret'

/**
 * Said once per cold start, not per request: a guard that is off should be
 * visible in the logs, not a wall of noise that gets filtered out.
 */
const warned = new Set<string>()

/** Test seam: forget what has already been said, the way progress.ts does. */
export function resetWarnings() {
  warned.clear()
}

function warnOnce(message: string) {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}


/**
 * True only when a key is configured and the request carries
 * `Authorization: Bearer <FOUNDER_KEY>`. Read per call, never at module load,
 * so tests can stub the environment between cases. A rotated key reaches the
 * functions with the next deploy: Netlify hands them variables at deploy time.
 */
export function isFounder(req: Request): boolean {
  const key = process.env.FOUNDER_KEY
  if (!key) {
    // Closed, and said once per cold start so the reason is in the logs
    // rather than in a 401 the founder has to guess at.
    warnOnce('[niyyah] FOUNDER_KEY is not set — every readout refuses until it is (docs/DEPLOY.md)')
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  const space = header.indexOf(' ')
  if (space === -1) return false
  const scheme = header.slice(0, space).toLowerCase()
  const token = header.slice(space + 1).trim()
  if (scheme !== 'bearer' || !token) return false
  // Constant-time, so the response time never leaks the key.
  return sameSecret(token, key)
}

/** The refusal. Names no key, caches nowhere. */
export function notFounder(): Response {
  return Response.json(
    { error: 'founder_only' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="Niyyah founder readout"',
        'Cache-Control': 'no-store',
      },
    },
  )
}

/**
 * The same gate. This was the fail-closed exception for `/safety` alone,
 * while every other readout failed open (docs/HARD.md row 6); since
 * docs/BOARD.md every readout fails closed, so the two are one gate. Kept as
 * a name because the safety queue is the route where the distinction mattered
 * most, and the call sites read better for saying so.
 */
export function requireFounder(req: Request): boolean {
  return isFounder(req)
}
