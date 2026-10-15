import { useEffect, useRef, useState } from 'react'
import { CODE_LENGTH, EXAMPLE_CODE, cleanCode, formatCode, isCode } from '../lib/code'
import { withdrawInterest, type IntroState, type Withdrawal } from '../lib/introduce'
import { CONTACT_EMAIL } from '../lib/site'
import { ArrowRight, BackButton, Button, Logo, Spinner, TextButton, fieldClass } from './ui'

interface Props {
  /** The earlier request this phone holds a code for, or null. */
  intro: IntroState | null
  /** The code this phone held is gone: it was taken off, or the server had nothing under it. */
  onWithdrawn: () => void
  /** The other door. */
  onTalking: () => void
  /** Two minutes on where she stands. */
  onMap: () => void
  onTrust: () => void
  onBack: () => void
}

/**
 * Introductions: new requests are closed (docs/DECISIONS.md, release R3).
 *
 * Founder-led introduction intake is no longer the operating model, and
 * matching is not available, so nothing on this screen takes a name, promises
 * an introduction, names a place introductions are beginning, or gives a date.
 * What it keeps is the way to deal with a request made while intake was open:
 * this phone's own receipt, and a field for a code from any phone.
 *
 * What it says is bounded by what the code knows:
 *
 *  - "removed" appears only on the server's one documented confirmation
 *    (`200 { removed: true }`); "found nothing" only on its one documented
 *    "no such code" (`404 { error: 'not_found' }`); everything else is
 *    "could not confirm", and says nothing about whether a request exists.
 *  - It never says a request was read, matched, kept or deleted beyond that,
 *    and the retention line states the 180-day rule and the weekly cleanup that
 *    carries it out, not a day by which cleanup has happened
 *    (netlify/functions/sweep.ts removes a name at the last weekly run before
 *    its 180th day, and again at the next run if one fails).
 *  - The day shown on the receipt is this phone's own record of it.
 *
 * Keyboard and announcements (release R3 amendment):
 *
 *  - A control that is waiting stays mounted and focusable: it is
 *    `aria-disabled`, not `disabled`, because a disabled button throws away
 *    the focus of the person who just pressed it. Duplicate requests are
 *    stopped by `inFlight`, a ref, so a second click, Enter or Space in the
 *    same tick cannot start another.
 *  - The result containers are mounted before any result, so a screen reader
 *    announces the text that arrives instead of a region that appears with it.
 *  - Focus moves only when a control it sits on is about to be removed (the
 *    receipt goes once its request is taken off), and only if it is inside the
 *    receipt then. A person who moved elsewhere while waiting keeps their place.
 */
const LABEL = 'text-xs font-medium uppercase tracking-[0.2em] text-muted'

type Route = 'own' | 'typed'
interface Outcome {
  route: Route
  kind: Withdrawal | 'bad-length'
}

