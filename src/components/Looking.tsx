import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { Gender, Identity } from '../types'
import { MIN_AGE } from '../types'
import { getScene, scenes } from '../data/scenes'
import { countries, getCountry } from '../data/countries'
import { reachOptions, type Reach } from '../data/reach'
import { CODE_LENGTH, EXAMPLE_CODE, cleanCode, formatCode, isCode } from '../lib/code'
import { contactProblem, looksReachable } from '../lib/contact'
import { PILOT_SCENE, pastScheduled, pendingIntro, registerInterest, scheduledRemoval, withdrawInterest, type IntroState, type PendingIntro, type Withdrawn } from '../lib/introduce'
import type { Why } from '../lib/net'
import { FocusHeading } from '../hooks/useFocusHeading'
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
 * Since 2026-10-01 (BATCH-02C, docs/DECISIONS.md Part 25) this is laid out to
 * be scanned: a short introduction that says once that a request guarantees
 * nothing, the material disclosures as five labelled rows that stay visible
 * above the form, fields grouped with a line of help each, and what is sent as
 * a short list. A presentation change only: the pilot's rules, the fields, the
 * consent affirmation and every state below the form are as they were.
 *
 * What it says is bounded by what exists. There is no pool to show and no
 * date to promise, so neither is said; the count is not shown, because a
 * number on a door became a scarcity meter last time and this list is not a
 * queue. The receipt reads "Your request was saved on {day}", from the
 * server's answer and nothing else (src/lib/introduce.ts): a phone holds a
 * receipt, not a view of the list. When an answer is lost, the same request
 * goes again under the same code and is never saved twice; when the code
 * cannot be held on this phone it is shown, so the name can still be taken
 * off; and a name can be taken off here by its code, whenever the phone that
 * put it down is not the phone in hand.
 *
 * An attempt whose answer never came is on the page when the person returns:
 * a note at the top (`EarlierTry`, docs/DECISIONS.md Part 31) says it may have
 * reached us, shows the code when only this page holds it, and takes it off
 * directly, with no new submission. `pendingIntro()` owns that record; this
 * screen only reads it.
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
  /**
   * The attempt this phone is still waiting on, as `pendingIntro()` last said:
   * its code, the day, and whether this phone's storage holds it. A view for
   * rendering, never a second record: the lib owns it, and this is read again
   * after every outcome that can change it (`syncPending`). Read at mount, so
   * an attempt left by an earlier visit, a reload or a trip to another screen
   * is on the page when the form is.
   */
  const [pending, setPending] = useState<PendingIntro | null>(pendingIntro)
  /** What "Take my name off" (the receipt's, or the earlier try's) is doing, or did. */
  const [off, setOff] = useState<'idle' | 'removing' | 'failed' | Withdrawn>('idle')
  /**
   * Whether a submit or a withdrawal of the earlier try is in flight. A ref, so
   * the guard holds between two taps in one frame: `aria-disabled` and the
   * button's own state say so to a person, and this is what stops the request.
   */
  const busy = useRef(false)
  /** Taking off by a typed code: the field and its outcome. */
  const [typed, setTyped] = useState('')
  const [entry, setEntry] = useState<'closed' | 'open' | 'checking' | 'not-a-code' | 'failed' | Withdrawn>('closed')
  /** After "again": the request was saved earlier, and this is the same one. */
  const [again, setAgain] = useState(false)
  /**
   * Counts the arrivals that change this screen's content in place, so that
   * App, which scrolls and focuses only when the screen changes, does neither;
   * see Arrival below. Bumped by the form's request saved (form → receipt), the
   * receipt's or the earlier try's name taken off (→ form with its word), and,
   * since BATCH-07B, the first uncertain result and a newly entered conflict
   * (the note about the earlier try, at the top). Nothing else bumps it. `from`
   * is the form a failed tap came from, whose focus the arrival releases.
   */
  const [arrival, setArrival] = useState<{ n: number; from: HTMLElement | null }>({ n: 0, from: null })
  const arrive = (from: HTMLElement | null = null) => setArrival((a) => ({ n: a.n + 1, from }))
  const mainRef = useRef<HTMLElement>(null)

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

  /** Read the pending attempt again, after anything that can have changed it. Returns what it found. */
  function syncPending(): PendingIntro | null {
    const now = pendingIntro()
    setPending(now)
    return now
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ready || !gender || state === 'sending' || busy.current) return
    busy.current = true
    // Where the tap came from, read now: the event is gone by the time the answer is.
    const form = e.currentTarget
    const hadEarlier = !!pending
    const wasConflict = state === 'taken'
    setState('sending')
    // A stale word about an earlier withdrawal ("your name is off the list",
    // or that it could not be confirmed) is not about this request.
    setOff('idle')
    try {
      const result = await registerInterest({ contact, firstName, gender, scene, country: other ? country : undefined, reach })
      const held = syncPending()
      if (!result.ok) {
        setState(result.why)
        // The note about the earlier try sits at the top of the page, and this
        // tap was at the bottom: bring it into view the first time it appears
        // and the first time it turns into a conflict, never for an outcome
        // the person has already been shown (docs/DECISIONS.md Part 31).
        if (held && (!hadEarlier || (result.why === 'taken' && !wasConflict))) arrive(form)
        return
      }
      setState('idle')
      setAgain(result.again)
      // A name taken off and put down again in the same visit: the saved panel,
      // not the form with "your name is off the list" still above it.
      setEntry('closed')
      arrive()
      // What she told this form, kept for the rest of the app: her side, her
      // city and that she is an adult — the same things Identity and Situation
      // ask, so a map or a read after this does not ask them again.
      onIdentity({ gender, scene, ...(other && country ? { country } : {}), ...(firstName.trim() ? { firstName: firstName.trim() } : {}), adult: true })
      onRegistered(result.state)
    } finally {
      busy.current = false
    }
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
    syncPending()
    setOff(gone)
    arrive()
    onWithdrawn()
  }

  /**
   * The earlier try's own button: take it off by the code this phone still
   * holds, with no new submission and without Forget me. Whatever the answer,
   * the same code is the one asked about; it leaves the phone only when the
   * server has answered `removed` or `nothing` (withdrawInterest), so a failure
   * keeps both the code and this button for another go.
   */
  async function takeOffPending() {
    if (!pending || state === 'sending' || busy.current) return
    busy.current = true
    setOff('removing')
    try {
      const gone = await withdrawInterest(pending.code)
      if (gone === 'failed') {
        setOff('failed')
        return
      }
      // Taken off, or nothing under it: the form goes again under a fresh code,
      // with whatever she has typed. The result is the confirmation above it.
      setState('idle')
      syncPending()
      setOff(gone)
      arrive()
    } finally {
      busy.current = false
    }
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
      // The lib clears a pending attempt under the same code; the note about it goes with it.
      syncPending()
      if (intro && cleanCode(typed) === intro.code) onWithdrawn()
    }
  }

  /** One sentence per reason, because the reasons want different things done. */
  const problem: Record<Why | 'withdrawn', string> = {
    unreachable:
      'We could not tell whether that reached us. Nothing is lost here: press the button again and the same request goes under the same code, so it is never saved twice.',
    garbled: 'Something came back wrong from our side, so nothing is confirmed. Press the button again: the same request goes under the same code, so it is never saved twice.',
    refused: `Our side could not finish that — that is us, not you. If it did reach us, pressing the button again sends the same request under the same code, so it is never saved twice. Or write to ${CONTACT_EMAIL} and it goes on by hand.`,
    'not-a-code': 'Something in the form did not fit. Check the email or number, and the city.',
    taken: 'An earlier try went through with what you had typed then. Your changes were not saved over it. The note at the top of this page says what you can do.',
    withdrawn:
      'That code was taken off before this request was answered, so the request stands as taken off: it is not on the list the founder reads, and the weekly run clears anything left under the code. Press the button again to send this one under a fresh code.',
    'not-found': 'That did not go through. Try again in a moment.',
    expired: 'That did not go through. Try again in a moment.',
  }

  const withdrawnLine: Record<Withdrawn, string> = {
    removed: 'Your name is off the list. Nothing about you is held there now.',
    nothing: 'Nothing was under that code any more. It is marked as taken off, so a request still on its way under it is refused for the next days.',
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

      <main ref={mainRef} className="mx-auto max-w-xl px-6">
        {intro ? (
          <Receipt
            intro={intro}
            again={again}
            unkept={!intro.kept}
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
            {/* First in the screen, so its heading is the one `App` focuses on
                arrival and the one an arrival from a submit brings into view.
                It and the confirmation above never show together: taking the
                earlier try off clears what this reads. */}
            {pending && <EarlierTry pending={pending} conflict={state === 'taken'} off={off} onTakeOff={takeOffPending} />}
            <p className={`animate-fade ${LABEL} text-gold-ink`}>Looking for someone</p>
            <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
              Put your name down for an introduction.
            </h1>
            <p className="animate-rise mt-3 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
              Request an introduction to another serious Somali single. Submitting a request does not guarantee an
              introduction.
            </p>

            {/* Said before the button, in the order it happens, and always
                visible: nothing here is behind a disclosure. Every line is a
                thing that exists (docs/OPS.md, the runbook), and the marital
                line is the current pilot's rule, said as one. */}
            <section className="animate-rise mt-5 rounded-card border border-forest/25 bg-forest/[0.06] p-4" aria-labelledby="looking-before">
              <h2 id="looking-before" className="font-display text-[1.1rem] font-medium text-ink">
                Before you put your name down
              </h2>
              <dl className="mt-2 divide-y divide-forest/15 text-[0.95rem] leading-[1.5] text-ink-soft">
                <div className="py-1.5 first:pt-0">
                  <dt className="inline font-medium text-ink">Who runs it. </dt>
                  <dd className="inline">
                    Niyyah is run by {OPERATOR}, who reads each request and makes every introduction by hand, one at a time.
                  </dd>
                </div>
                <div className="py-1.5">
                  <dt className="inline font-medium text-ink">Who it is for. </dt>
                  <dd className="inline">
                    {MIN_AGE} or older, and serious about marriage. Introductions are beginning in {pilot}; a name from anywhere
                    else is kept for later, with no opening date. {PILOT_MARITAL}
                  </dd>
                </div>
                <div className="py-1.5">
                  <dt className="inline font-medium text-ink">What happens first. </dt>
                  <dd className="inline">
                    A conversation with you, by the email or number you give, before anyone is considered for you. Then, if you
                    agree to it, one conversation with a person who knows you; what they say is not kept.
                  </dd>
                </div>
                <div className="py-1.5">
                  <dt className="inline font-medium text-ink">Before anyone hears about you. </dt>
                  <dd className="inline">
                    The first thing a proposed person hears about you is a short description you approve; it does not say who
                    you are. Nothing that identifies you, such as your name or contact, goes to a person proposed to you until
                    you and they have both said yes.
                  </dd>
                </div>
                <div className="py-1.5 last:pb-0">
                  <dt className="inline font-medium text-ink">How long it stays. </dt>
                  <dd className="inline">
                    It is scheduled to be removed on the Sunday on or before its 180th day; the exact date is shown when it is
                    saved. Take it off any time.
                  </dd>
                </div>
              </dl>
            </section>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <h2 className="font-display text-[1.15rem] font-medium text-ink">About you</h2>
              <div>
                <p id="looking-gender-label" className={LABEL}>
                  You are
                </p>
                <div role="radiogroup" aria-labelledby="looking-gender-label" className="mt-2 grid grid-cols-2 gap-2.5">
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
                <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">Choose your city or area. If it isn’t listed, choose Somewhere else.</p>
                <div role="group" aria-labelledby="looking-scene-label" className="mt-2 flex flex-wrap gap-2">
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

              <h2 className="pt-1 font-display text-[1.15rem] font-medium text-ink">How to reach you</h2>
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
                <p id="looking-contact-help" className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">
                  For the founder to contact you about your request.
                </p>
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
                  aria-describedby={contactHint ? 'looking-contact-help looking-contact-hint' : 'looking-contact-help'}
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
              <section className="rounded-2xl border border-line bg-white/40 px-4 py-3 text-[0.92rem] leading-[1.5] text-ink-soft" aria-labelledby="looking-goes">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <h2 id="looking-goes" className="font-display text-[1rem] font-medium text-ink">
                    What goes, exactly
                  </h2>
                  <TextButton type="button" onClick={onTrust} className="-mr-2 px-1 text-[0.92rem] font-medium text-forest underline">
                    What leaves your phone
                  </TextButton>
                </div>
                <ul className="space-y-1.5">
                  <li className="text-pretty">
                    <span className="font-medium text-ink">Sent: </span>a way to reach you, your first name if you gave it,
                    whether you are a woman or a man, your city and its country, how far you would go, and that you confirmed
                    you are {MIN_AGE} or older.
                  </li>
                  <li className="text-pretty">
                    <span className="font-medium text-ink">Who reads it: </span>the founder reads the list; nothing else does.
                    Nothing from your map, a read or the eleven is attached.
                  </li>
                  <li className="text-pretty">
                    <span className="font-medium text-ink">Taking it back: </span>it goes to our server under a code this
                    phone made up for it, so you can take your name off from here; Forget me removes it with everything else.
                  </li>
                </ul>
              </section>

              <div>
                <Button type="submit" disabled={!ready || state === 'sending' || off === 'removing'} className="group w-full sm:w-auto">
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
                  </div>
                )}
              </div>
            </form>

            <div className="[&>section]:mt-8">{codeEntry}</div>

            <p className="mt-8 text-[0.92rem] text-muted">
              Already talking to someone?{' '}
              <TextButton onClick={onTalking} className="text-[0.92rem] font-medium text-forest underline">
                Start there instead
              </TextButton>
            </p>
          </section>
        )}
      </main>
      {arrival.n > 0 && <Arrival key={arrival.n} within={mainRef} from={arrival.from} />}
    </div>
  )
}

