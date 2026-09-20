import { useState } from 'react'
import type { Gender } from '../types'
import { SAFETY_REASONS } from '../data/safety'
import { sendReport } from '../lib/safety'
import { track } from '../lib/analytics'
import { Spinner, TextButton } from './ui'

interface Props {
  code: string
  /** This member's own side — who is raising the concern, not who it's about. */
  side: Gender
}

type State = 'closed' | 'open' | 'sending' | 'sent' | 'error'

/**
 * The one place a member can raise a concern about a specific, real person —
 * whoever is on the other side of this code. Trust promises reports have real
 * consequences; until this existed, nothing backed that sentence for anyone
 * met through the eleven. Founder-read only. Never a tally, never fed to
 * anything that learns. See netlify/functions/safety.ts and docs/LEARNING.md.
 */
export default function ReportConcern({ code, side }: Props) {
  const [state, setState] = useState<State>('closed')
  const [reason, setReason] = useState<string | null>(null)
  const [details, setDetails] = useState('')

  if (state === 'closed') {
    return (
      <TextButton
        onClick={() => setState('open')}
        className="mt-6 text-[0.82rem] font-medium text-muted hover:underline"
      >
        Something wrong? Report a concern.
      </TextButton>
    )
  }

  if (state === 'sent') {
    return (
      <p className="mt-6 text-[0.85rem] leading-relaxed text-muted text-pretty">
        Sent. Only the founder reads this, weekly, and what she does about it is written down.
      </p>
    )
  }

  return (
    <div className="mt-6 rounded-card border border-line bg-white/60 p-5">
      <p id="report-reason-label" className="text-[0.92rem] font-medium text-ink">What happened?</p>
      <div role="radiogroup" aria-labelledby="report-reason-label" className="mt-3 flex flex-col gap-2">
        {SAFETY_REASONS.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={reason === r.id}
            onClick={() => setReason(r.id)}
            className={`rounded-xl border px-3.5 py-2.5 text-left text-[0.88rem] leading-snug transition ${
              reason === r.id ? 'border-clay bg-clay/10 text-ink' : 'border-line text-ink-soft hover:border-clay/40'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        aria-label="Anything else it helps to know"
        value={details}
        onChange={(e) => setDetails(e.target.value.slice(0, 500))}
        placeholder="Anything else it helps to know (optional)"
        rows={3}
        className="mt-3 max-h-40 w-full resize-none rounded-xl border border-line bg-white p-3 text-[1rem] text-ink placeholder:text-muted"
      />
      <p className="mt-2 text-[0.78rem] leading-relaxed text-muted text-pretty">
        This reaches the founder only — not the other person, and not anything the app counts or learns from.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={!reason || state === 'sending'}
          onClick={async () => {
            setState('sending')
            const result = await sendReport(code, side, reason!, details.trim() || undefined)
            if (result === 'sent') track('safety_reported')
            setState(result === 'sent' ? 'sent' : 'error')
          }}
          className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-2.5 text-[0.85rem] font-medium text-cream transition hover:opacity-90 disabled:opacity-40"
        >
          {state === 'sending' ? (
            <>
              <Spinner /> Sending…
            </>
          ) : (
            'Send'
          )}
        </button>
        <TextButton onClick={() => setState('closed')} className="text-[0.85rem] font-medium text-muted hover:underline">
          Cancel
        </TextButton>
        {state === 'error' && <span className="text-[0.82rem] text-clay">Didn’t send — try again.</span>}
      </div>
    </div>
  )
}
