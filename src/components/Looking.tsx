import { useState } from 'react'
import type { Gender, Identity } from '../types'
import { MIN_AGE } from '../types'
import { getScene, scenes } from '../data/scenes'
import { countries, getCountry } from '../data/countries'
import { reachOptions, type Reach } from '../data/reach'
import { CODE_LENGTH, EXAMPLE_CODE, cleanCode, formatCode, isCode } from '../lib/code'
import { contactProblem, looksReachable } from '../lib/contact'
import { PILOT_SCENE, pastScheduled, registerInterest, scheduledRemoval, withdrawInterest, type IntroState, type Withdrawn } from '../lib/introduce'
import type { Why } from '../lib/net'
import { CONTACT_EMAIL, OPERATOR } from '../lib/site'
import { ArrowRight, BackButton, Button, CheckIcon, Logo, Spinner, TextButton, fieldClass } from './ui'

interface Props {
  identity: Identity
  /** The receipt this phone holds: the code, and the server's two days. Null until a request is saved. */
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
 * about what happens next, said *before* the button (docs/BATCH-01-PLAN.md D6):
 *
 *  - who runs it, and that every introduction is made by hand;
 *  - who the current pilot is for — a pilot rule, not a doctrine;
 *  - the conversation with her first, and the one with a person who knows
 *    her, which she agrees to;
 *  - the short approved description, and that nothing identifying goes to a
 *    person proposed to her until both have said yes (decision 29);
 *  - the day the request is scheduled to be removed, from the server's own
 *    answer once it is saved (decision 32, D3).
 *
 * What it says is bounded by what exists. There is no pool to show and no
 * date to promise, so neither is said; the count is not shown, because a
 * number on a door became a scarcity meter last time and this list is not a
 * queue. The receipt reads "Your request was saved on {day}", from the
 * server's answer and nothing else (src/lib/introduce.ts): a phone holds a
 * receipt, not a view of the list. When an answer is lost, the same request
 * goes again under the same code and is never saved twice; when the code
 * cannot be held on this phone it is shown, once, so the name can still be
 * taken off; and a name can be taken off here by its code, whenever the phone
 * that put it down is not the phone in hand.
 */
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition-all ${
    on ? 'border-forest bg-forest text-cream' : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
  }`

const LABEL = 'text-xs font-medium uppercase tracking-[0.2em] text-muted'

/** The pilot rule, said as one: a first-twenty constraint (docs/OPS.md), never a permanent policy. */
const PILOT_MARITAL = 'For the first twenty introductions, nobody currently engaged or married.'

/** A code as a person is shown it, with the space a person reads aloud. */
const Code = ({ code }: { code: string }) => <span className="font-mono text-[1.05em] font-semibold tracking-wider text-ink">{formatCode(code)}</span>

export default function Looking({ identity, intro, onRegistered, onWithdrawn, onIdentity, onTalking, onMap, onTrust, onBack }: Props) {
  const [gender, setGender] = useState<Gender | undefined>(identity.gender)
  const [scene, setScene] = useState(identity.scene ?? '')
  const [namedCountry, setNamedCountry] = useState(identity.country ?? '')
  const [reach, setReach] = useState<Reach>('city')
  const [firstName, setFirstName] = useState(identity.firstName ?? '')
  const [contact, setContact] = useState('')
  const [contactTouched, setContactTouched] = useState(false)
  const [adult, setAdult] = useState(!!identity.adult)
  const [state, setState] = useState<'idle' | 'sending' | Why | 'withdrawn'>('idle')
  /** The last attempt that may have landed: its code, and whether this phone holds it. */
  const [attempt, setAttempt] = useState<{ code: string; kept: boolean } | null>(null)
  /** What the receipt's own "Take my name off" is doing, or did. */
  const [off, setOff] = useState<'idle' | 'removing' | 'failed' | Withdrawn>('idle')
  /** Taking off by a typed code: the field and its outcome. */
  const [typed, setTyped] = useState('')
  const [entry, setEntry] = useState<'closed' | 'open' | 'checking' | 'not-a-code' | 'failed' | Withdrawn>('closed')
  /** After "again": the request was saved earlier, and this is the same one. */
  const [again, setAgain] = useState(false)
  /** The saved receipt's code could not be held on this phone: shown once. */
  const [unkept, setUnkept] = useState(false)

  const other = scene === 'other'
  const country = other ? namedCountry : (getScene(scene)?.country ?? '')
  const within = getCountry(country)?.within ?? 'your country'
  const pilot = getScene(PILOT_SCENE)?.label ?? 'Minneapolis–St. Paul'
  /** Where she is, when it is not where introductions are beginning. Null in the pilot city, or before she has said. */
  const elsewhere = (sc: string | undefined, named: string | undefined) =>
    !sc || sc === PILOT_SCENE ? null : sc === 'other' ? (named ? (getCountry(named)?.within ?? 'where you are') : null) : (getScene(sc)?.label ?? null)
  const away = elsewhere(scene, other ? country : undefined)
  const awaySaved = elsewhere(identity.scene, identity.country)

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
      setAttempt(result.unsure || result.why === 'taken' ? { code: result.code, kept: result.kept } : null)
      return
    }
    setState('idle')
    setAttempt(null)
    setAgain(result.again)
    setUnkept(!result.kept)
    // A name taken off and put down again in the same visit: the saved panel,
    // not the form with "your name is off the list" still above it.
    setOff('idle')
    setEntry('closed')
    // What she told this form, kept for the rest of the app: her side, her
    // city and that she is an adult — the same things Identity and Situation
    // ask, so a map or a read after this does not ask them again.
    onIdentity({ gender, scene, ...(other && country ? { country } : {}), ...(firstName.trim() ? { firstName: firstName.trim() } : {}), adult: true })
    onRegistered(result.state)
  }

  /** The receipt's own button. */
  async function takeOff() {
    if (!intro || off === 'removing') return
    setOff('removing')
    const gone = await withdrawInterest(intro.code)
    if (gone === 'failed') {
      setOff('failed')
      return
    }
    setOff(gone)
    onWithdrawn()
  }

  /** The earlier attempt that landed with other details: take it off, so the form can go again under a fresh code. */
  async function takeOffAttempt() {
    if (!attempt || state === 'sending') return
    setState('sending')
    const gone = await withdrawInterest(attempt.code)
    if (gone === 'failed') {
      setState('unreachable')
      return
    }
    setState('idle')
    setAttempt(null)
    setOff(gone)
  }

  /** A code typed in: taken off, or nothing found under it. */
  async function takeOffTyped(e: React.FormEvent) {
    e.preventDefault()
    if (entry === 'checking') return
    if (!isCode(typed)) {
      setEntry('not-a-code')
      return
    }
    setEntry('checking')
    const gone = await withdrawInterest(cleanCode(typed))
    setEntry(gone)
    if (gone !== 'failed') {
      setTyped('')
      if (intro && cleanCode(typed) === intro.code) onWithdrawn()
    }
  }

  /** One sentence per reason, because the reasons want different things done. */
  const problem: Record<Why | 'withdrawn', string> = {
    unreachable:
      'We could not tell whether that reached us. Nothing is lost here: press the button again and the same request goes under the same code, so it is never saved twice.',
    garbled: 'Something came back wrong from our side, so nothing is confirmed. Press the button again: the same request goes under the same code, so it is never saved twice.',
    refused: `We cannot take names just now — that is us, not you. Try again later, or write to ${CONTACT_EMAIL} and it goes on by hand.`,
    'not-a-code': 'Something in the form did not fit. Check the email or number, and the city.',
    taken: 'An earlier try went through with what you had typed then, under a code this phone holds. Your changes were not saved over it.',
    withdrawn: 'That earlier request was taken off before it could be saved. Press the button again to send this one.',
    'not-found': 'That did not go through. Try again in a moment.',
    expired: 'That did not go through. Try again in a moment.',
  }

  const withdrawnLine: Record<Withdrawn, string> = {
    removed: 'Your name is off the list. Nothing about you is held there now.',
    nothing: 'Nothing was under that code any more, and nothing can be put under it now.',
    failed: 'We could not reach the list just now — that is us, not you. Nothing has changed; try again in a moment.',
  }

  const codeEntry = (
    <section className="mt-8 rounded-card border border-line bg-white/60 p-5">
      <h2 className="font-display text-[1.08rem] font-medium text-ink">Take a name off with its code</h2>
      <p className="mt-1.5 text-[0.88rem] leading-snug text-muted text-pretty">
        For a request made on another phone, or a code this screen showed you. Nothing is read back: the name comes off, or
        nothing is found under the code.
      </p>
      {entry === 'closed' ? (
        <TextButton onClick={() => setEntry('open')} className="mt-3 text-[0.9rem] font-medium text-forest underline">
          I have a code
        </TextButton>
      ) : (
        <form onSubmit={takeOffTyped} className="mt-3">
          <label htmlFor="looking-code" className="block text-sm font-medium text-ink-soft">
            Your code
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="looking-code"
              type="text"
              value={formatCode(typed)}
              onChange={(e) => setTyped(cleanCode(e.target.value))}
              placeholder={formatCode(EXAMPLE_CODE)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              aria-describedby={entry !== 'open' && entry !== 'checking' ? 'looking-code-status' : undefined}
              className={`min-w-0 flex-1 bg-white/70 px-4 py-3 font-mono text-[1rem] tracking-wider ${fieldClass}`}
            />
            <Button type="submit" variant="outline" disabled={entry === 'checking' || !typed} className="flex-none">
              {entry === 'checking' ? <Spinner /> : null}
              {entry === 'checking' ? 'Taking it off…' : 'Take it off'}
            </Button>
          </div>
          {entry !== 'open' && entry !== 'checking' && (
            <p id="looking-code-status" role="status" className={`mt-2 text-[0.85rem] leading-snug text-pretty ${entry === 'removed' ? 'text-forest' : 'text-clay'}`}>
              {entry === 'not-a-code'
                ? `A code is ${CODE_LENGTH} characters, like ${formatCode(EXAMPLE_CODE)} — check for a missing one.`
                : withdrawnLine[entry]}
            </p>
          )}
        </form>
      )}
    </section>
  )

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
        {intro ? (
          <Receipt
            intro={intro}
            again={again}
            unkept={unkept}
            awaySaved={awaySaved}
            pilot={pilot}
            off={off}
            onTakeOff={takeOff}
            onMap={onMap}
            onTalking={onTalking}
            onTrust={onTrust}
            withdrawnLine={withdrawnLine}
            codeEntry={codeEntry}
          />
        ) : (
          <section className="py-10">
            {(off === 'removed' || off === 'nothing') && (
              <p role="status" className="mb-6 rounded-2xl border border-forest/25 bg-forest/[0.06] px-4 py-3 text-[0.9rem] leading-snug text-ink-soft text-pretty">
                {withdrawnLine[off]}
              </p>
            )}
            <p className={`animate-fade ${LABEL} text-gold-ink`}>Looking for someone</p>
            <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
              I’m looking for someone serious.
            </h1>
            <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
              Niyyah began so that serious Somali singles could meet each other. Put your name down, and an introduction is
              considered for you by hand. What this is not: a list to browse, a match made by software, or a date. A name on
              the list is not an introduction, and not a promise of one.
            </p>

            {/* Said before the button, in the order it happens. Every line is
                a thing that exists (docs/OPS.md, the runbook), and the marital
                line is the current pilot's rule, said as one. */}
            <section className="animate-rise mt-6 rounded-card border border-forest/25 bg-forest/[0.06] p-5" aria-labelledby="looking-before">
              <h2 id="looking-before" className="font-display text-[1.15rem] font-medium text-ink">
                Before you put your name down
              </h2>
              <dl className="mt-3 space-y-3 text-[0.93rem] leading-relaxed text-ink-soft text-pretty">
                <div>
                  <dt className="font-medium text-ink">Who runs this</dt>
                  <dd>Niyyah is run by {OPERATOR}, who reads the list and makes each introduction by hand, one at a time.</dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">Who this pilot is for</dt>
                  <dd>
                    {MIN_AGE} or older, and serious about marriage. Introductions are beginning in {pilot}; a name from anywhere
                    else is kept for later. {PILOT_MARITAL}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">What happens first</dt>
                  <dd>
                    A conversation with you, by the email or number you give, before anyone is considered for you. Then, if
                    you agree to it, one conversation with a person who knows you; what they say is not kept.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">Before anyone hears about you</dt>
                  <dd>
                    A short description of you that you approve, and that does not say who you are. Nothing that identifies
                    you — your name, your email or number — goes to a person proposed to you until you and they have both
                    said yes.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-ink">How long</dt>
                  <dd>
                    Your request is scheduled to be removed on the Sunday on or before its 180th day; the exact date is shown
                    once it is saved. Take it off any time.
                  </dd>
                </div>
              </dl>
            </section>

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
                {away && (
                  <p role="status" className="mt-3 rounded-2xl border border-gold/40 bg-gold/[0.09] px-4 py-3 text-[0.88rem] leading-snug text-ink-soft text-pretty">
                    Introductions are beginning in {pilot}. From {away} you can leave your name for later: nobody there is
                    being introduced yet, and there is no date for it.
                  </p>
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

              {/* Always on the screen that sends it, even when Identity has
                  asked before: the affirmation travels with this request and
                  the server requires it (netlify/functions/introduce.ts). */}
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

              {/* This list must match what registerInterest sends and the
                  server keeps (netlify/functions/introduce.ts). A privacy claim
                  is the one thing that must never drift from the code it
                  describes — and it is read before the button, not after. */}
              <p className="text-[0.82rem] leading-relaxed text-muted text-pretty">
                What goes, exactly: a way to reach you, your first name if you gave it, whether you are a woman or a man,
                your city and its country, how far you would go, and that you confirmed you are {MIN_AGE} or older. It goes
                to our server under a code this phone made up for it, so you can take your name off from here, and Forget me
                takes it off with everything else. The founder reads the list; nothing else does, and nothing from your map,
                a read or the eleven is attached to it.{' '}
                <TextButton type="button" onClick={onTrust} className="text-[0.82rem] font-medium text-forest underline">
                  What leaves your phone
                </TextButton>
              </p>

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
                  <div role="status" className="mt-3 space-y-2 text-[0.88rem] leading-snug text-clay text-pretty">
                    <p>{problem[state]}</p>
                    {attempt && state === 'taken' && (
                      <div className="rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3 text-ink-soft">
                        <p>
                          To send what is in the form now, take that earlier name off first; then press Put my name down again
                          and it goes under a fresh code. Or leave the earlier one as it is.
                        </p>
                        <button
                          type="button"
                          onClick={takeOffAttempt}
                          className="mt-2 inline-flex items-center gap-2 rounded-full border border-clay/50 px-4 py-2 text-[0.85rem] font-medium text-clay transition hover:bg-clay/10"
                        >
                          Take the earlier name off
                        </button>
                      </div>
                    )}
                    {attempt && state !== 'taken' && !attempt.kept && (
                      <p className="rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3 text-ink-soft">
                        This browser is not saving anything, so if that did reach us this is the only record of it: your code
                        is <Code code={attempt.code} />. Keep it; it takes the name off later, here or on another phone.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </form>

            {codeEntry}

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

interface ReceiptProps {
  intro: IntroState
  again: boolean
  unkept: boolean
  awaySaved: string | null
  pilot: string
  off: 'idle' | 'removing' | 'failed' | Withdrawn
  onTakeOff: () => void
  onMap: () => void
  onTalking: () => void
  onTrust: () => void
  withdrawnLine: Record<Withdrawn, string>
  codeEntry: React.ReactNode
}

/**
 * The receipt: what this phone holds about a saved request, said as a receipt.
 * The server's two days when it gave them; the phone's own day, labelled as
 * such, for a receipt from before it did. Past the scheduled day the code is
 * kept and the truth said: this phone cannot see whether the removal ran.
 */
function Receipt({ intro, again, unkept, awaySaved, pilot, off, onTakeOff, onMap, onTalking, onTrust, withdrawnLine, codeEntry }: ReceiptProps) {
  const goes = scheduledRemoval(intro)
  const past = pastScheduled(intro)
  return (
    <section className="py-10">
      <p className="animate-fade flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
        <CheckIcon size={12} /> Your request
      </p>
      <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
        {intro.confirmed ? `Your request was saved on ${intro.at}.` : `This phone holds a code for a request from around ${intro.at}.`}
      </h1>
      <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
        {intro.confirmed ? (
          <>
            {again ? 'It had already been saved; the same request was not saved twice. ' : ''}
            It is scheduled to be removed on {goes}, or sooner if you take your name off. Dates are in UTC. If you still want an
            introduction after that, put your name down again; there is no reminder.
          </>
        ) : (
          <>
            That day is this phone’s own record, from before the list gave one back. The request is scheduled to be removed on a
            Sunday no later than 180 days after it{goes ? `, so by ${goes}` : ''}; the exact day was not recorded here.
          </>
        )}
      </p>

      {past && (
        <p role="status" className="animate-rise mt-5 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3 text-[0.92rem] leading-snug text-ink-soft text-pretty">
          The day scheduled for its removal has passed. This phone cannot see whether the removal ran, so the code is kept:
          take the name off below to be sure, and if you still want an introduction, put it down again.
        </p>
      )}

      {unkept && (
        <p role="status" className="animate-rise mt-5 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3 text-[0.92rem] leading-snug text-ink-soft text-pretty">
          This browser is not saving anything, so once you leave this screen the only record on your side is gone. Your code is{' '}
          <Code code={intro.code} />. Keep it: it takes the name off later, here or on another phone.
        </p>
      )}

      {awaySaved && (
        <p role="status" className="animate-rise mt-5 rounded-2xl border border-gold/40 bg-gold/[0.09] px-4 py-3 text-[0.92rem] leading-snug text-ink-soft text-pretty">
          Introductions are beginning in {pilot}. Your request is kept for later: nobody in {awaySaved} is being introduced
          yet, and there is no date for it.
        </p>
      )}

      <div className="animate-rise mt-7 rounded-card border border-forest/25 bg-forest/[0.06] p-6">
        <h2 className="font-display text-[1.15rem] font-medium text-ink">What happens now</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty marker:text-forest">
          <li>
            The founder reads the list by hand, and speaks with you first, the way you gave: who you are, what you are
            looking for, and — if you agree — one person who knows you. Nobody is considered for you before that.
          </li>
          <li>
            If there is someone to consider, you are shown a short description of them that they approved and that does
            not say who they are, and they are shown the same of you. Each of you answers yes or no on your own.
          </li>
          <li>
            Nothing that identifies either of you — a name, a way to reach you — goes to the other until you have both said
            yes. If it does not go ahead, you are told only that it went no further, never that the other person said no.
          </li>
        </ol>
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
          If there is nobody to consider yet, nothing happens. There is no list to browse, and no date is promised.
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
          onClick={onTakeOff}
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
          {withdrawnLine.failed} Your code is still held here, and Forget me on Trust takes it off with everything else the
          next time it can.
        </p>
      )}

      {codeEntry}
    </section>
  )
}