export default function Looking({ intro, onWithdrawn, onTalking, onMap, onTrust, onBack }: Props) {
  const [typed, setTyped] = useState('')
  /** The field for a code from another phone, while a receipt is shown. Always open without one. */
  const [fieldOpen, setFieldOpen] = useState(false)
  const [busy, setBusy] = useState<Route | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  /** Whether a request is out. A ref, so two activations in one tick cannot both start one. */
  const inFlight = useRef(false)
  const receiptRef = useRef<HTMLElement>(null)
  const closedHeading = useRef<HTMLHeadingElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  /** Set only when focus sits inside a receipt that this result is about to remove. */
  const headingNext = useRef(false)

  /** The receipt is about to go: if focus is on it, the closed state's heading takes focus once it is there. */
  function claimFocusIfOnReceipt() {
    headingNext.current = !!receiptRef.current && receiptRef.current.contains(document.activeElement)
  }

  useEffect(() => {
    if (intro || !headingNext.current) return
    headingNext.current = false
    const h = closedHeading.current
    if (!h) return
    // The same one-time target as useFocusHeading: tabindex -1 for the moment, no tab stop left behind.
    const had = h.hasAttribute('tabindex')
    if (!had) h.setAttribute('tabindex', '-1')
    h.focus({ preventScroll: true })
    if (!had) h.addEventListener('blur', () => h.removeAttribute('tabindex'), { once: true })
  }, [intro])

  /** Opening the field replaces the control that opened it, so it takes focus. */
  useEffect(() => {
    if (fieldOpen) codeInput.current?.focus()
  }, [fieldOpen])

  async function takeOffOwn() {
    if (!intro || inFlight.current) return
    inFlight.current = true
    headingNext.current = false
    setBusy('own')
    const kind = await withdrawInterest(intro.code).catch((): Withdrawal => 'unconfirmed')
    inFlight.current = false
    setBusy(null)
    setOutcome({ route: 'own', kind })
    if (kind !== 'unconfirmed') {
      claimFocusIfOnReceipt()
      onWithdrawn()
    }
  }

  async function takeOffTyped(e: React.FormEvent) {
    e.preventDefault()
    if (inFlight.current) return
    if (!typed) {
      // Nothing to send. The button stays focusable, so say where the work is.
      codeInput.current?.focus()
      return
    }
    if (!isCode(typed)) {
      setOutcome({ route: 'typed', kind: 'bad-length' })
      return
    }
    const code = cleanCode(typed)
    inFlight.current = true
    headingNext.current = false
    setBusy('typed')
    const kind = await withdrawInterest(code).catch((): Withdrawal => 'unconfirmed')
    inFlight.current = false
    setBusy(null)
    setOutcome({ route: 'typed', kind })
    if (kind !== 'unconfirmed') {
      // Clear the field only if it still holds what was sent; edits made while waiting are theirs.
      setTyped((t) => (cleanCode(t) === code ? '' : t))
      if (intro && intro.code === code) {
        claimFocusIfOnReceipt()
        onWithdrawn()
      }
    }
  }

  const unconfirmed = (route: Route) =>
    route === 'own'
      ? `We could not confirm whether that request was removed. This phone is keeping its code. You can try again, use Forget me on Trust, or write to ${CONTACT_EMAIL} with the email or number you gave.`
      : `We could not confirm whether that request was removed. What you typed is still here. You can try again, or write to ${CONTACT_EMAIL} with the code.`

  const message: Record<Route, Record<Outcome['kind'], string>> = {
    own: {
      removed: 'The request under this code is off the list.',
      nothing: 'We found nothing under this phone’s code, so nothing was taken off. It may already have come off the list. This phone has dropped the code.',
      unconfirmed: unconfirmed('own'),
      'bad-length': '',
    },
    typed: {
      removed: 'The request under that code is off the list.',
      nothing: 'We found no request under that code, so nothing was taken off. It may already have come off the list, or a character may be wrong.',
      unconfirmed: unconfirmed('typed'),
      'bad-length': `A request code is ${CODE_LENGTH} characters, like ${formatCode(EXAMPLE_CODE)} (six, if it is an older one). Check for a missing one.`,
    },
  }
  const said = (route: Route) => (outcome && outcome.route === route ? message[route][outcome.kind] : null)

  const codeField = (
    <form onSubmit={takeOffTyped} className="mt-4">
      <label htmlFor="request-code" className="block text-sm font-medium text-ink-soft">
        Request code
      </label>
      <input
        id="request-code"
        ref={codeInput}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        value={typed}
        onChange={(e) => {
          // Spaces, dashes and case are ignored ("QRTW XY34", "qrtw-xy34"). It
          // is never cut to length: an overlong code stays as typed and is
          // refused on submit (`isCode`), because a truncated one could name a
          // different request. No `maxLength` either, since that counts the
          // space or dash someone types or pastes.
          setTyped(cleanCode(e.target.value))
          if (outcome?.route === 'typed') setOutcome(null)
        }}
        placeholder={formatCode(EXAMPLE_CODE)}
        aria-describedby="request-code-help"
        className={`mt-2 w-full bg-white/70 px-4 py-3 text-[1rem] tracking-[0.15em] ${fieldClass}`}
      />
      <p id="request-code-help" className="mt-2 text-[0.82rem] leading-snug text-muted text-pretty">
        Spaces and dashes are ignored.
      </p>
      <Button
        type="submit"
        aria-disabled={!typed || busy !== null}
        aria-busy={busy === 'typed'}
        className="mt-4 w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-40 sm:w-auto"
      >
        {busy === 'typed' ? (
          <>
            <Spinner /> Taking it off…
          </>
        ) : (
          'Take it off the list'
        )}
      </Button>
      {/* Mounted before any result, so what arrives is announced. */}
      <p role="status" className={said('typed') ? 'mt-3 text-[0.9rem] leading-snug text-ink-soft text-pretty' : undefined}>
        {said('typed')}
      </p>
      <p className="mt-3 text-[0.85rem] leading-snug text-muted text-pretty">
        No code? Write to <span className="font-medium text-ink-soft">{CONTACT_EMAIL}</span> with the email or number you gave, and ask for it to be taken off.
      </p>
    </form>
  )

  const tools = (
    <div className="mt-6 rounded-card border border-line bg-white/60 p-6">
      <h2 className="font-display text-[1.15rem] font-medium text-ink">Tools that are still here</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onTalking}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/30 bg-forest/[0.06] px-4 py-2 text-[0.88rem] font-medium text-forest transition hover:bg-forest/[0.12]"
        >
          Talking to someone now? Start there
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onMap}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white/50 px-4 py-2 text-[0.88rem] font-medium text-ink-soft transition hover:border-forest/40"
        >
          Two minutes on where you stand
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-cream pb-16 pt-safe">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <BackButton onClick={onBack} />
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Introductions</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6">
        {/* Mounted whichever state is showing, so the confirmation that arrives as the receipt goes is announced. */}
        <div role="status">
          {!intro && outcome?.route === 'own' && outcome.kind !== 'unconfirmed' && (
            <p className="-mb-4 mt-10 rounded-2xl border border-forest/25 bg-forest/[0.06] px-4 py-3 text-[0.9rem] leading-snug text-ink-soft text-pretty">
              {message.own[outcome.kind]}
            </p>
          )}
        </div>
        {intro ? (
          <section ref={receiptRef} className="py-10">
            <p className={`animate-fade ${LABEL} text-gold-ink`}>Introductions</p>
            <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
              Your earlier request.
            </h1>
            <p className="animate-rise mt-4 text-[1rem] leading-relaxed text-ink-soft text-pretty">
              This phone holds the code for a request put down on {intro.at}, by this phone’s own record. New introduction requests are
              closed, and matching is not available. No date is promised.
            </p>
            <p className="animate-rise mt-3 text-[0.95rem] leading-relaxed text-muted text-pretty">
              A request is meant to be kept for no more than 180 days from the day it was put down. Removal is done by a cleanup that runs
              weekly, so it can come up to a week sooner, and later if a run fails. After 180 days this phone stops offering this code.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={takeOffOwn}
                aria-disabled={busy !== null}
                aria-busy={busy === 'own'}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-clay/50 px-5 py-2.5 text-[0.88rem] font-medium text-clay transition hover:bg-clay/10 aria-disabled:cursor-wait aria-disabled:opacity-50"
              >
                {busy === 'own' ? <Spinner /> : null}
                {busy === 'own' ? 'Taking it off…' : 'Take my name off'}
              </button>
              <TextButton onClick={onTrust} className="text-[0.85rem] font-medium text-muted hover:underline">
                What we hold, exactly
              </TextButton>
            </div>
            {/* Mounted before any result, so what arrives is announced. */}
            <p role="status" className={said('own') ? 'mt-3 text-[0.9rem] leading-snug text-clay text-pretty' : undefined}>
              {said('own')}
            </p>

            <div className="mt-8">
              {fieldOpen ? (
                <div className="rounded-card border border-line bg-white/60 p-6">
                  <h2 className="font-display text-[1.15rem] font-medium text-ink">A request under a different code</h2>
                  {codeField}
                </div>
              ) : (
                <TextButton onClick={() => setFieldOpen(true)} className="min-h-11 text-[0.92rem] font-medium text-forest underline">
                  Use a different code
                </TextButton>
              )}
            </div>

            {tools}
          </section>
        ) : (
          <section className="py-10">
            <p className={`animate-fade ${LABEL} text-gold-ink`}>Introductions</p>
            <h1 ref={closedHeading} className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
              New introduction requests are closed.
            </h1>
            <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
              Niyyah is not taking new names for introductions, and matching is not available. No date is promised.
            </p>

            <div className="mt-8 rounded-card border border-line bg-white/60 p-6">
              <h2 className="font-display text-[1.15rem] font-medium text-ink">Manage an earlier request</h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
                This phone is not holding a request code. If you put your name down while requests were open, type the code it was saved
                under to take it off the list.
              </p>
              {codeField}
            </div>

            {tools}

            <p className="mt-8 text-[0.85rem]">
              <TextButton onClick={onTrust} className="font-medium text-muted hover:underline">
                What we hold, exactly
              </TextButton>
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
