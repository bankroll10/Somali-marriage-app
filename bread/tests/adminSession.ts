import type { createApp } from '../netlify/lib/app.ts'

/** A test client's address: the attempt limit is per IP, so tests name one. */
export const TEST_IP = '203.0.113.1'

/** POST the password to /api/admin-session as a client at `ip` would. */
export function signIn(app: ReturnType<typeof createApp>, password: string, ip: string | null = TEST_IP): Promise<Response> {
  return app.adminSignIn(new Request('https://bread.example/api/admin-session', { method: 'POST', body: JSON.stringify({ password }) }), ip)
}

/** Sign in and hand back the header every admin request must carry. */
export async function adminHeaders(app: ReturnType<typeof createApp>, password: string, ip: string | null = TEST_IP): Promise<Record<string, string>> {
  const res = await signIn(app, password, ip)
  if (res.status !== 200) throw new Error(`sign-in failed: ${res.status} ${await res.text()}`)
  const { token } = (await res.json()) as { token: string }
  return { authorization: `Bearer ${token}` }
}
