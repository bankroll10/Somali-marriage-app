export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

export function error(code: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ error: code, ...extra }, status)
}

/** Parse a small JSON body, refusing anything oversized before reading it. */
export async function readJson<T>(req: Request, maxBytes = 8_000): Promise<T | Response> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > maxBytes) return error('too_large', 413)
  const text = await req.text()
  if (text.length > maxBytes) return error('too_large', 413)
  try {
    return JSON.parse(text) as T
  } catch {
    return error('bad_json', 400)
  }
}

/**
 * Where the site lives, for Stripe's return URLs. Netlify's own URL
 * variable when it is set — the request's Host is whatever the caller sent,
 * and a return URL is not something to build from a header — else the
 * request's origin, which is the case for tests and `netlify dev`.
 */
export function siteOrigin(req: Request): string {
  return process.env.URL || new URL(req.url).origin
}

/** The one place environment is read, so tests can set it and docs can list it. */
export const env = {
  get adminPassword() {
    return process.env.ADMIN_PASSWORD
  },
}
