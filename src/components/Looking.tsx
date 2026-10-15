import { useEffect, useRef, useState } from 'react'
import { CODE_LENGTH, EXAMPLE_CODE, cleanCode, formatCode, isCode } from '../lib/code'
import { lifetimeOver, pendingIntro, withdrawInterest, type IntroState, type PendingIntro, type Withdrawn } from '../lib/introduce'
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
 * Recovery of codes already held (the held repair branch, kept through its
 * integration with release R3; docs/DECISIONS.md):
 *
 *  - **The phone never drops a code because time has passed.** Past the 180th
 *    day the receipt says so and keeps the code: elapsed time does not show
 *    that the server has removed anything, so the request can be taken off
 *    until it has been, or Forget me does it.
 *  - **An earlier try** (`EarlierTry`): a request this phone began sending and
 *    never got an answer to leaves a pending code. It is on the page, says only
 *    that it may have reached us, and takes that code off directly. When only
 *    this page holds the code (storage refused it) the code is shown, with what
 *    a reload does to it. Nothing here can start such an attempt any more; the
 *    note is for the ones that exist.
 *  - **A receipt only this page holds** shows its code too, for the same reason.
 *  - A withdrawal is read strictly (src/lib/introduce.ts, `outcomeOf`):
 *    `200 { removed: true }` confirms removal; `200 { removed: false }` and the
 *    legacy `404 { error: 'not_found' }` mean nothing was found; anything else
 *    is unconfirmed and costs the phone no code.
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
 *    receipt or the earlier-try note goes once its request is taken off), and
 *    only if it is inside it then. A person who moved elsewhere while waiting
 *    keeps their place. When it does move, the view returns to the top, where
 *    the confirmation and the heading are.
 */
const LABEL = 'text-xs font-medium uppercase tracking-[0.2em] text-muted'

const Code = ({ code }: { code: string }) => <span className="font-mono text-[1.05em] font-semibold tracking-wider text-ink">{formatCode(code)}</span>

type Route = 'own' | 'typed' | 'pending'
interface Outcome {
  route: Route
  kind: Withdrawn | 'bad-length'
}

