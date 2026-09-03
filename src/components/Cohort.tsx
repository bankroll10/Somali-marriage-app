import { useEffect, useState } from 'react'
import type { Identity, WaitlistState } from '../types'
import { scenes, getScene } from '../data/scenes'
import { getHookOption } from '../data/hook'
import { COHORT_TARGET, cohortCount, joinCohort, type CohortCount } from '../lib/cohort'
import { joinWaitlist, mailtoFor, waitlistConfigured, CONTACT_EMAIL } from '../lib/waitlist'
import { track } from '../lib/analytics'
import { ArrowRight, CheckIcon, Spinner, fieldClass } from './ui'

interface Props {
  identity: Identity
  overall?: number
  /** Her answer to "what's the hardest part" — the need this counts. */
  hookId?: string
  /** Guide voices she has actually used, so the tally knows what people reach for. */
  voices?: string[]
  joined: WaitlistState | null
  onJoined: (state: WaitlistState) => void
  /** When she picks a city here, the rest of the app should know it too. */
  onScene?: (scene: string) => void
  /** Quieter variant for Home and Profile; the full card is for the map. */
  compact?: boolean
}

/**
 * The founding cohort.
 *
 * The one thing this app cannot give her yet is the thing she came for: a real
 * person. Every other marriage app hides that behind a full-looking feed. This
 * does the opposite — it puts the real number on the door, says what the city
 * opens at, and asks her to be one of the people who makes it open.
 *
 * It is an exchange, not a favour. Her map's job is to be matched; keeping it
 * and leaving a way to reach her is how that job gets done. In return she is
 * counted, she can watch the number move, and the day someone here fits her
 * map, she hears about it — and nobody else does.
 */
