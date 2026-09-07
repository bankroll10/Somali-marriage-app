import { useEffect, useState } from 'react'
import type { Identity, Reach, WaitlistState } from '../types'
import { countryFor, getScene, scenes } from '../data/scenes'
import { countries, getCountry } from '../data/countries'
import { getHookOption } from '../data/hook'
import { hesitationOptions, type Hesitation } from '../data/hesitation'
import { COHORT_TARGET, cohortCount, joinCohort, type CohortCount, type SideCount } from '../lib/cohort'
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
  /** When she is somewhere else and names the country, likewise. */
  onCountry?: (country: string) => void
  /** When she says she would travel, likewise. */
  onReach?: (reach: Reach) => void
  /** She is not walking through the door yet, and said why — one word about the door. */
  onHesitate?: (reason: Hesitation) => void
  /** Quieter variant for Home and Profile; the full card is for the map. */
  compact?: boolean
}

/**
 * The founding cohort.
 *
 * The one thing this app cannot give her yet is the thing she came for: a real
 * person. Every other marriage app hides that behind a full-looking feed. This
 * does the opposite — it puts the real number on the door, says what the pool
 * opens at, and asks her to be one of the people who makes it open.
 *
 * The number is two numbers. Her city, because that is where she can meet
 * someone this week; and the people in her country who said they would travel
 * for the right person, because for most of the diaspora — a hundred small
 * pockets, not five big ones — that is the only count that will ever reach
 * forty. A woman in a city of nine used to see nine. Now she sees the nine, and
 * the thirty-one across the country who would come to her, and one tap puts her
 * among them.
 *
 * It is an exchange, not a favour. Her map's job is to be matched; keeping it
 * and leaving a way to reach her is how that job gets done. In return she is
 * counted, and the day someone here fits her map, she hears about it — and
 * nobody else does. The count is a sentence, not two progress bars: there is
 * nothing here to come back and watch.
 */