export default function Looking({ intro, onWithdrawn, onTalking, onMap, onTrust, onBack }: Props) {
  const [typed, setTyped] = useState('')
  /** The field for a code from another phone, while a receipt is shown. Always open without one. */
  const [fieldOpen, setFieldOpen] = useState(false)
  const [busy, setBusy] = useState<Route | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  /** The attempt this phone is still waiting on, as `pendingIntro()` last said. A view; the lib owns the record. */
  const [pending, setPending] = useState<PendingIntro | null>(pendingIntro)
  /** Whether a request is out. A ref, so two activations in one tick cannot both start one. */
  const inFlight = useRef(false)
  const receiptRef = useRef<HTMLElement>(null)
  const pendingRef = useRef<HTMLElement>(null)
  /** Whichever heading is the screen's: the receipt's, or the closed state's. */
  const heading = useRef<HTMLHeadingElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  /** Set only when focus sits inside a receipt or an earlier-try note that this result is about to remove. */
  const headingNext = useRef(false)

  /** A receipt or note is about to go: if focus is inside one, the screen's heading takes focus once it is there. */
  function claimFocusIfLeaving() {
    headingNext.current = [receiptRef.current, pendingRef.current].some((el) => !!el && el.contains(document.activeElement))
  }

  /** Read the pending attempt again, after anything that can have changed it (the lib clears it on a confirmed answer). */
  const syncPending = () => setPending(pendingIntro())

  useEffect(() => {
    if (!headingNext.current) return
    headingNext.current = false
    const h = heading.current
    if (!h) return
    window.scrollTo(0, 0)
    // The same one-time target as useFocusHeading: tabindex -1 for the moment, no tab stop left behind.
    const had = h.hasAttribute('tabindex')
    if (!had) h.setAttribute('tabindex', '-1')
    h.focus({ preventScroll: true })
    if (!had) h.addEventListener('blur', () => h.removeAttribute('tabindex'), { once: true })
  }, [intro, pending])

  /** Opening the field replaces the control that opened it, so it takes focus. */
  useEffect(() => {
    if (fieldOpen) codeInput.current?.focus()
  }, [fieldOpen])

  async function takeOffOwn() {
    if (!intro || inFlight.current) return
    inFlight.current = true
    headingNext.current = false
    setBusy('own')
    const kind = await withdrawInterest(intro.code).catch((): Withdrawn => 'failed')
    inFlight.current = false
    setBusy(null)
    setOutcome({ route: 'own', kind })
    syncPending()
    if (kind !== 'failed') {
      claimFocusIfLeaving()
      onWithdrawn()
    }
  }

  /** The earlier try's own button: take it off by the code this phone still holds, with no new request. */
  async function takeOffPending() {
    if (!pending || inFlight.current) return
    inFlight.current = true
    headingNext.current = false
    setBusy('pending')
    const kind = await withdrawInterest(pending.code).catch((): Withdrawn => 'failed')
    inFlight.current = false
    setBusy(null)
    setOutcome({ route: 'pending', kind })
    syncPending()
    if (kind !== 'failed') claimFocusIfLeaving()
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
    const kind = await withdrawInterest(code).catch((): Withdrawn => 'failed')
    inFlight.current = false
    setBusy(null)
    setOutcome({ route: 'typed', kind })
    // The lib clears a pending attempt under the same code; the note about it goes with it.
    syncPending()
    if (kind !== 'failed') {
      // Clear the field only if it still holds what was sent; edits made while waiting are theirs.
      setTyped((t) => (cleanCode(t) === code ? '' : t))
      claimFocusIfLeaving()
      if (intro && intro.code === code) onWithdrawn()
    }
  }

  const unconfirmed = (route: Route) =>
    route === 'typed'
      ? `We could not confirm whether that request was removed. What you typed is still here. You can try again, or write to ${CONTACT_EMAIL} with the code.`
      : `We could not confirm whether that request was removed. This phone is keeping its code. You can try again, use Forget me on Trust, or write to ${CONTACT_EMAIL} with the email or number you gave.`

  const message: Record<Route, Record<Outcome['kind'], string>> = {
    own: {
      removed: 'The request under this code is off the list.',
      nothing: 'We found nothing under this phone’s code, so nothing was taken off. It may already have come off the list. This phone has dropped the code.',
      failed: unconfirmed('own'),
      'bad-length': '',
    },
    pending: {
      removed: 'The request under the code this phone was holding for that try is off the list.',
      nothing:
        'We found nothing under the code this phone was holding for that try, so nothing was taken off. It may never have reached us. This phone has dropped the code.',
      failed: unconfirmed('pending'),
      'bad-length': '',
    },
    typed: {
      removed: 'The request under that code is off the list.',
      nothing: 'We found no request under that code, so nothing was taken off. It may already have come off the list, or a character may be wrong.',
      failed: unconfirmed('typed'),
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
          {outcome && outcome.kind !== 'failed' && ((outcome.route === 'own' && !intro) || (outcome.route === 'pending' && !pending)) && (
            <p className="-mb-4 mt-10 rounded-2xl border border-forest/25 bg-forest/[0.06] px-4 py-3 text-[0.9rem] leading-snug text-ink-soft text-pretty">
              {message[outcome.route][outcome.kind]}
            </p>
          )}
        </div>
        {intro ? (
          <section ref={receiptRef} className="py-10">
            {pending && <EarlierTry ref={pendingRef} pending={pending} busy={busy === 'pending'} unavailable={busy !== null} said={said('pending')} onTakeOff={takeOffPending} />}
            <p className={`animate-fade ${LABEL} text-gold-ink`}>Introductions</p>
            <h1 ref={heading} className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
              Your earlier request.
            </h1>
            <p className="animate-rise mt-4 text-[1rem] leading-relaxed text-ink-soft text-pretty">
              This phone holds the code for a request put down on {intro.at}, by this phone’s own record. New introduction requests are
              closed, and matching is not available. No date is promised.
            </p>
            <p className="animate-rise mt-3 text-[0.95rem] leading-relaxed text-muted text-pretty">
              A request is meant to be kept for no more than 180 days from the day it was put down. Removal is done by a cleanup that runs
              weekly, so it can come up to a week sooner, and later if a run fails. The days passing does not show this phone that a request
              has come off the list, so it keeps the code until you take the request off, or use Forget me.
            </p>
            {lifetimeOver(intro) && (
              <p className="animate-rise mt-4 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3 text-[0.92rem] leading-snug text-ink-soft text-pretty">
                The 180 days from {intro.at} are over. This phone cannot see whether the request has come off the list, so it has kept the code. Take the
                request off below to be sure, or use Forget me on Trust.
              </p>
            )}
            {!intro.kept && (
              <p className="animate-rise mt-4 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3 text-[0.92rem] leading-snug text-ink-soft text-pretty">
                This browser is not saving anything, so once this page is closed or reloaded this code is gone from here. Until then, Take my name off
                and Forget me on Trust still work. Your code is <Code code={intro.code} />. Keep it: it takes the request off later, here or on another phone.
              </p>
            )}

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
            {pending && <EarlierTry ref={pendingRef} pending={pending} busy={busy === 'pending'} unavailable={busy !== null} said={said('pending')} onTakeOff={takeOffPending} />}
            <p className={`animate-fade ${LABEL} text-gold-ink`}>Introductions</p>
            <h1 ref={heading} className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
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

/**
 * The note about an earlier try: a request this phone began sending and never
 * got a confirmed answer to, so it holds a code under which something may have
 * been saved. Nothing can start such an attempt now that new requests are
 * closed; this is for the ones that exist.
 *
 * It says only what is known. There is no receipt, so nothing is said about
 * being on the list. Where the code lives is said exactly: when this browser's
 * storage holds it, that it keeps the code and the day and nothing else; when
 * only this page holds it, the code itself, with what a reload does to it.
 *
 * The one control takes that code off. It is `aria-disabled` while a request is
 * out, not `disabled`, so it keeps focus; `inFlight` in the screen is what stops
 * a second request. A failure keeps the code, the note and the button. The code
 * leaves the phone only when the server has answered `removed` or `nothing`
 * (src/lib/introduce.ts), or Forget me runs. Its result region is mounted before
 * any result, so what arrives is announced.
 */
function EarlierTry({
  pending,
  busy,
  unavailable,
  said,
  onTakeOff,
  ref,
}: {
  pending: PendingIntro
  /** This note's own withdrawal is out. */
  busy: boolean
  /** Any withdrawal is out: the button says so to a person, and the handler already refuses. */
  unavailable: boolean
  said: string | null
  onTakeOff: () => void
  ref: React.Ref<HTMLElement>
}) {
  const body = 'text-[0.92rem] leading-snug text-ink-soft text-pretty'
  return (
    <section ref={ref} aria-labelledby="looking-earlier" className="mb-6 rounded-card border border-clay/40 bg-clay/[0.07] p-4">
      <h2 id="looking-earlier" className="font-display text-[1.1rem] font-medium text-ink">
        An earlier try may have reached us
      </h2>
      <p className={`mt-2 ${body}`}>
        This phone has a record of a request started around {pending.at}, but no confirmed receipt. We cannot tell whether it was saved. New introduction
        requests are closed, and matching is not available.
      </p>
      {pending.kept ? (
        <p className={`mt-2 ${body}`}>This browser keeps its recovery code and when the attempt began. It does not save your contact or form answers with that record.</p>
      ) : (
        <p className={`mt-3 rounded-2xl border border-clay/40 bg-white/60 px-4 py-3 ${body}`}>
          This browser could not save the recovery code. Your code is <Code code={pending.code} />. Keep a copy so you can take the request off here or on another
          phone. Closing or reloading this page loses the code here. Going Back and returning within Niyyah keeps it.
        </p>
      )}
      <button
        type="button"
        onClick={onTakeOff}
        aria-disabled={unavailable}
        aria-busy={busy}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-clay/50 bg-white/50 px-5 py-2.5 text-[0.88rem] font-medium text-clay transition hover:bg-clay/10 aria-disabled:cursor-wait aria-disabled:opacity-50"
      >
        {busy ? <Spinner /> : null}
        {busy ? 'Taking it off…' : 'Take that try off'}
      </button>
      <p className="mt-2 text-[0.85rem] leading-snug text-muted text-pretty">This takes off any request under that code.</p>
      <p role="status" className={said ? 'mt-2 text-[0.88rem] leading-snug text-clay text-pretty' : undefined}>
        {said}
      </p>
    </section>
  )
}