export default function Cohort({ identity, overall, hookId, voices, joined, onJoined, onScene, compact }: Props) {
  const configured = waitlistConfigured()
  const [contact, setContact] = useState('')
  const [scene, setScene] = useState(joined?.scene ?? identity.scene ?? '')
  const [count, setCount] = useState<CohortCount | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')

  // The real number, read fresh every time the card is shown. Never cached
  // into a guess: if it cannot be read, the card says so.
  useEffect(() => {
    if (!scene) return
    let live = true
    cohortCount(scene).then((c) => {
      if (live) setCount(c)
    })
    return () => {
      live = false
    }
  }, [scene])

  const place = getScene(scene)
  const city = place && place.id !== 'other' ? place.label : 'Your city'
  const seeking = identity.gender === 'man' ? 'women' : 'men'

  if (joined) {
    return (
      <div className={`rounded-card border border-forest/25 bg-forest/[0.06] ${compact ? 'px-5 py-4' : 'p-6'}`}>
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
          <CheckIcon size={12} /> You’re counted
        </p>
        <div className="mt-3">
          <Door count={count} />
        </div>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
          The day someone in {city} fits your map, we write to{' '}
          <span className="font-medium text-ink">{joined.contact}</span> — and to nobody
          else. Until both sides are here, nobody is introduced to anyone.
        </p>
        {joined.code && (
          <p className="mt-2 text-[0.85rem] leading-relaxed text-muted text-pretty">
            Your map is kept under <span className="select-all font-medium tracking-[0.15em] text-ink">{joined.code}</span> —
            it opens your map on any phone.
          </p>
        )}
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim() || !scene || !identity.gender || state === 'sending') return
    setState('sending')

    // First the count — it needs a kept map, and it is the part that can fail.
    const result = await joinCohort({
      scene,
      gender: identity.gender,
      hook: hookId,
      overall,
      voices,
    })
    if (!result) {
      setState('error')
      return
    }
    setCount(result)

    // Then the way to reach her, to the founder's form. A bad connection here
    // is queued and retried on the next visit rather than lost.
    const trimmed = contact.trim()
    const at = new Date().toISOString()
    const sent = await joinWaitlist({
      contact: trimmed,
      code: result.code,
      scene,
      gender: identity.gender,
      overall,
      hardestPart: getHookOption(hookId)?.label,
      at,
    })
    track('cohort_joined', { scene, queued: sent === 'queued', unconfigured: sent === 'unconfigured' })
    onJoined({ contact: trimmed, scene, code: result.code, joinedAt: at })
  }

  const disabled = !contact.trim() || !scene || !identity.gender || state === 'sending'

  return (
    <div className={`rounded-card border border-gold/30 bg-gold/[0.07] ${compact ? 'px-5 py-5' : 'p-6'}`}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
        Founding cohort{place ? ` · ${place.label}` : ''}
      </p>
      <p
        className={`mt-2.5 font-display font-medium leading-snug tracking-tight text-ink text-balance ${compact ? 'text-[1.2rem]' : 'text-[1.45rem]'}`}
      >
        Your map’s job is to be matched.
      </p>
      <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
        {city} opens when {COHORT_TARGET} women and {COHORT_TARGET} men have kept a map
        and can be reached. Nobody is introduced to anyone before then. The real
        count today:
      </p>
      <div className="mt-3.5">
        {scene ? (
          <Door count={count} />
        ) : (
          <p className="text-[0.85rem] text-muted">Pick your city to see it.</p>
        )}
      </div>
      {!compact && (
        <p className="mt-3.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
          Keep your map, leave a way to reach you, and the day one of the {seeking} here
          fits it, you hear from us — and nobody else does.
        </p>
      )}

      {configured ? (
        <form onSubmit={submit} className="mt-4 space-y-2.5">
          {!identity.scene && (
            <select
              value={scene}
              onChange={(e) => {
                setScene(e.target.value)
                setCount(null)
                if (e.target.value) onScene?.(e.target.value)
              }}
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
          )}
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or phone"
            aria-label="Email or phone"
            className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
          />
          <button
            type="submit"
            disabled={disabled}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-[0.92rem] font-medium text-cream transition hover:bg-forest-deep disabled:opacity-40"
          >
            {state === 'sending' ? (
              <>
                <Spinner /> Counting you in…
              </>
            ) : (
              <>
                Count me in
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          {state === 'error' && (
            <p className="text-[0.85rem] text-clay text-pretty">
              That didn’t go through — nothing is lost, your map is still here. Try
              again in a moment, or email {CONTACT_EMAIL}.
            </p>
          )}
          {/* This list must match what joinCohort and joinWaitlist send. A
              privacy claim is the one thing that must never drift from the code
              it describes. */}
          <p className="text-[0.78rem] leading-relaxed text-muted text-pretty">
            We send your email or phone, your city, who you’re seeking, the hardest
            part you named and your overall number. Your map is kept under a code
            with no name on it, so it can be matched. Your answers stay yours.
          </p>
        </form>
      ) : (
        <div className="mt-4">
          <a
            href={mailtoFor({ scene, gender: identity.gender })}
            className="group inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-[0.92rem] font-medium text-cream transition hover:bg-forest-deep"
          >
            Email us for a place
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
          <p className="mt-3 text-[0.78rem] text-muted text-pretty">{CONTACT_EMAIL} — we read every one.</p>
        </div>
      )}

      {!compact && (
        <div className="mt-5 border-t border-gold/20 pt-4">
          <p className="text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
            “I’m building this by hand, one city at a time, and I’d rather show you
            an honest zero than a feed full of people who aren’t real. {city} opens
            the day both sides are here. Until then, your map and your guide are
            yours — and the count above is the plan.”
          </p>
          <p className="mt-2 text-[0.8rem] font-medium text-muted">— Mohamed, who’s building Niyyah</p>
        </div>
      )}
    </div>
  )
}

/**
 * The number on the door. Two bars, the real figures, and the target — read
 * live, never seeded. A count that cannot be read says so rather than showing
 * a zero it does not know to be true.
 */
function Door({ count }: { count: CohortCount | null }) {
  if (!count) {
    return <p className="text-[0.85rem] text-muted">The count isn’t reachable right now.</p>
  }
  return (
    <div className="space-y-2.5">
      <Bar label="Women" value={count.women} target={count.target} />
      <Bar label="Men" value={count.men} target={count.target} />
    </div>
  )
}

function Bar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.85rem]">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className="text-muted tabular-nums">
          <span className="font-display text-[1.15rem] font-medium text-forest">{value}</span> / {target}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-forest transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