/**
 * Where the person lands when the form becomes the receipt, or the receipt
 * becomes the form with its word that the name is off (docs/DECISIONS.md
 * Part 30). Both happen inside the one `looking` screen, so `App`'s scroll to
 * the top and its heading focus, which run only when the screen name changes,
 * did not: the view kept the form's offset, so the new result's beginning was
 * above the window, and the button that had focus was gone, so focus sat on
 * `<body>`.
 *
 * Two separate actions, on mount only, and mounted only by the arrivals
 * counted above (keyed by their count), so a rerender, a field change, a
 * validation message or a retry never reaches them and the first arrival
 * through `App` is untouched. The scroll is instant and runs before paint;
 * focus is the shared heading focus, only if it was lost, so a control the
 * person has moved to (the header's Back) keeps it. `FocusHeading` focuses
 * without scrolling, which is why the scroll is its own line.
 *
 * A failed tap in the form (BATCH-07B) is the one case where focus is not yet
 * lost: it is still on the submit button, or on the field Enter was pressed
 * in, and the note it brings into view is at the other end of the page. `from`
 * is that form; focus inside it is released here, in the same layout pass, so
 * the heading can take it. (Chromium drops focus from a disabled button on its
 * own; this does not depend on that, and a disabled button cannot be blurred,
 * which is why it waits for the commit that enables it again.)
 */