export default function Cohort({ identity, hookId, ledger, joined, onJoined, onScene, onCountry, onReach, onHesitate, compact }: Props) {
  const configured = waitlistConfigured()
  const [contact, setContact] = useState('')
  // "Not now" — the one no this product records, as one word about the door.
  const [hesitating, setHesitating] = useState<'closed' | 'open' | 'said'>('closed')
  const [scene, setScene] = useState(joined?.scene ?? identity.scene ?? '')
  // The country she names when she is somewhere else and nothing upstream
  // holds it yet. A named city already knows its country.
  const [namedCountry, setNamedCountry] = useState('')
  // Said she would travel here, before anything upstream has heard it.
  const [travelled, setTravelled] = useState(false)
  const [count, setCount] = useState<CohortCount | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')

  const country = countryFor({ scene, country: identity.country }) ?? (scene === 'other' ? namedCountry : '')
  const reach: Reach = identity.reach ?? (travelled ? 'country' : 'city')

  // The real number, read fresh every time the card is shown. Never cached
  // into a guess: if it cannot be read, the card says so.
  useEffect(() => {
    if (!scene || !country) return
    let live = true
    cohortCount(scene, country).then((c) => {
      if (live) setCount(c)
    })
    return () => {
      live = false
    }
  }, [scene, country])

  const place = getScene(scene)
  const other = scene === 'other'
  const within = getCountry(country)?.within ?? 'your country'
  const city = place && !other ? place.label : 'Your city'
  // The pool she is counted in, named: her city, or — somewhere else — her country.
  const pool = other ? within : city
  const seeking = identity.gender === 'man' ? 'women' : 'men'
  const one = identity.gender === 'man' ? 'woman' : 'man'
  const them = identity.gender === 'man' ? 'her' : 'him'
  const [sent, setSent] = useState(false)

  // The door is a collective goal, and the honest ask is the useful one: the
  // pool opens when both sides are counted, so if she knows one serious man,
  // the most useful thing she can do for herself is send him the read. No
  // count of who she sent it to, anywhere; the only number is the door's.
  async function sendTheRead() {
    const result = await shareOrCopy(
      {
        text: `Salaam — Niyyah is being built for us, one city at a time, and ${pool} opens when forty serious women and forty serious men are counted. Start with the read: ninety seconds on what someone has actually done, and the one question to ask next. No account.`,
        url: instrumentLink('read', 'door'),
      },
      'door_sent',
    )
    if (result === 'copied') {
      setSent(true)
      window.setTimeout(() => setSent(false), 2400)
    }
  }

  // One tap: she would travel within her country. If she is already counted,
  // her entry is replaced so the door moves now rather than on her next join.
  async function travel() {
    setTravelled(true)
    onReach?.('country')
    if (joined && identity.gender && country) {
      const result = await joinCohort({ scene, gender: identity.gender, hook: hookId, ledger, country, reach: 'country' })
      if (result) setCount(result)
    }
  }

  const travelAsk =
    country && reach === 'city' ? (
      <button
        onClick={travel}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-2 text-[0.85rem] font-medium text-forest transition hover:bg-gold/[0.08]"
      >
        I’d travel within {within}
      </button>
    ) : null

  if (joined) {
    return (
      <div className={`rounded-card border border-forest/25 bg-forest/[0.06] ${compact ? 'px-5 py-4' : 'p-6'}`}>
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
          <CheckIcon size={12} /> You’re counted
        </p>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
          <DoorCount count={count} city={city} within={within} other={other} /> The day someone in {pool} fits your map, we
          write to{' '}
          <span className="font-medium text-ink">{joined.contact || 'the address you gave'}</span>{' '}
          — and to nobody else. There is nothing to check back on; you will hear from us.
        </p>
        {travelAsk}
        {joined.code && (
          <p className="mt-2 text-[0.85rem] leading-relaxed text-muted text-pretty">
            Your map is kept under <span className="select-all font-medium tracking-[0.15em] text-ink">{joined.code}</span> —
            it opens your map on any phone.
          </p>
        )}
        <div className="mt-4 border-t border-forest/15 pt-4">
          <p className="text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
            {pool} opens at {COHORT_TARGET} each. If you know one serious {one}, send {them} this.
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
    if (!contact.trim() || !scene || !country || !identity.gender || state === 'sending') return
    setState('sending')

    // First the count — it needs a kept map, and it is the part that can fail.
    const result = await joinCohort({
      scene,
      gender: identity.gender,
      country,
      reach,
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
      country,
      reach,
      gender: identity.gender,
      hardestPart: getHookOption(hookId)?.label,
      at,
    })
    track('cohort_joined', { scene, queued: sent === 'queued', unconfigured: sent === 'unconfigured' })
    onJoined({ contact: trimmed, scene, code: result.code, joinedAt: at })
  }

  const disabled = !contact.trim() || !scene || !country || !identity.gender || state === 'sending'

  return (
    <div className={`rounded-card border border-gold/30 bg-gold/[0.07] ${compact ? 'px-5 py-5' : 'p-6'}`}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
        Founding cohort{place ? ` · ${other && country ? getCountry(country)?.label : place.label}` : ''}
      </p>
      <p
        className={`mt-2.5 font-display font-medium leading-snug tracking-tight text-ink text-balance ${compact ? 'text-[1.2rem]' : 'text-[1.45rem]'}`}
      >
        Your map’s job is to be matched.
      </p>
      <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
        {pool} opens when {COHORT_TARGET} women and {COHORT_TARGET} men have kept a map
        and can be reached. Nobody is introduced to anyone before then.{' '}
        {scene && country ? (
          <DoorCount count={count} city={city} within={within} other={other} />
        ) : scene ? (
          'Say which country you’re in to see where it stands.'
        ) : (
          'Pick your city to see where it stands.'
        )}
      </p>
      {travelAsk}
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
          {other && !identity.country && (
            <select
              value={namedCountry}
              onChange={(e) => {
                setNamedCountry(e.target.value)
                setCount(null)
                if (e.target.value) onCountry?.(e.target.value)
              }}
              aria-label="Your country"
              className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
            >
              <option value="">Somewhere else in…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
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
            We send your email or phone, your city and country, how far you said
            you’d go, who you’re seeking, the hardest part you named, and which
            of the things on your Trust page you’ve done. Nothing about how your
            map read, and nothing about how you use the app. Your map is kept
            under a code with no name on it, so it can be matched. Your answers
            stay yours.
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

      {/* The one no this product records. Every other screen learns from a yes;
          the door is where people stop, and until now it learned nothing from
          that. One word, about the door, from a list we wrote — docs/GAPS.md. */}
      {onHesitate && hesitating === 'closed' && (
        <button
          type="button"
          onClick={() => setHesitating('open')}
          className="mt-3 text-[0.82rem] font-medium text-muted underline-offset-4 hover:underline"
        >
          Not now
        </button>
      )}
      {onHesitate && hesitating === 'open' && (
        <div className="mt-4 rounded-card border border-line bg-white/60 p-4">
          <p className="text-[0.9rem] font-medium text-ink">That’s fine. Would you tell us why, in a word?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {hesitationOptions.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  onHesitate(h.id)
                  setHesitating('said')
                }}
                className="rounded-full border border-line bg-white/50 px-3.5 py-1.5 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40 hover:bg-white"
              >
                {h.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.78rem] leading-relaxed text-muted text-pretty">
            One word reaches us — why the door was hard to walk through — under the same random code as
            your steps. Nothing else, and nothing about you.
          </p>
          <button
            type="button"
            onClick={() => setHesitating('closed')}
            className="mt-2 text-[0.8rem] font-medium text-muted underline-offset-4 hover:underline"
          >
            Skip
          </button>
        </div>
      )}
      {hesitating === 'said' && (
        <p className="mt-3 text-[0.85rem] text-muted text-pretty">Noted. The door stays open.</p>
      )}

      {!compact && (
        <div className="mt-5 border-t border-gold/20 pt-4">
          <p className="text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
            “I’m building this by hand, one city at a time, and I’d rather show you
            an honest zero than a feed full of people who aren’t real. {pool} opens
            the day both sides are here. Until then, your map and your guide are
            yours — and the count above is the plan.”
          </p>
          <p className="mt-2 text-[0.8rem] font-medium text-muted">— Mohamed, who’s building Niyyah</p>
        </div>
      )}
    </div>
  )
}

function people(n: SideCount): string {
  const w = n.women === 1 ? 'one woman' : `${n.women} women`
  const m = n.men === 1 ? 'one man' : `${n.men} men`
  return `${w} and ${m}`
}

/**
 * The number on the door, as two sentences. It used to be two bars filling
 * toward forty — a scarcity meter, the kind a person comes back to watch. The
 * fact is the same; the form no longer asks for a return visit. A count that
 * cannot be read says so rather than showing a zero it does not know to be
 * true. The second sentence is the one that makes the door honest for a woman
 * in a city of nine: the people in her country who would travel to her.
 * Shared with the `/?door` screen, so the number reads the same everywhere.
 */
export function DoorCount({ count, city, within, other }: { count: CohortCount | null; city: string; within: string; other: boolean }) {
  if (!count) return <span>The count isn’t reachable right now.</span>
  return (
    <span>
      {count.here ? (
        <>
          <span className="font-medium text-ink">
            {city} today: {people(count.here).replace(' and ', ', ')}.
          </span>{' '}
          It opens at {count.target} each.
        </>
      ) : (
        <>{other ? `Somewhere else in ${within} isn’t a city we count yet.` : ''}</>
      )}{' '}
      Across {within}, {people(count.across)} would travel for the right person.
    </span>
  )
}
