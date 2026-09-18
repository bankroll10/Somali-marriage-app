/** Constant-time comparison, so the response time never leaks the password. */
export function matches(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  const len = Math.min(left.length, right.length)
  for (let i = 0; i < len; i++) diff |= left[i] ^ right[i]
  return diff === 0
}

export type AdminCheck = 'ok' | 'unconfigured' | 'denied'

/**
 * The admin page holds names and phone numbers, so — unlike a preview gate —
 * a missing password must lock everyone out, not let everyone in.
 */
export function checkAdmin(req: Request, password: string | undefined): AdminCheck {
  if (!password) return 'unconfigured'
  const header = req.headers.get('authorization') ?? ''
  const [scheme, ...rest] = header.split(' ')
  const supplied = rest.join(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !supplied) return 'denied'
  return matches(supplied, password) ? 'ok' : 'denied'
}
