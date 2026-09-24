import { useState } from 'react'
import type { FollowUp as FollowUpRecord, Identity, ModeId, ReadRecord, Reflection, Stage } from '../types'
import type { FollowUpAsk } from '../lib/followup'
import { readIsStale } from '../lib/followup'
import { getScene } from '../data/scenes'
import { momentsFor } from '../data/moments'
import { SinceLastTime } from './home/FollowUp'
import StageBand from './home/StageBand'
import { CONTACT_EMAIL } from '../lib/site'
import {
  CompassGlyph,
  GlyphTile,
  LockGlyph,
  Logo,
  ArrowRight,
  TextButton,
  fieldClass,
  SeedGlyph,
} from './ui'

interface Props {
  identity: Identity
  /** Null for a member who has a Home but no map yet — she said where she is, and skipped the intake. */
  reflection: Reflection | null
  onOpenGuide: (mode?: ModeId) => void
  /** The fast path: say what happened, land in the right voice with it asked. */
  onAsk: (text: string, mode?: ModeId) => void
  onOpenMap: () => void
  /** Trust: what leaves the phone, what we hold, and Forget me. */
  onOpenTrust: () => void
  /** The read on someone — the fastest route from a live problem to an answer. */
  onOpenRead: () => void
  /** True once she has taken one, so the card offers the result rather than the pitch. */
  hasRead: boolean
  /** Before you say yes and the families' words — the deciding stage's instruments. */
  onOpenBeforeYes: () => void
  /** Where the two of them stand, straight to it — the "He answered" card. */
  onOpenJoint: () => void
  hasBeforeYes: boolean
  /**
   * He has answered the eleven she sent. The hook has polled and recorded this
   * since the two-sided eleven shipped, and its only reader was the ladder —
   * so the one outcome the instrument exists to produce was invisible
   * on the only screen she returns to (docs/NIELSEN.md N2).
   */
  coupleAnswered?: boolean
  /** She sent him the eleven and he has not answered yet. */
  coupleWaiting?: boolean
  /** This phone answered someone else's link — the second side of the pair. */
  coupleSecond?: boolean
  onOpenFamilies: () => void
  /** How she chose — her record, reachable again after the ending. */
  onOpenEnding: () => void
  onRestart: () => void
  /** The one open thing to ask her about — usually null. See lib/followup.ts. */
  followUpAsk: FollowUpAsk | null
  onAnswerFollowUp: (id: string, outcome: NonNullable<FollowUpRecord['outcome']>, agreed?: boolean, putAway?: boolean) => void
  /** Her last read, so Home can ask — once a month — whether it still stands. */
  read: ReadRecord | null
  onReadStillStands: () => void
  /** False when this browser refuses to save — the user deserves to know. */
  saveOk: boolean
  /** Where they are in the arc, and moving through it — always their call. */
  stage: Stage
  onSetStage: (s: Stage) => void
}