function Arrival({ within, from }: { within: RefObject<HTMLElement | null>; from: HTMLElement | null }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const at = document.activeElement
    if (from && at instanceof HTMLElement && from.contains(at)) at.blur()
  }, [from])
  return <FocusHeading within={within} onlyIfLost />
}

/**
 * The note about an earlier try (docs/DECISIONS.md Part 31): a request this
 * phone began sending and never got a confirmed answer to, or one the server
 * says it saved with other details than the form now holds.
 *
 * It says only what is known. An uncertain try "may have reached us": there is
 * no receipt, so nothing is said about being on the list, being a member or
 * anyone's turn. A conflict is known to be saved, because the server refused
 * to write over it. Where the code lives is said exactly: when this browser's
 * storage holds it, that it keeps the code and the day and nothing she typed;
 * when only this page holds it, the code itself, once, with what a reload or
 * Back and return does to it.
 *
 * The one control takes the earlier try off by that code, with no new
 * submission. It is `aria-disabled` while the request runs rather than
 * `disabled`, so it keeps focus, and the handler (not the attribute) is what
 * stops a second request. A failure keeps the code, the card and this button;
 * its words are about the withdrawal, not the submission. There is no way to
 * dismiss it: the code is cleared only by the helper, when the server answers
 * `removed` or `nothing`, a request is saved under it, or Forget me runs.
 */
