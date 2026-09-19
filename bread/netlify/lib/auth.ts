import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'
import type { Queryable } from './db/client.ts'

/**
 * The admin's front door: one password, hardened.
 *
 * The password is sent once, to /api/admin-session, and exchanged for a
 * signed session token; every later request carries the token, never the
 * password. Tokens are HMAC-signed with a key derived from the password
 * itself, so there is no second secret to manage and changing the password
 * signs everyone out. Guessing is rate-limited in the database — per IP and
 * overall — because function instances share no memory. The overall cap is
 * what stops a guesser with many addresses; it is high enough that five
 * addresses cannot lock her out for a quarter of an hour on purpose.
 *
 * Chosen by the owner over a hosted identity provider for a shop of a
 * handful of customers; see docs/BUILD_STATUS.md.
 */

export const SESSION_DAYS = 30
export const ATTEMPT_WINDOW_MINUTES = 15
export const MAX_FAILURES_PER_IP = 5
export const MAX_FAILURES_GLOBAL = 50

const TOKEN_VERSION = 'v1'
const DAY = 86_400_000

/** Constant-time comparison, so the response time never leaks the password. */
export function matches(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) {
    // Still do a comparison of equal length so timing does not reveal length either.
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

function signingKey(password: string): Buffer {
  return Buffer.from(hkdfSync('sha256', password, 'bread-admin', `session-${TOKEN_VERSION}`, 32))
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const sign = (key: Buffer, payload: string) => createHmac('sha256', key).update(payload).digest('base64url')

/** A session for whoever just proved they know the password. */
export function issueSession(password: string, nowMs: number): { token: string; expiresAt: string } {
  const exp = nowMs + SESSION_DAYS * DAY
  const payload = b64(JSON.stringify({ iat: nowMs, exp }))
  const token = `${TOKEN_VERSION}.${payload}.${sign(signingKey(password), payload)}`
  return { token, expiresAt: new Date(exp).toISOString() }
}

export type SessionCheck = 'ok' | 'unconfigured' | 'denied' | 'expired'

/**
 * The admin page holds names and phone numbers, so — unlike a preview gate —
 * a missing password must lock everyone out, not let everyone in.
 */
export function checkSession(req: Request, password: string | undefined, nowMs: number): SessionCheck {
  if (!password) return 'unconfigured'
  const header = req.headers.get('authorization') ?? ''
  const [scheme, ...rest] = header.split(' ')
  const token = rest.join(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return 'denied'
  const [version, payload, signature] = token.split('.')
  if (version !== TOKEN_VERSION || !payload || !signature) return 'denied'
  if (!matches(signature, sign(signingKey(password), payload))) return 'denied'
  let claims: { exp?: unknown }
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return 'denied'
  }
  if (typeof claims.exp !== 'number') return 'denied'
  return claims.exp > nowMs ? 'ok' : 'expired'
}

/** Netlify hands the caller's address to functions as context.ip; the header is the fallback. */
export function clientIp(req: Request, context?: { ip?: string }): string | null {
  return context?.ip || req.headers.get('x-nf-client-connection-ip') || null
}

export type Throttle = { allowed: true } | { allowed: false; retryAfterSeconds: number }

/** May this address try the password right now? */
export async function throttle(db: Queryable, ip: string | null, nowMs: number): Promise<Throttle> {
  const since = new Date(nowMs - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString()
  const { rows } = await db.query<{ ip_failures: number; all_failures: number; ip_oldest_ms: number | null; all_oldest_ms: number | null }>(
    `SELECT count(*) FILTER (WHERE ip IS NOT DISTINCT FROM $2)::int AS ip_failures,
            count(*)::int AS all_failures,
            extract(epoch FROM min(at) FILTER (WHERE ip IS NOT DISTINCT FROM $2))::float8 * 1000 AS ip_oldest_ms,
            extract(epoch FROM min(at))::float8 * 1000 AS all_oldest_ms
     FROM admin_sign_ins WHERE NOT ok AND at > $1::timestamptz`,
    [since, ip],
  )
  const r = rows[0]
  const until = (oldestMs: number | null) => Math.max(1, Math.ceil((Math.round(oldestMs ?? nowMs) + ATTEMPT_WINDOW_MINUTES * 60_000 - nowMs) / 1000))
  if (r.ip_failures >= MAX_FAILURES_PER_IP) return { allowed: false, retryAfterSeconds: until(r.ip_oldest_ms) }
  if (r.all_failures >= MAX_FAILURES_GLOBAL) return { allowed: false, retryAfterSeconds: until(r.all_oldest_ms) }
  return { allowed: true }
}

/** Record the attempt, and let yesterday's rows go. */
export async function recordAttempt(db: Queryable, ip: string | null, ok: boolean, nowMs: number): Promise<void> {
  const now = new Date(nowMs).toISOString()
  await db.query('INSERT INTO admin_sign_ins (at, ip, ok) VALUES ($1::timestamptz, $2, $3)', [now, ip, ok])
  await db.query("DELETE FROM admin_sign_ins WHERE at < $1::timestamptz - interval '1 day'", [now])
}
