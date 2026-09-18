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

/** Where the site lives, for Stripe's return URLs. */
export function siteOrigin(req: Request): string {
  const configured = process.env.URL
  const origin = new URL(req.url).origin
  // Netlify's dev server and branch deploys are on other origins than URL;
  // trust the request when it is not localhost-on-a-function-port nonsense.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) return configured || origin
  return origin
}

/** The one place environment is read, so tests can set it and docs can list it. */
export const env = {
  get stripeSecret() {
    return process.env.STRIPE_SECRET_KEY
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD
  },
}