function EarlierTry({ pending, conflict, off, onTakeOff }: { pending: PendingIntro; conflict: boolean; off: 'idle' | 'removing' | 'failed' | Withdrawn; onTakeOff: () => void }) {
  const removing = off === 'removing'
  const status = removing ? 'Taking it off…' : off === 'failed' ? 'We could not confirm that it came off. Keep the recovery code and try again.' : ''
  const body = 'text-[0.92rem] leading-snug text-ink-soft text-pretty'
  const held = pending.kept ? (
    <p className={`mt-2 ${body}`}>This browser keeps its recovery code and when the attempt began. It does not save your contact or form answers with that record.</p>
  ) : (
    <p className={`mt-3 rounded-2xl border border-clay/40 bg-white/60 px-4 py-3 ${body}`}>
      This browser could not save the recovery code. Your code is <Code code={pending.code} />. Keep a copy so you can take the request off here or on another
      phone. Closing or reloading this page loses the code here. Going Back and returning within Niyyah keeps it.
    </p>
  )
  return (
    <section aria-labelledby="looking-earlier" className="mb-6 rounded-card border border-clay/40 bg-clay/[0.07] p-4">
      <h2 id="looking-earlier" className="font-display text-[1.1rem] font-medium text-ink">
        {conflict ? 'An earlier try was saved with different details' : 'An earlier try may have reached us'}
      </h2>
      {conflict ? (
        <>
          <p className={`mt-2 ${body}`}>
            The details in this form did not replace it. To get its receipt, enter the original details again, including how far you would go. To submit different
            details, take the earlier request off first.
          </p>
          <p className={`mt-2 ${body}`}>You can also leave it unchanged. Its recovery code stays available here.</p>
        </>
      ) : (
        <p className={`mt-2 ${body}`}>
          This page has a record of a request started around {pending.at}, but no confirmed receipt. We cannot tell whether it was saved.
        </p>
      )}
      {held}
      {!conflict && (
        <p className={`mt-2 ${body}`}>
          To try again, enter the same details below. If the earlier request was saved, you’ll get its receipt without creating another request. You can also take the
          earlier try off.
        </p>
      )}
      <button
        type="button"
        onClick={onTakeOff}
        aria-disabled={removing}
        className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-clay/50 bg-white/50 px-5 py-2.5 text-[0.88rem] font-medium text-clay transition hover:bg-clay/10 aria-disabled:cursor-default aria-disabled:opacity-60"
      >
        {removing ? <Spinner /> : null}
        {removing ? 'Taking it off…' : off === 'failed' ? 'Try taking it off again' : conflict ? 'Take the earlier name off' : 'Take that try off'}
      </button>
      <p className="mt-2 text-[0.85rem] leading-snug text-muted text-pretty">
        This takes off any request under that code and prevents an unfinished submission under it from being saved.
      </p>
      <p role="status" className={status ? 'mt-2 text-[0.88rem] leading-snug text-clay text-pretty' : undefined}>
        {status}
      </p>
    </section>
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
          This browser is not saving anything, so once this page is closed or reloaded the only record on your side is gone.
          Until then, Take my name off here and Forget me on Trust still work. Your code is <Code code={intro.code} />. Keep
          it: it takes the name off later, here or on another phone.
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
