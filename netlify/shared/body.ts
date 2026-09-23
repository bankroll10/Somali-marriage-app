/**
 * A request body, read the one way every public write reads it.
 *
 * Seven functions each carried the same eleven lines — take the text, measure
 * it before parsing, parse it — and every copy trusted the parse to hand back
 * an object. It need not: `JSON.parse('null')` is `null`, and each handler
 * then read `body.code` off it and threw, past its own error contract, leaving
 * the platform to answer in whatever shape it answers in (docs/SECURITY.md,
 * O3). A body that is not a plain object is not a body any route here accepts.
 *
 * Measured before it is parsed, as before: an oversized body is refused
 * without ever being walked. The platform's own ceiling (6 MB for a function)
 * is what bounds the read itself.
 *
 * Shared, not a function — see netlify/shared/founder.ts for why this lives
 * beside `netlify/functions` rather than in it.
 */

const refuse = (error: string, status: number) => Response.json({ error }, { status })

/** The body as an object, or the Response that refuses it. */
export async function readJson<T extends object = Record<string, unknown>>(req: Request, max: number): Promise<T | Response> {
  let raw: string
  try {
    raw = await req.text()
  } catch {
    return refuse('bad_json', 400)
  }
  if (raw.length > max) return refuse('too_large', 413)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return refuse('bad_json', 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return refuse('bad_json', 400)
  return body as T
}
