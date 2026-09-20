import { useEffect, useState } from 'react'
import { MAX_AGE, MIN_AGE, type Identity, type Reach, type WaitlistState } from '../types'
import { countryFor, getScene, scenes } from '../data/scenes'
import { countries, getCountry } from '../data/countries'
import { getHookOption } from '../data/hook'
import { hesitationOptions, type Hesitation } from '../data/hesitation'
import { COHORT_TARGET, cohortCount, joinCohort, opensWhen, type CohortCount, type SideCount } from '../lib/cohort'
import { joinWaitlist, mailtoFor, waitlistConfigured, CONTACT_EMAIL } from '../lib/waitlist'
import { instrumentLink } from '../lib/links'
import { parseAge } from '../lib/age'
import { shareOrCopy } from '../lib/share'
import { contactProblem, looksReachable } from '../lib/contact'
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
  /**
   * When she gives her age here. An introduction cannot be made without one,
   * so being counted is where it is asked if Profile never was; it goes into
   * her kept map and never onto the door (docs/LIQUIDITY.md).
   */
  onAge?: (age: number) => void
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
/** The count, or what is happening instead of it. */
export type CountState = CohortCount | 'loading' | 'unreachable'

export default function Cohort({ identity, hookId, ledger, joined, onJoined, onScene, onCountry, onReach, onAge, onHesitate, compact }: Props) {
  const configured = waitlistConfigured()
  const [contact, setContact] = useState('')
  const [contactTouched, setContactTouched] = useState(false)
  // "Not now" — the one no this product records, as one word about the door.
  const [hesitating, setHesitating] = useState<'closed' | 'open' | 'said'>('closed')
  const [scene, setScene] = useState(joined?.scene ?? identity.scene ?? '')
  // The country she names when she is somewhere else and nothing upstream
  // holds it yet. A named city already knows its country.
  const [namedCountry, setNamedCountry] = useState('')
  // Said she would travel here, before anything upstream has heard it.
  const [travelled, setTravelled] = useState(false)
  // Her age, when she arrives here without one. Asked once — the field stays
  // for the rest of this visit even after the first valid keystroke has
  // reached identity, so it does not vanish under her hands.
  const [askAge] = useState(!identity.age)
  const [ageText, setAgeText] = useState('')
  const age = identity.age ?? parseAge(ageText)
  // Three states, not two. `null` used to mean both "still asking" and
  // "could not be read", so a working request rendered "The count isn't
  // reachable right now" for its whole in-flight window — up to ten seconds
  // of a sentence that was not true (docs/FAIL.md).
  const [count, setCount] = useState<CountState>('loading')
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [travelling, setTravelling] = useState(false)
  const [travelFailed, setTravelFailed] = useState(false)

  const country = countryFor({ scene, country: identity.country }) ?? (scene === 'other' ? namedCountry : '')
  const reach: Reach = identity.reach ?? (travelled ? 'country' : 'city')

  // The real number, read fresh every time the card is shown. Never cached
  // into a guess: if it cannot be read, the card says so.
  useEffect(() => {
    if (!scene || !country) return
    let live = true
    setCount('loading')
    cohortCount(scene, country).then((c) => {
      if (live) setCount(c ?? 'unreachable')
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
  const one = identity.gender === 'man' ? 'woman' : 'man'
  const them = identity.gender === 'man' ? 'her' : 'him'
  const theyre = identity.gender === 'man' ? 'she’s' : 'he’s'
  const [sent, setSent] = useState<'door' | 'read' | null>(null)

  // The door is a collective goal, and the honest ask is the useful one: the
  // pool opens when both sides are counted, so if she knows one serious man,
  // the most useful thing she can do for herself is send him here. Two asks,
  // because there are two men: the one who is looking gets the door — the
  // number, and the map as the way in — and the one who is already talking to
  // someone gets the read. Sending a single man the read was the weakest link
  // in the whole machine (docs/MACHINE.md): he landed on "who are you
  // reading?" and left. No count of who she sent it to, anywhere; the only
  // number is the door's.
  async function send(kind: 'door' | 'read') {
    const result = await shareOrCopy(
      kind === 'door'
        ? {
            text: `Salaam — Niyyah is being built for us, one city at a time. ${opensWhen(pool)} Here’s where it stands. No photos, no account: three answers, your age, and a way to reach you.`,
            url: instrumentLink('door', 'door'),
          }
        : {
            text: `Salaam — Niyyah is being built for us, one city at a time. ${opensWhen(pool)} Start with the read: ninety seconds on what someone has actually done, and the one question to ask next. No account.`,
            url: instrumentLink('read', 'door'),
          },
      'door_sent',
    )
    if (result === 'copied') {
      setSent(kind)
      window.setTimeout(() => setSent(null), 2400)
    }
  }

  // One tap: she would travel within her country. If she is already counted,
  // her entry is replaced so the door moves now rather than on her next join.
  async function travel() {
    if (travelling) return
    if (!joined || !identity.gender || !country) {
      // Nothing to send yet — the reach travels with her next join.
      setTravelled(true)
      onReach?.('country')
      return
    }
    setTravelling(true)
    const result = await joinCohort({ scene, gender: identity.gender, hook: hookId, ledger, country, reach: 'country', age: identity.age })
    setTravelling(false)
    // `setTravelled(true)` used to run first, which unmounted this button —
    // so a failed write left her reach changed on the device, the door
    // unchanged on the server, no message, and nothing left to retry with
    // (docs/FAIL.md). The optimism now waits for the answer.
    if (!result) {
      setTravelFailed(true)
      return
    }
    setTravelFailed(false)
    setTravelled(true)
    onReach?.('country')
    setCount(result)
  }

  const travelAsk =
    country && reach === 'city' ? (
      <div className="mt-3">
        <button
          onClick={travel}
          disabled={travelling}
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-2 text-[0.85rem] font-medium text-forest transition hover:bg-gold/[0.08] disabled:opacity-50"
        >
          {travelling ? <Spinner /> : null}
          {travelling ? 'Saying so…' : `I’d travel within ${within}`}
        </button>
        {travelFailed && (
          <p role="status" className="mt-2 text-[0.82rem] leading-snug text-clay text-pretty">
            That didn’t reach the door — nothing has changed, and you are still counted where you were. Try again in a moment.
          </p>
        )}
      </div>
    ) : null

  if (joined) {
    return (
      <div className={`rounded-card border border-forest/25 bg-forest/[0.06] ${compact ? 'px-5 py-4' : 'p-6'}`}>
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
          <CheckIcon size={12} /> You’re counted
        </p>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
          <DoorCount count={count} city={city} within={within} other={other} /> Nobody in {pool} is introduced to anyone
          yet — the count above is what exists. Your map is counted
          {joined.contactHeld === false ? (
            '.'
          ) : (
            <>
              , and{' '}
              <span className="font-medium text-ink">{joined.contact || 'the address you gave'}</span>{' '}
              is kept apart from it for the day that changes, and reaches nobody else. When it changes, this screen will
              say so.
            </>
          )}
        </p>
        {joined.contactHeld === false && (
          <p role="status" className="mt-2.5 text-[0.9rem] leading-relaxed text-clay text-pretty">
            The way to reach you did not save — you are counted, but we could not write it down. Nothing is lost on this
            phone. Join again in a moment, or write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>{' '}
            and it goes on by hand.
          </p>
        )}
        {travelAsk}
        {joined.code && (
          <p className="mt-2 text-[0.85rem] leading-relaxed text-muted text-pretty">
            Your map is kept under <span className="select-all font-medium tracking-[0.15em] text-ink">{joined.code}</span> —
            it opens your map on any phone.
          </p>
        )}
        <div className="mt-4 border-t border-forest/15 pt-4">
          <p className="text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
            {pool} needs {COHORT_TARGET} on each side who can be introduced. If you know one serious {one} who is looking, send {them} the
            door. If {theyre} already talking to someone, send the read.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => send('door')}
              className="inline-flex items-center gap-2 rounded-full border border-forest/30 px-4 py-2 text-[0.85rem] font-medium text-forest transition hover:bg-forest/[0.06]"
            >
              {sent === 'door' ? (
                <>
                  <CheckIcon size={12} /> Copied to send
                </>
              ) : (
                'Send the door'
              )}
            </button>
            <button
              onClick={() => send('read')}
              className="inline-flex items-center gap-2 rounded-full border border-forest/30 px-4 py-2 text-[0.85rem] font-medium text-forest transition hover:bg-forest/[0.06]"
            >
              {sent === 'read' ? (
                <>
                  <CheckIcon size={12} /> Copied to send
                </>
              ) : (
                'Send the read'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reachable || !scene || !country || !identity.gender || !age || state === 'sending') return
    setState('sending')

    // First the count — it needs a kept map, and it is the part that can fail.
    const result = await joinCohort({
      scene,
      gender: identity.gender,
      country,
      reach,
      hook: hookId,
      ledger,
      // Kept in a store of its own so the list of people waiting for a pool is
      // ours, not a form provider's — see docs/OWNED.md.
      contact: contact.trim(),
      // Into the kept map, never to the door — see JoinInput.
      age,
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
    // Her map code stays out of this: it is the sole authenticator for the
    // map, and the form is a third party's store (src/lib/waitlist.ts).
    const sent = await joinWaitlist({
      contact: trimmed,
      scene,
      country,
      reach,
      gender: identity.gender,
      hardestPart: getHookOption(hookId)?.label,
      at,
    })
    track('cohort_joined', { scene, queued: sent === 'queued', unconfigured: sent === 'unconfigured' })
    // `sent` used to go to `track()` and nowhere else, so onJoined fired
    // identically whether the form took her contact, queued it, or was never
    // configured — and the card said "You're counted" either way. Our own
    // store is the one that matters; the form is a copy. She is told the
    // truth when neither of them has it (docs/FAIL.md).
    onJoined({
      contact: trimmed,
      scene,
      code: result.code,
      joinedAt: at,
      contactHeld: result.contactStored || sent === 'joined',
    })
  }

  // `looksReachable`, not `trim()`: the way to reach her is the only thing this
  // form collects, and an address with a typo in it used to be accepted and
  // then echoed back to her as proof she was on the list (docs/NIELSEN.md N3).
  const contactHint = contactTouched && contact.trim() ? contactProblem(contact) : null
  const reachable = looksReachable(contact)
  const disabled = !reachable || !scene || !country || !identity.gender || !age || state === 'sending'

  /**
   * What is still missing, named.
   *
   * Count me in switches off on five separate conditions and, until now, said
   * nothing about any of them except the contact field — so a person who had
   * decided to join tapped a dead button and was told nothing at all. Under
   * BJ Fogg's model that is the worst case in the product after the lost
   * instrument answers: motivation is at its peak, the prompt has fired, and
   * ability is zero for a reason she cannot see (docs/FOGG.md, docs/NIELSEN.md
   * severity 2).
   *
   * This names what is left rather than marking fields red, because there are
   * at most two and she is usually one tap from done. Not shown before she has
   * touched anything — an empty form telling her five things are missing is a
   * scolding, not help.
   */
  const missing = [
    !identity.gender && 'whether you’re a woman or a man',
    !scene && 'your city',
    scene === 'other' && !country && 'which country you’re in',
    !age && 'your age',
    !contact.trim() && 'a way to reach you',
  ].filter((m): m is string => !!m)
  const touchedAnything = !!contact.trim() || !!scene || !!age || !!identity.gender
  const stillNeeded = state === 'sending' || !touchedAnything || missing.length === 0 ? null : missing

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
        {opensWhen(pool)} Nobody is introduced to anyone before then.
      </p>
      <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
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
          Keep your map and leave a way to reach you. Nobody is introduced yet; if that changes
          here, this screen will say so first — and the way to reach you goes to nobody else.
        </p>
      )}

      {configured ? (
        <form onSubmit={submit} className="mt-4 space-y-2.5">
          {!identity.scene && (
            <select
              value={scene}
              onChange={(e) => {
                setScene(e.target.value)
                setCount('loading')
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
                setCount('loading')
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
          {askAge && (
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={ageText}
                onChange={(e) => {
                  setAgeText(e.target.value)
                  const n = parseAge(e.target.value)
                  if (n) onAge?.(n)
                }}
                placeholder="Your age"
                aria-label="Your age"
                aria-describedby="cohort-age-hint"
                className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
              />
              <p id="cohort-age-hint" className="mt-1.5 text-[0.78rem] leading-relaxed text-muted text-pretty">
                {MIN_AGE}–{MAX_AGE}. An introduction cannot be made without it. It goes into your kept map, never onto
                the door.
              </p>
            </div>
          )}
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            onBlur={() => setContactTouched(true)}
            placeholder="Email or phone"
            aria-label="Email or phone"
            aria-describedby={contactHint ? 'cohort-contact-hint' : undefined}
            className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
          />
          {/* Only once she has left the field, so it explains rather than nags. */}
          {contactHint && (
            <p id="cohort-contact-hint" role="status" className="-mt-1 text-[0.82rem] leading-snug text-clay text-pretty">
              {contactHint}
            </p>
          )}
          {stillNeeded && (
            <p role="status" className="-mt-1 text-[0.82rem] leading-snug text-muted text-pretty">
              {stillNeeded.length === 1
                ? `One thing left: ${stillNeeded[0]}.`
                : `Still needed: ${stillNeeded.slice(0, -1).join(', ')} and ${stillNeeded[stillNeeded.length - 1]}.`}
            </p>
          )}
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
            We send your email or phone, your city and country, how far you said you’d go,
            who you’re seeking, the hardest part you named, and which of the things on your
            Trust page you’ve done. Nothing about how your map read, and nothing about how
            you use the app. Your map is kept again, as it is today, under a code with no
            name on it, so it can be matched — your age goes there, never onto the door.
            Once you are counted, the founder can read the kept maps in your pool to count
            its shape — how many of each age, how many pairs clear each other’s
            non-negotiables, how many have nobody here who does — never a map and never
            which person, and any breakdown that would come back as one or two comes back
            blank. Your email or phone is kept apart from all of it, with only your city
            beside it, so you can be reached if your pool ever opens — and it goes when you tap
            forget. This same tap also sends your email or phone, your city, country, how
            far you’d go, who you’re seeking and that hardest part to the form service this
            site runs on, as a second copy — never your map code, and never your answers.
            That copy is deleted by hand when you ask. Your answers stay yours.
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
export function DoorCount({ count, city, within, other }: { count: CountState; city: string; within: string; other: boolean }) {
  // Asking is not the same as failing to ask, and the screen must not say the
  // second while it is doing the first (docs/FAIL.md).
  if (count === 'loading') return <span className="text-muted">Reading the count…</span>
  if (count === 'unreachable' || !count) {
    return <span>The count isn’t reachable just now — that is us, not you. It will be here next time.</span>
  }
  return (
    <span>
      {count.here ? (
        <>
          <span className="font-medium text-ink">
            {city} today: {people(count.here).replace(' and ', ', ')}.
          </span>{' '}
          {count.target} each is the first mark; it opens when they can be introduced.
        </>
      ) : (
        <>{other ? `Somewhere else in ${within} isn’t a city we count yet.` : ''}</>
      )}{' '}
      Across {within}, {people(count.across)} would travel for the right person.
    </span>
  )
}
