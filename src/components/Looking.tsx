import { useState } from 'react'
import type { Gender, Identity } from '../types'
import { MIN_AGE } from '../types'
import { getScene, scenes } from '../data/scenes'
import { countries, getCountry } from '../data/countries'
import { reachOptions, type Reach } from '../data/reach'
import { contactProblem, looksReachable } from '../lib/contact'
import { registerInterest, withdrawInterest, type IntroState } from '../lib/introduce'
import type { Why } from '../lib/net'
import { CONTACT_EMAIL } from '../lib/site'
import { ArrowRight, BackButton, Button, CheckIcon, Logo, Spinner, TextButton, fieldClass } from './ui'

interface Props {
  identity: Identity
  /** Her name is down: the code it is under and the day. Null until she puts it down. */
  intro: IntroState | null
  onRegistered: (state: IntroState) => void
  onWithdrawn: () => void
  /** What she told this form that the rest of the app can use: who she is, where she is, that she is 18+. */
  onIdentity: (patch: Partial<Identity>) => void
  /** The other door. */
  onTalking: () => void
  /** Two minutes on where she stands, while she waits. */
  onMap: () => void
  onTrust: () => void
  onBack: () => void
}

/**
 * I'm looking for someone serious.
 *
 * The reason Niyyah was started, given back its door. Two women signed up
 * through the old one because they were single and hoped to meet someone
 * serious; the door was deleted on 2026-09-24 as a goal with nobody in it
 * (docs/DECISIONS.md Part 22). This is the smallest screen that keeps the
 * promise they acted on: a name put down, a way to reach her, and the truth
 * about what happens next — introductions made by hand, one at a time, only
 * when two people fit what each said and both have said yes first.
 *
 * What it says is bounded by what exists. There is no pool to show and no
 * date to promise, so neither is said; the count is not shown, because a
 * number on a door became a scarcity meter last time and this list is not a
 * queue. "Your name is down" appears on the server's answer and on nothing
 * else (src/lib/introduce.ts). What is collected is exactly what the founder
 * needs to reach someone and tell whether two people could be introduced at
 * all; nothing from the map, the read or the eleven is sent, and nobody who
 * uses those is put on this list by using them.
 */
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition-all ${
    on ? 'border-forest bg-forest text-cream' : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
  }`

const LABEL = 'text-xs font-medium uppercase tracking-[0.2em] text-muted'

export default function Looking({ identity, intro, onRegistered, onWithdrawn, onIdentity, onTalking, onMap, onTrust, onBack }: Props) {
  const [gender, setGender] = useState<Gender | undefined>(identity.gender)
  const [scene, setScene] = useState(identity.scene ?? '')
  const [namedCountry, setNamedCountry] = useState(identity.country ?? '')
  const [reach, setReach] = useState<Reach>('city')
  const [firstName, setFirstName] = useState(identity.firstName ?? '')
  const [contact, setContact] = useState('')
  const [contactTouched, setContactTouched] = useState(false)
  const [adult, setAdult] = useState(!!identity.adult)
  const [state, setState] = useState<'idle' | 'sending' | Why>('idle')
  const [off, setOff] = useState<'idle' | 'removing' | 'failed' | 'done'>('idle')

  const other = scene === 'other'
  const country = other ? namedCountry : (getScene(scene)?.country ?? '')
  const within = getCountry(country)?.within ?? 'your country'

  const contactHint = contactTouched && contact.trim() ? contactProblem(contact) : null
  const reachable = looksReachable(contact)
  const ready = !!gender && !!scene && !!country && reachable && adult
  const touched = !!contact.trim() || !!scene || !!gender || !!firstName.trim()
  const missing = [
    !gender && 'whether you are a woman or a man',
    !scene && 'your city',
    other && !country && 'which country you are in',
    !contact.trim() && 'a way to reach you',
    !adult && `that you are ${MIN_AGE} or older`,
  ].filter((m): m is string => !!m)
  const stillNeeded = state === 'sending' || !touched || missing.length === 0 ? null : missing

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || !gender || state === 'sending') return
    setState('sending')
    const result = await registerInterest({ contact, firstName, gender, scene, country: other ? country : undefined, reach })
    if (!result.ok) {
      setState(result.why)
      return
    }
    setState('idle')
    // What she told this form, kept for the rest of the app: her side, her
    // city and that she is an adult — the same things Identity and Situation
    // ask, so a map or a read after this does not ask them again.
    onIdentity({ gender, scene, ...(other && country ? { country } : {}), ...(firstName.trim() ? { firstName: firstName.trim() } : {}), adult: true })
    onRegistered({ code: result.code, at: new Date().toISOString().slice(0, 10) })
  }

  async function takeOff() {
    if (!intro || off === 'removing') return
    setOff('removing')
    const gone = await withdrawInterest(intro.code)
    if (!gone) {
      setOff('failed')
      return
    }
    setOff('done')
    onWithdrawn()
  }

  /** One sentence per reason, because the reasons want different things done. */
  const problem: Record<Why, string> = {
    unreachable: 'That did not reach us, so nothing is saved — and nothing is lost here. Try again in a moment.',
    refused: `We cannot take names just now — that is us, not you. Try again later, or write to ${CONTACT_EMAIL} and it goes on by hand.`,
    garbled: 'Something came back wrong from our side, so nothing is confirmed. Try again in a moment.',
    'not-a-code': 'Something in the form did not fit. Check the email or number, and the city.',
    'not-found': 'That did not go through. Try again in a moment.',
    expired: 'That did not go through. Try again in a moment.',
    taken: 'That did not go through. Try again in a moment.',
  }

  return (
    <div className="min-h-dvh bg-cream pb-16 pt-safe">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <BackButton onClick={onBack} />
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Looking</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6">
        {intro && off !== 'done' ? (
          <section className="py-10">
            <p className="animate-fade flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
              <CheckIcon size={12} /> Looking for someone
            </p>
            <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
              Your name is down.
            </h1>
            <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
              Since {intro.at}. Introductions are made by hand, one at a time, by the person who runs Niyyah.
            </p>

            <div className="animate-rise mt-7 rounded-card border border-forest/25 bg-forest/[0.06] p-6">
              <h2 className="font-display text-[1.15rem] font-medium text-ink">What happens now</h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
                The list is read by hand. If someone on it fits what you each said — where you are, and how far you would
                go — the founder gets in touch with you first, the way you gave, and asks. Nothing about you reaches anyone
                before you say yes, and nothing about them reaches you before they do.
              </p>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
                If nobody fits yet, nothing happens, and your name stays down until you take it off. There is no list to
                browse, and no date is promised.
              </p>
            </div>

            <div className="mt-5 rounded-card border border-line bg-white/60 p-6">
              <h2 className="font-display text-[1.15rem] font-medium text-ink">While you wait</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={onMap}
                  className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-forest/[0.06] px-4 py-2 text-[0.88rem] font-medium text-forest transition hover:bg-forest/[0.12]"
                >
                  Two minutes on where you stand
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={onTalking}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white/50 px-4 py-2 text-[0.88rem] font-medium text-ink-soft transition hover:border-forest/40"
                >
                  Talking to someone now? Start there
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={takeOff}
                disabled={off === 'removing'}
                className="inline-flex items-center gap-2 rounded-full border border-clay/50 px-5 py-2.5 text-[0.88rem] font-medium text-clay transition hover:bg-clay/10 disabled:opacity-50"
              >
                {off === 'removing' ? <Spinner /> : null}
                {off === 'removing' ? 'Taking it off…' : 'Take my name off'}
              </button>
              <TextButton onClick={onTrust} className="text-[0.85rem] font-medium text-muted hover:underline">
                What we hold, exactly
              </TextButton>
            </div>
            {off === 'failed' && (
              <p role="status" className="mt-3 text-[0.85rem] leading-snug text-clay text-pretty">
                We could not reach the list just now — that is us, not you. Your name is still down; try again in a moment,
                or Forget me on Trust takes it off with everything else the next time it can.
              </p>
            )}
          </section>
        ) : (
          <section className="py-10">
            {off === 'done' && (
              <p role="status" className="mb-6 rounded-2xl border border-forest/25 bg-forest/[0.06] px-4 py-3 text-[0.9rem] leading-snug text-ink-soft text-pretty">
                Your name is off the list. Nothing about you is held there now.
              </p>
            )}
            <p className={`animate-fade ${LABEL} text-gold-ink`}>Looking for someone</p>
            <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
              I’m looking for someone serious.
            </h1>
            <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
              Niyyah began so that serious Somali singles could meet each other. Put your name down, and the person who
              runs it makes introductions by hand — one at a time, only when two people fit what each said, and only after
              both have said yes.
            </p>
            <p className="animate-rise mt-3 text-[0.95rem] leading-relaxed text-muted text-pretty">
              What this is not, yet: a list to browse, or a date. Who has put their name down, and where, decides when the
              first introductions can be made. A name on the list is not an introduction, and not a promise of
              one.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-6">
              <div>
                <p id="looking-gender-label" className={LABEL}>
                  You are
                </p>
                <div role="radiogroup" aria-labelledby="looking-gender-label" className="mt-3 grid grid-cols-2 gap-2.5">
                  {(
                    [
                      { id: 'woman', label: 'I am a woman' },
                      { id: 'man', label: 'I am a man' },
                    ] as { id: Gender; label: string }[]
                  ).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={gender === o.id}
                      onClick={() => setGender(o.id)}
                      className={`rounded-card border px-4 py-3 text-left text-[0.95rem] font-medium transition-all ${
                        gender === o.id ? 'border-forest bg-forest text-cream' : 'border-line bg-white/50 text-ink hover:border-forest/40 hover:bg-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p id="looking-scene-label" className={LABEL}>
                  Where are you?
                </p>
                <div role="group" aria-labelledby="looking-scene-label" className="mt-3 flex flex-wrap gap-2">
                  {scenes.map((sc) => (
                    <button key={sc.id} type="button" onClick={() => setScene(sc.id)} aria-pressed={scene === sc.id} className={chip(scene === sc.id)}>
                      {sc.label}
                    </button>
                  ))}
                </div>
                {other && (
                  <div className="mt-4">
                    <p id="looking-country-label" className={LABEL}>
                      Somewhere else in…
                    </p>
                    <div role="group" aria-labelledby="looking-country-label" className="mt-3 flex flex-wrap gap-2">
                      {countries.map((c) => (
                        <button key={c.id} type="button" onClick={() => setNamedCountry(c.id)} aria-pressed={namedCountry === c.id} className={chip(namedCountry === c.id)}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {country && (
                <div>
                  <p id="looking-reach-label" className={LABEL}>
                    How far would you go for the right person?
                  </p>
                  <div role="group" aria-labelledby="looking-reach-label" className="mt-3 flex flex-wrap gap-2">
                    {reachOptions(within).map((o) => (
                      <button key={o.id} type="button" onClick={() => setReach(o.id)} aria-pressed={reach === o.id} className={chip(reach === o.id)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="looking-name" className="block text-sm font-medium text-ink-soft">
                  Your first name <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="looking-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  className={`mt-2 w-full bg-white/70 px-4 py-3 text-[1rem] ${fieldClass}`}
                />
              </div>

              <div>
                <label htmlFor="looking-contact" className="block text-sm font-medium text-ink-soft">
                  Email or phone
                </label>
                <input
                  id="looking-contact"
                  type="text"
                  // No single inputMode serves both an email and a phone number,
                  // which this field takes either of; "text" gives the whole
                  // keyboard rather than biasing toward @.
                  inputMode="text"
                  autoComplete="email"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  onBlur={() => setContactTouched(true)}
                  aria-describedby={contactHint ? 'looking-contact-hint' : undefined}
                  aria-invalid={!!contactHint}
                  enterKeyHint="done"
                  className={`mt-2 w-full bg-white/70 px-4 py-3 text-[1rem] ${fieldClass}`}
                />
                {/* Only once she has left the field, so it explains rather than nags. */}
                {contactHint && (
                  <p id="looking-contact-hint" role="status" className="mt-2 text-[0.85rem] leading-snug text-clay text-pretty">
                    {contactHint}
                  </p>
                )}
              </div>

              {!identity.adult && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={adult}
                  onClick={() => setAdult(!adult)}
                  className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                    adult ? 'border-forest/40 bg-forest/[0.06]' : 'border-line bg-white/50 hover:border-forest/30 hover:bg-white'
                  }`}
                >
                  <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-lg border transition-all ${adult ? 'border-forest bg-forest text-cream' : 'border-line bg-cream'}`}>
                    {adult && <CheckIcon size={13} />}
                  </span>
                  <span className="text-[0.92rem] leading-snug text-ink-soft text-pretty">I confirm I am {MIN_AGE} or older.</span>
                </button>
              )}

              <div>
                <Button type="submit" disabled={!ready || state === 'sending'} className="group w-full sm:w-auto">
                  {state === 'sending' ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : (
                    <>
                      Put my name down
                      <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
                {stillNeeded && (
                  <p role="status" className="mt-3 text-[0.85rem] leading-snug text-muted text-pretty">
                    {stillNeeded.length === 1
                      ? `One thing left: ${stillNeeded[0]}.`
                      : `Still needed: ${stillNeeded.slice(0, -1).join(', ')} and ${stillNeeded[stillNeeded.length - 1]}.`}
                  </p>
                )}
                {state !== 'idle' && state !== 'sending' && (
                  <p role="status" className="mt-3 text-[0.88rem] leading-snug text-clay text-pretty">
                    {problem[state]}
                  </p>
                )}
              </div>

              {/* This list must match what registerInterest sends and the
                  server keeps (netlify/functions/introduce.ts). A privacy claim
                  is the one thing that must never drift from the code it
                  describes. */}
              <p className="text-[0.82rem] leading-relaxed text-muted text-pretty">
                What goes, exactly: a way to reach you, your first name if you gave it, whether you are a woman or a man,
                your city and its country, and how far you would go. It goes to our server under a code this phone keeps,
                so you can take your name off from here, and Forget me takes it off with everything else. The founder reads
                the list; nothing else does, and nothing from your map, a read or the eleven is attached to it.{' '}
                <TextButton type="button" onClick={onTrust} className="text-[0.82rem] font-medium text-forest underline">
                  What leaves your phone
                </TextButton>
              </p>
            </form>

            <p className="mt-8 text-[0.92rem] text-muted">
              Already talking to someone?{' '}
              <TextButton onClick={onTalking} className="text-[0.92rem] font-medium text-forest underline">
                Start there instead
              </TextButton>
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
