import type { Config } from '@netlify/edge-functions'

/**
 * The founding-preview gate.
 *
 * Netlify sells site-wide password protection on its paid plans, but the feature
 * is HTTP Basic Auth with a dashboard on top — so this is the same protection,
 * on the free tier. It runs at the edge, before anything is served, which means
 * an unauthenticated visitor never receives the app's HTML at all. A real lock,
 * not a client-side curtain.
 *
 * `PREVIEW_PASSWORD` is a Netlify environment variable and stays server-side.
 * It is never bundled, never in the repository, and never needs to be known by
 * anyone but the people being let in.
 *
 * Unset → no gate. That is deliberate: a missing variable must not lock the
 * owner out of their own site, and local builds and the published artifact
 * should behave normally. The trade is that forgetting to set it leaves the
 * site open, so the deploy checklist verifies a bare request gets a 401.
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
    'Niyyah is in founding preview. If you were given a password, your browser will ask for it.',
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Niyyah founding preview", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
        // Never let a shared cache hold either the challenge or what's behind it.
        'Cache-Control': 'no-store',
      },
    },
  )
}

export default async function gate(request: Request): Promise<Response | undefined> {
  const password = Netlify.env.get('PREVIEW_PASSWORD')
  // No password configured — the site is open, by design. See the note above.
  if (!password) return undefined

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
