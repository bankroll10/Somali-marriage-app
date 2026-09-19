import { useState } from 'react'
import { SHOP_NAME } from '../../../shared/config.ts'
import type { AdminSession } from '../../../shared/types.ts'
import { ApiError, adminSignIn } from '../../lib/api.ts'
import { Button, Field, Notice, Page, Title, inputClass } from '../ui.tsx'

type Reason = 'expired' | 'signed_out' | null

/** The front door: the password once, then a session that lives on her phone. */
export default function SignIn({ reason, onSignedIn }: { reason: Reason; onSignedIn: (s: AdminSession) => void }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<{ code: string; retryAfterSeconds?: number } | null>(null)

  async function submit() {
    const pw = typed.trim()
    if (!pw || busy) return
    setBusy(true)
    setProblem(null)
    try {
      const session = await adminSignIn(pw)
      setTyped('')
      onSignedIn(session)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'offline'
      const retryAfterSeconds = err instanceof ApiError && typeof err.detail.retryAfterSeconds === 'number' ? err.detail.retryAfterSeconds : undefined
      setProblem({ code, retryAfterSeconds })
    } finally {
      setBusy(false)
    }
  }

  const minutes = problem?.retryAfterSeconds ? Math.max(1, Math.ceil(problem.retryAfterSeconds / 60)) : 0

  return (
    <Page>
      <Title kicker={SHOP_NAME} sub="The password opens your orders for this phone. You stay signed in for a month.">
        Orders
      </Title>
      {reason === 'expired' && (
        <div className="mb-4">
          <Notice tone="info">Your session ended. Sign in again to keep going.</Notice>
        </div>
      )}
      {problem && (
        <div className="mb-4">
          <Notice tone="error">
            {problem.code === 'unauthorized' && 'That password was not right.'}
            {problem.code === 'too_many_attempts' && `Too many tries. Wait ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`}
            {problem.code === 'admin_not_configured' && 'No admin password is set on this site yet. Add ADMIN_PASSWORD in Netlify and redeploy.'}
            {problem.code === 'offline' && 'No connection. Check your signal and try again.'}
            {!['unauthorized', 'too_many_attempts', 'admin_not_configured', 'offline'].includes(problem.code) && 'Could not sign in right now. Try again in a moment.'}
          </Notice>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-4"
      >
        <Field label="Admin password">
          <input className={inputClass} type="password" autoComplete="current-password" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus disabled={busy} />
        </Field>
        <Button type="submit" disabled={!typed.trim() || busy}>
          {busy ? 'Signing in…' : 'Open orders'}
        </Button>
      </form>
    </Page>
  )
}
