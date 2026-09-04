/**
 * The founder's key.
 *
 * Every readout this product produces — the ladder, the door's full tally, how
 * pairs come out on the eleven, the guide's health — is aggregate and holds no
 * person. It is also the only thing here a second team could not build for
 * themselves, which is exactly why it should not be a public URL. This gates
 * those routes behind one bearer token, read from `FOUNDER_KEY`.
 *
 * Unset means open — the same convention as `PREVIEW_PASSWORD` in the edge
 * gate, and for the same reason: a missing variable must never lock the owner
 * out of her own numbers, and local runs and tests should behave normally. The
 * trade is that forgetting to set it leaves the readouts as public as they
 * were before this file existed, so the README's deploy checklist checks for
 * a 401.
 *
 * Shared, not a function: Netlify treats every file in `netlify/functions` as
 * a deployable handler, so this lives beside that directory and is inlined by
 * the bundler. `tests/deploy-layout.test.ts` keeps it from wandering in.
 */

/** Constant-time comparison, so the response time never leaks the key. */
function matches(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  const len = Math.min(left.length, right.length)
  for (let i = 0; i < len; i++) diff |= left[i] ^ right[i]
  return diff === 0
}

/**
 * True when no key is configured, or the request carries
 * `Authorization: Bearer <FOUNDER_KEY>`. Read per call, never at module load:
 * a rotated key must take effect on the next request, and tests stub the
 * environment between cases.
 */
export function isFounder(req: Request): boolean {
  const key = process.env.FOUNDER_KEY
  if (!key) return true
  const header = req.headers.get('authorization') ?? ''
  const space = header.indexOf(' ')
  if (space === -1) return false
  const scheme = header.slice(0, space).toLowerCase()
  const token = header.slice(space + 1).trim()
  if (scheme !== 'bearer' || !token) return false
  return matches(token, key)
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
