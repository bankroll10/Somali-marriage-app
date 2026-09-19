import type { AdminSession } from '../../../shared/types.ts'

/**
 * Her session token, kept on the phone so she stays signed in between
 * shifts. It is a signed, expiring token, never the password; the server
 * decides whether it is still good on every request.
 */
const KEY = 'bread-admin-session'

export function loadSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AdminSession
    if (typeof s.token !== 'string' || typeof s.expiresAt !== 'string') return null
    if (Date.parse(s.expiresAt) <= Date.now()) {
      localStorage.removeItem(KEY)
      return null
    }
    return s
  } catch {
    return null
  }
}

export function saveSession(s: AdminSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode: works for this page load only */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
