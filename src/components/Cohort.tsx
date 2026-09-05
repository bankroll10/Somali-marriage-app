import { useEffect, useState } from 'react'
import type { Identity, WaitlistState } from '../types'
import { scenes, getScene } from '../data/scenes'
import { getHookOption } from '../data/hook'
import { COHORT_TARGET, cohortCount, joinCohort, type CohortCount } from '../lib/cohort'
import { joinWaitlist, mailtoFor, waitlistConfigured, CONTACT_EMAIL } from '../lib/waitlist'
import { instrumentLink } from '../lib/links'
import { shareOrCopy } from '../lib/share'
import { track } from '../lib/analytics'
import { ArrowRight, CheckIcon, Spinner, fieldClass } from './ui'

interface Props {
  identity: Identity
  /** Her answer to "what's the hardest part" — the need this counts. */
  hookId?: string
  /** What she has done here (ledger ids) — the seriousness that gets her counted. */
  ledger?: string[]
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
 * counted, and the day someone here fits her map, she hears about it — and
 * nobody else does. The count is a sentence, not two progress bars: there is
 * nothing here to come back and watch.
 */
export default function Cohort({ identity, hookId, ledger, joined, onJoined, onScene, compact }: Props) {
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
  const one = identity.gender === 'man' ? 'woman' : 'man'
  const them = identity.gender === 'man' ? 'her' : 'him'
  const [sent, setSent] = useState(false)

  // The door is a collective goal, and the honest ask is the useful one: the
  // city opens when both sides are counted, so if she knows one serious man,
  // the most useful thing she can do for herself is send him the read. No
  // count of who she sent it to, anywhere; the only number is the door's.
  async function sendTheRead() {
    const result = await shareOrCopy(
      {
        text: `Salaam — Niyyah is being built for us, one city at a time, and ${city} opens when forty serious women and forty serious men are counted. Start with the read: ninety seconds on what someone has actually done, and the one question to ask next. No account.`,
        url: instrumentLink('read', 'door'),
      },
      'door_sent',
    )
    if (result === 'copied') {
      setSent(true)
      window.setTimeout(() => setSent(false), 2400)
    }
  }

  if (joined) {
    return (
      <div className={`rounded-card border border-forest/25 bg-forest/[0.06] ${compact ? 'px-5 py-4' : 'p-6'}`}>
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
          <CheckIcon size={12} /> You’re counted
        </p>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
          <Door count={count} city={city} /> The day someone in {city} fits your map, we
          write to{' '}
          <span className="font-medium text-ink">{joined.contact || 'the address you gave'}</span>{' '}
          — and to nobody else. There is nothing to check back on; you will hear from us.
        </p>
        {joined.code && (
          <p className="mt-2 text-[0.85rem] leading-relaxed text-muted text-pretty">
            Your map is kept under <span className="select-all font-medium tracking-[0.15em] text-ink">{joined.code}</span> —
            it opens your map on any phone.
          </p>
        )}
        <div className="mt-4 border-t border-forest/15 pt-4">
          <p className="text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
            {city} opens at {COHORT_TARGET} each. If you know one serious {one}, send {them} this.
          </p>
          <button
            onClick={sendTheRead}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-forest/30 px-4 py-2 text-[0.85rem] font-medium text-forest transition hover:bg-forest/[0.06]"
          >
            {sent ? (
              <>
                <CheckIcon size={12} /> Copied to send
              </>
            ) : (
              'Send the read'
            )}
          </button>
        </div>
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
      ledger,
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
        and can be reached. Nobody is introduced to anyone before then.{' '}
        {scene ? <Door count={count} city={city} /> : 'Pick your city to see where it stands.'}
      </p>
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
            part you named, and which of the things on your Trust page you’ve
            done. Nothing about how your map read, and nothing about how you use
            the app. Your map is kept under a code with no name on it, so it can be
            matched. Your answers stay yours.
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
 * The number on the door, as a sentence. It used to be two bars filling toward
 * forty — a scarcity meter, the kind a person comes back to watch. The fact
 * is the same; the form no longer asks for a return visit. A count that cannot
 * be read says so rather than showing a zero it does not know to be true.
 */
function Door({ count, city }: { count: CohortCount | null; city: string }) {
  if (!count) return <span>The count isn’t reachable right now.</span>
  const w = count.women === 1 ? 'one woman' : `${count.women} women`
  const m = count.men === 1 ? 'one man' : `${count.men} men`
  return (
    <span>
      <span className="font-medium text-ink">
        {city} today: {w}, {m}.
      </span>{' '}
      It opens at {count.target} each.
    </span>
  )
}
