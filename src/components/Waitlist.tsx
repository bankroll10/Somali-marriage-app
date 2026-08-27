import { useState } from 'react'
import type { Identity, WaitlistState } from '../types'
import { scenes } from '../data/scenes'
import { joinWaitlist, mailtoFor, waitlistConfigured, CONTACT_EMAIL } from '../lib/waitlist'
import { track } from '../lib/analytics'
import { ArrowRight, CheckIcon, Spinner, fieldClass } from './ui'

interface Props {
  identity: Identity
  /** Readiness score, sent along so demand can be read against seriousness. */
  overall?: number
  joined: WaitlistState | null
  onJoined: (state: WaitlistState) => void
  /** Quiet variant for Profile; the full card is for the map reveal. */
  compact?: boolean
}

/**
 * Save your place.
 *
 * A matrimonial product is worth nothing until both sides of one city are here
 * at the same time, so the honest ask isn't "sign up" — it's "tell us where you
 * are, and we'll open your city when there are enough serious people in it."
 * That turns the cold-start problem into the plan, and it's the only way this
 * app can reach a person again after they close the tab.
 */
export default function Waitlist({ identity, overall, joined, onJoined, compact }: Props) {
  const configured = waitlistConfigured()
  const [email, setEmail] = useState('')
  const [scene, setScene] = useState(identity.scene ?? '')
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')

  const sceneLabel = scenes.find((s) => s.id === (joined?.scene ?? scene))?.label

  if (joined) {
    return (
      <div
        className={`rounded-card border border-forest/25 bg-forest/[0.06] ${compact ? 'px-5 py-4' : 'p-6'}`}
      >
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
          <CheckIcon size={12} /> Your place is saved
        </p>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
          {sceneLabel ? `${sceneLabel} — you’re counted. ` : 'You’re counted. '}
          We’ll write when there are enough of us to open it properly, and not
          before.
        </p>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || state === 'sending') return
    setState('sending')
    const result = await joinWaitlist({
      email: email.trim(),
      scene: scene || undefined,
      gender: identity.gender,
      overall,
      at: new Date().toISOString(),
    })
    if (result === 'unconfigured') {
      setState('error')
      return
    }
    // 'queued' still counts to the person — it's kept and retried on next load.
    track('waitlist_joined', { scene, queued: result === 'queued' })
    onJoined({ email: email.trim(), scene: scene || undefined, joinedAt: new Date().toISOString() })
  }

  return (
    <div
      className={`rounded-card border border-gold/30 bg-gold/[0.07] ${compact ? 'px-5 py-5' : 'p-6'}`}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
        Opening one city at a time
      </p>
      <p
        className={`mt-2.5 font-display font-medium leading-snug tracking-tight text-ink text-balance ${compact ? 'text-[1.2rem]' : 'text-[1.45rem]'}`}
      >
        Save your place.
      </p>
      <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
        Minneapolis first, then Toronto, London, Columbus. A marriage platform is
        worth nothing until enough of us are in one place — so tell us where you
        are, and your city opens when it’s ready. Until then, your daily
        reflection comes to you.
      </p>

      {configured ? (
        <form onSubmit={submit} className="mt-4 space-y-2.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Your email"
            className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
          />
          <select
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            aria-label="Your community"
            className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
          >
            <option value="">Where are you?</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!email.trim() || state === 'sending'}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-[0.92rem] font-medium text-cream transition hover:bg-forest-deep disabled:opacity-40"
          >
            {state === 'sending' ? (
              <>
                <Spinner /> Saving your place…
              </>
            ) : (
              <>
                Save my place
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          {state === 'error' && (
            <p className="text-[0.85rem] text-clay text-pretty">
              That didn’t go through. Email us at {CONTACT_EMAIL} and we’ll add you by hand.
            </p>
          )}
          <p className="text-[0.78rem] text-muted text-pretty">
            Your email, your city. Nothing else leaves this device — not your map,
            not your answers.
          </p>
        </form>
      ) : (
        // No endpoint wired up yet. Never claim someone joined a list that
        // doesn't exist — send them somewhere a human actually reads.
        <div className="mt-4">
          <a
            href={mailtoFor({ scene, gender: identity.gender })}
            className="group inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-[0.92rem] font-medium text-cream transition hover:bg-forest-deep"
          >
            Email us for a place
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
          <p className="mt-3 text-[0.78rem] text-muted text-pretty">
            {CONTACT_EMAIL} — we read every one.
          </p>
        </div>
      )}
    </div>
  )
}
