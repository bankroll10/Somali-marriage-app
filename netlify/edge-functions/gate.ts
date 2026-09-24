import type { Config } from '@netlify/edge-functions'

/**
 * The close switch.
 *
 * This was the founding-preview gate, and it did that job until 2026-09-12,
 * when `PREVIEW_PASSWORD` was deleted and the site opened (`docs/OPS.md`).
 * It is dormant now, and kept on purpose: setting that variable in Netlify
 * shuts every route behind HTTP Basic within one deploy, and that is the only
 * way to close this site in a single action.
 *
 * Why keep a dormant lock. `docs/OPS.md` and `docs/PRODUCT.md` both name the
 * same ending: one safety failure in a community this tight, amplified by the
 * reputation that is also the growth engine. If that day comes, the founder
 * needs the site closed in the minute she learns of it, not after a revert
 * and a build. One unused edge function is a cheap price for that minute.
 *
 * Netlify sells site-wide password protection on its paid plans, but the
 * feature is HTTP Basic Auth with a dashboard on top — so this is the same
 * protection, on the free tier. It runs at the edge, before anything is
 * served, which means a visitor without the password never receives the app's
 * HTML at all. A real lock, not a client-side curtain.
 *
 * `PREVIEW_PASSWORD` is a Netlify environment variable and stays server-side.
 * It is never bundled, never in the repository, and never needs to be known by
 * anyone but the people being let in.
 *
 * Unset → no gate, and that is the normal state now. It is also deliberate: a
 * missing variable must not lock the owner out of their own site, and local
 * builds and the published artifact should behave normally. The warning below
 * fires once per cold start so "the site is open" is visible in the deploy log
 * rather than assumed.
 */

/** Constant-time comparison, so the response time never leaks the password. */
function matches(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  // Compare lengths without branching out early; a length mismatch still walks
  // the full loop below against whichever is shorter.
  let diff = left.length ^ right.length
  const len = Math.min(left.length, right.length)
  for (let i = 0; i < len; i++) diff |= left[i] ^ right[i]
  return diff === 0
}

function unauthorized(): Response {
  return new Response(
    'Niyyah is closed right now. If you were given a password, your browser will ask for it.',
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Niyyah", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
        // Never let a shared cache hold either the challenge or what's behind it.
        'Cache-Control': 'no-store',
      },
    },
  )
}

let warnedNoPassword = false

export default async function gate(request: Request): Promise<Response | undefined> {
  const password = Netlify.env.get('PREVIEW_PASSWORD')
  // No password configured — the site is open, by design. See the note above.
  // Said once per cold start so that "the gate is off" is visible in the deploy
  // log rather than something you discover by loading the site in a private tab.
  if (!password) {
    if (!warnedNoPassword) {
      warnedNoPassword = true
      console.warn('[niyyah] PREVIEW_PASSWORD is not set — the site is open, which is the normal state since 2026-09-12')
    }
    return undefined
  }

  const header = request.headers.get('authorization')
  if (!header) return unauthorized()

  const [scheme, encoded] = header.split(' ')
  if (scheme?.toLowerCase() !== 'basic' || !encoded) return unauthorized()

  let decoded: string
  try {
    decoded = atob(encoded)
  } catch {
    return unauthorized()
  }

  // "user:password" — the username is ignored, so anyone can type anything
  // there. Only the shared password decides.
  const separator = decoded.indexOf(':')
  if (separator === -1) return unauthorized()
  const supplied = decoded.slice(separator + 1)

  if (!matches(supplied, password)) return unauthorized()

  // Authorised: return nothing and the request carries on to the app, the
  // static assets, or the Forms handler, exactly as if this function weren't here.
  return undefined
}

export const config: Config = { path: '/*' }