export default function Home({
  identity,
  reflection,
  onOpenGuide,
  onAsk,
  onOpenMap,
  onOpenTrust,
  onOpenRead,
  hasRead,
  onOpenBeforeYes,
  onOpenJoint,
  hasBeforeYes,
  coupleAnswered = false,
  coupleWaiting = false,
  coupleSecond = false,
  onOpenFamilies,
  onOpenEnding,
  onRestart,
  followUpAsk,
  onAnswerFollowUp,
  read,
  onReadStillStands,
  saveOk,
  stage,
  onSetStage,
}: Props) {
  const [restarting, setRestarting] = useState(false)
  // Who answered her eleven — the other side.
  const answerer = identity.gender === 'man' ? 'She' : 'He'
  const name = identity.firstName?.trim()
  const scene = getScene(identity.scene)
  // Once someone is deciding on a person — or married — the app has no business
  // showing them introductions. Following you past the match means acting like it.
  const seeking = stage === 'preparing' || stage === 'talking'
  // The reflection is weighted to this person — what they named as their
  // hardest part, where they are, and the thinnest ground on their map.
  // A read a month old, with no other question open: has he changed?
  const staleRead = !followUpAsk && seeking && !!read && readIsStale(read)

  const [ask, setAsk] = useState('')
  return (
    <div className="min-h-dvh bg-cream pb-16 pt-safe">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        {/* This browser won't persist anything (private mode / full storage).
            Say it plainly — the alternative is a user losing their reflection
            and finding out tomorrow. */}
        {!saveOk && (
          <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3.5">
            <LockGlyph className="mt-0.5 h-4 w-4 flex-none text-clay" />
            <p className="text-[0.86rem] leading-snug text-ink-soft text-pretty">
              <span className="font-medium text-ink">This browser isn’t saving your progress.</span>{' '}
              Private browsing or full storage will do that. Your reflection lives
              only on this device, so it won’t be here next time — switch off
              private browsing to keep it.
            </p>
          </div>
        )}

        {/* Greeting */}
        <section className="animate-rise pt-10">
          <h1 className="font-display text-[2.2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.6rem]">
            {name ? `Salaam, ${name}.` : 'Salaam.'}
          </h1>
          <p className="mt-2 text-[1rem] text-muted">
            {scene ? (
              <>
                <span className="font-medium text-ink-soft">{scene.label}</span> · {scene.note}
              </>
            ) : (
              'Welcome back.'
            )}
          </p>
        </section>

        {/* Married: the app goes quiet.
            Success used to have no screen — a member who marked herself married
            still got the daily check-in, the introductions, the upsell and the
            work card from a readiness-for-marriage map. Retention past the
            outcome is the thing the strategy claims; here it is a design rather
            than a default. What stays is the words for two families and the
            guide for the first year. Everything else is not offered. */}
        {stage === 'married' && (
          <section className="animate-rise relative mt-8 overflow-hidden rounded-card bg-forest-deep p-7 text-cream">
            <div className="bg-geo pointer-events-none absolute inset-0 opacity-30" aria-hidden />
            <p className="relative text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
              Married, alhamdulillah
            </p>
            <h2 className="mt-3 font-display text-[1.6rem] font-medium leading-snug tracking-tight text-balance">
              We’re done looking. What’s left is the building.
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/75 text-pretty">
              Nothing here will try to keep you. There is no map to raise and nothing to pay for.
              Two things stay, because the in-law conversations do not end at the
              nikah and the first year asks more than anyone says: the words for two families, and the
              guide, in the voice built for repair.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={onOpenEnding}
                className="rounded-full bg-cream px-4 py-2 text-[0.88rem] font-semibold text-forest-deep transition hover:bg-white"
              >
                How you chose
              </button>
              <button
                onClick={onOpenFamilies}
                className="rounded-full border border-cream/30 px-4 py-2 text-[0.88rem] font-medium text-cream transition hover:bg-cream/10"
              >
                The words for two families
              </button>
              <button
                onClick={() => onOpenGuide('therapist')}
                className="rounded-full border border-cream/30 px-4 py-2 text-[0.88rem] font-medium text-cream transition hover:bg-cream/10"
              >
                The guide, for the first year
              </button>
            </div>
            <p className="mt-4 text-[0.8rem] leading-relaxed text-cream/50 text-pretty">
              If your situation changes, say so below — only you decide where you are.
            </p>
          </section>
        )}

        {/* Say what happened.
            This is the answer to why the icon earns a place on a home screen.
            The rest of Niyyah is the slow work of becoming ready; this is the
            1am text, the auntie at the wedding, the reply you've re-read nine
            times. One line, no guide to choose first — we route it. */}
        {stage !== 'married' && (
        <section className="animate-rise mt-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Something happened?
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!ask.trim()) return
              onAsk(ask)
              setAsk('')
            }}
            className="rounded-card border border-line bg-white/70 p-3.5"
          >
            <div className="flex items-end gap-2.5">
              <textarea
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!ask.trim()) return
                    onAsk(ask)
                    setAsk('')
                  }
                }}
                rows={1}
                placeholder="Say it in one line…"
                aria-label="Tell your guide what happened"
                enterKeyHint="send"
                className={`max-h-28 min-h-[2.75rem] flex-1 resize-none bg-cream/60 px-3.5 py-2.5 text-[1rem] leading-relaxed ${fieldClass}`}
              />
              <button
                type="submit"
                disabled={!ask.trim()}
                aria-label="Ask your guide"
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-forest text-cream transition-all hover:bg-forest-deep disabled:opacity-25"
              >
                <ArrowRight />
              </button>
            </div>
            {/* One tap, no typing — and a new member learns what this is for. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {momentsFor(identity.gender).map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => (m.target === 'read' ? onOpenRead() : onAsk(m.prompt, m.mode))}
                  className="rounded-full border border-line bg-cream/70 px-3.5 py-2 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40 hover:bg-white hover:text-ink"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </form>
          <p className="mt-2.5 text-[0.8rem] text-muted text-pretty">
            You don’t pick a guide — we read what you said and open the right one.
          </p>
        </section>
        )}

        {/* The read.
            Of everything in this app, this is the one thing aimed squarely at
            the highest-pain problem we can actually solve today: she already has
            the man, and cannot tell what he means. It sits directly under the
            fast path because that is what it is. */}
        {seeking && (
          <button
            onClick={onOpenRead}
            className="animate-rise group mt-4 flex w-full items-center gap-4 rounded-card border border-forest/25 bg-forest/[0.05] p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-forest/[0.09]"
          >
            <GlyphTile className="bg-forest/10 text-forest">
              <CompassGlyph />
            </GlyphTile>
            <span className="flex-1">
              <span className="font-display text-[1.2rem] font-medium text-ink">
                {hasRead ? 'Your read on someone' : 'Talking to someone? Get a read.'}
              </span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                {hasRead
                  ? 'Open it again, or take it fresh — things change, and so does what they’ve shown you.'
 : 'Ninety seconds on what they’ve done, and the one question to ask them next.'}
              </span>
            </span>
            <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        {/* Deciding together: the conversations most of us have too late,
            asked in month two, and the words for the families. Also at
            "talking", once she has been through them or sent them: the
            read-first person — whose relationship began somewhere else — used
            to be inferred "talking" and never shown the eleven on Home again,
            and "Waiting for him" never appeared here at all. */}
        {(stage === 'deciding' || coupleAnswered || coupleWaiting || (stage === 'talking' && hasBeforeYes)) && (
          <button
            onClick={coupleAnswered ? onOpenJoint : onOpenBeforeYes}
            className={`animate-rise group mt-4 flex w-full items-center gap-4 rounded-card border p-5 text-left transition-all hover:-translate-y-0.5 ${
              coupleAnswered
                ? 'border-gold/45 bg-gold/[0.09] hover:bg-gold/[0.14]'
                : 'border-forest/25 bg-forest/[0.05] hover:bg-forest/[0.09]'
            }`}
          >
            <GlyphTile className={coupleAnswered ? 'bg-gold/15 text-gold-ink' : 'bg-forest/10 text-forest'}>
              <CompassGlyph />
            </GlyphTile>
            <span className="flex-1">
              {(coupleAnswered || coupleWaiting) && (
                <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-ink">
                  {coupleWaiting ? `Waiting for ${answerer === 'He' ? 'him' : 'her'}` : coupleSecond ? 'You both answered' : `${answerer} answered`}
                </span>
              )}
              <span className="font-display text-[1.2rem] font-medium text-ink">
                {coupleAnswered
                  ? 'Where the two of you stand'
                  : hasBeforeYes
                    ? 'Before you say yes — where you left it'
                    : 'Before you say yes'}
              </span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                {coupleAnswered
                  ? coupleSecond
                    ? `You answered ${answerer === 'He' ? 'his' : 'her'} eleven on your own phone. Neither of you sees the other’s answers — only where you match, and the one to open together.`
                    : `${answerer} answered the eleven on ${answerer === 'He' ? 'his' : 'her'} own phone. Neither of you sees the other’s answers — only where you match, and the one to open together.`
                  : coupleWaiting
                    ? `You sent ${answerer === 'He' ? 'him' : 'her'} the eleven. When ${answerer === 'He' ? 'he answers' : 'she answers'}, where the two of you stand shows up here — and nowhere else.`
                    : hasBeforeYes
                    ? 'The conversations you’ve had, the ones you haven’t, and the one to open next.'
                    : 'Eleven conversations most couples have too late — where you’d live, money home, a second wife — and which one to open this week.'}
              </span>
            </span>
            <ArrowRight className={`flex-none transition-transform group-hover:translate-x-0.5 ${coupleAnswered ? 'text-gold-ink' : 'text-forest'}`} />
          </button>
        )}

        <StageBand
          gender={identity.gender}
          stage={stage}
          onSetStage={onSetStage}
          onOpenRead={onOpenRead}
          onOpenBeforeYes={onOpenBeforeYes}
          onOpenFamilies={onOpenFamilies}
          onOpenGuide={() => onOpenGuide()}
        />

        {/* Did the thing we told her to do actually happen? The only question
            here about her life rather than about this app — and the reason a
            one-off instrument becomes a companion for the length of a
            courtship. It is the one thing on Home that asks; the daily
            check-in that used to sit below it asked every day and measured
            nothing. */}
        {stage !== 'married' && (
          <SinceLastTime ask={followUpAsk} onAnswer={onAnswerFollowUp} onAskGuide={(text) => onAsk(text)} />
        )}

        {/* A read is about behaviour over time, and a month later the
            behaviour may have moved. Asked once a month, only while she is
            still talking to someone, and only when nothing else is open. */}
        {staleRead && (
          <section className="animate-rise mt-8">
            <div className="rounded-card border border-gold/30 bg-gold/[0.07] p-5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-ink">Since your read</p>
              <p className="mt-2 font-display text-[1.15rem] font-medium leading-snug text-ink text-pretty">
                It’s been about a month. Has anything changed in what {identity.gender === 'man' ? 'she' : 'he'} has
                shown you?
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={onOpenRead}
                  className="rounded-full border border-forest bg-forest px-4 py-2 text-[0.85rem] font-medium text-cream transition-all hover:bg-forest-deep"
                >
                  Take the read again
                </button>
                <button
                  onClick={onReadStillStands}
                  className="rounded-full border border-line bg-white/60 px-4 py-2 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40"
                >
                  Still the same
                </button>
              </div>
            </div>
          </section>
        )}

        {/* The rest of Home: the guide, the map, what we hold. */}
        <section className="mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Also here
          </p>
          <div className="grid gap-3.5">
            {/* Guide — free-form entry; the work card hands over specific topics. */}
            <button
              onClick={() => onOpenGuide()}
              className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
            >
              <GlyphTile className="bg-forest/10 text-forest">
                <SeedGlyph />
              </GlyphTile>
              <span className="flex-1">
                <span className="font-display text-[1.2rem] font-medium text-ink">
                  Talk to your guide
                </span>
                <span className="mt-0.5 block text-[0.88rem] text-muted">
                  Four voices for the real moments — Auntie, Big Brother, Therapist, Islamic values.
                </span>
              </span>
              <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* What leaves the phone, what we hold, and Forget me — for every
                stage. */}
            <button
              onClick={onOpenTrust}
              className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
            >
              <GlyphTile className="bg-sand text-ink-soft">
                <LockGlyph />
              </GlyphTile>
              <span className="flex-1">
                <span className="font-display text-[1.2rem] font-medium text-ink">Your privacy</span>
                <span className="mt-0.5 block text-[0.88rem] text-muted">
                  What leaves your phone, what we hold, and Forget me.
                </span>
              </span>
              <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* The map — hers when she has one; otherwise the offer. A member who
                said she is married is not offered a readiness-for-marriage map,
                and is not sent back to the one she has. */}
            {reflection && stage !== 'married' ? (
              <button
                onClick={onOpenMap}
                className="group rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
              >
                <GlyphTile small className="bg-forest/10 text-forest">
                  <CompassGlyph />
                </GlyphTile>
                <p className="mt-3 font-display text-[1.1rem] font-medium text-ink">Your map</p>
                <p className="mt-1 text-[0.85rem] leading-snug text-muted text-pretty">
                  {reflection.headline}.{' '}
                  {(() => {
                    // A strong ground is never named as the thinnest, even when it is the lowest.
                    const thinnest = reflection.dimensions.find((d) => d.dimension === reflection.thinnest[0])
                    return thinnest && thinnest.state !== 'strong'
                      ? `Thinnest right now: ${thinnest.label.toLowerCase()}.`
                      : 'Nothing reads thin.'
                  })()}
                </p>
              </button>
            ) : stage !== 'married' ? (
              <button
                onClick={onOpenMap}
                className="group flex items-center gap-4 rounded-card border border-gold/30 bg-gold/[0.07] p-5 text-left transition-all hover:-translate-y-0.5"
              >
                <GlyphTile className="bg-gold/15 text-gold-ink">
                  <CompassGlyph />
                </GlyphTile>
                <span className="flex-1">
                  <span className="font-display text-[1.2rem] font-medium text-ink">Build your map</span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
 Two minutes on what you need, and what you won’t compromise on. Your side of
                    every conversation gets clearer.
                  </span>
                </span>
                <ArrowRight className="flex-none text-gold-ink transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : null}
          </div>
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          {/* The same destruction Trust guards behind two taps and a warning was
              one tap here, on the faintest text on the screen, directly under
              another link. Now it asks (docs/NORMAN.md). */}
          {/* The one route to a person from the screen she returns to
              (docs/NIELSEN.md N5). */}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="px-3 py-2 text-[0.8rem] text-muted underline underline-offset-4 transition hover:text-ink"
          >
            Something wrong, or a question? Write to us
          </a>
          {restarting ? (
            <div className="flex flex-col items-center gap-2.5">
              <p className="text-[0.85rem] leading-snug text-ink-soft text-pretty">
                Start over? Your answers, your map and everything you have done here go from
                this phone. This cannot be undone.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={onRestart}
                  className="rounded-full bg-clay px-5 py-2.5 text-[0.85rem] font-medium text-cream transition hover:opacity-90"
                >
                  Yes, start over
                </button>
                <TextButton
                  onClick={() => setRestarting(false)}
                  className="text-[0.85rem] font-medium text-muted underline hover:text-ink"
                >
                  Keep it
                </TextButton>
              </div>
            </div>
          ) : (
            <TextButton
              onClick={() => setRestarting(true)}
              className="text-[0.8rem] text-muted underline hover:text-ink"
            >
              Start over from the beginning
            </TextButton>
          )}
        </div>
      </main>
    </div>
  )
}
