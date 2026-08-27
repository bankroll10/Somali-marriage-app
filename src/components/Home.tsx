import { useEffect, useRef, useState } from 'react'
import type { CheckIn, Dimension, Identity, ModeId, Reflection, Stage, StepRecord, TrustSettings } from '../types'
import { getScene } from '../data/scenes'
import { chosenReason, getDailyReflection, tomorrowTag } from '../data/daily'
import { checkInReflection, comebackLine, getMood, journeyLine, moods, todayKey, weekStrip, yesterdayLine, type MoodId } from '../data/checkin'
import { getMode } from '../data/coach'
import { getStage, stages } from '../data/stages'
import { momentsFor } from '../data/moments'
import {
  groundOrder,
  nextStepFor,
  openStep as findOpenStep,
  readyToReflect,
  whenLabel,
} from '../data/nextStep'
import { dailyPrefsFor } from '../lib/personalize'
import { renderReflectionCard } from '../lib/card'
import { shareImage, shareOrCopy } from '../lib/share'
import {
  CheckIcon,
  CompassGlyph,
  GlyphTile,
  HeartGlyph,
  LockGlyph,
  Logo,
  ArrowRight,
  fieldClass,
  PersonGlyph,
  SeedGlyph,
  SparkGlyph,
} from './ui'

interface Props {
  identity: Identity
  reflection: Reflection
  trust: TrustSettings
  onOpenGuide: (mode?: ModeId) => void
  /** The fast path: say what happened, land in the right voice with it asked. */
  onAsk: (text: string, mode?: ModeId) => void
  onOpenMap: () => void
  onOpenProfile: () => void
  onOpenDiscovery: () => void
  onOpenConnections: () => void
  connectionsCount: number
  onPhilosophy: () => void
  onRestart: () => void
  /** Today's mood, if already checked in. */
  checkInMood: MoodId | null
  /** Full check-in history — continuity, pattern rewards, the week strip. */
  checkIns: CheckIn[]
  onCheckIn: (mood: MoodId) => void
  /** The work taken on from the map — the app's centre of gravity. */
  steps: StepRecord[]
  onTakeStep: (d: Dimension) => void
  onCompleteStep: () => void
  /** Date of the most recent reading, so we know when a new one is worth it. */
  lastReading?: string
  /** False when this browser refuses to save — the user deserves to know. */
  saveOk: boolean
  /** First day on the path + who we're waiting to hear from. */
  firstSeen: string
  pendingNames: string[]
  /** Where they are in the arc, and moving through it — always their call. */
  stage: Stage
  onSetStage: (s: Stage) => void
  /** The single best not-yet-met person, for the Home introduction hook. */
  todayIntro: { name: string; age: number; reason: string | null; headline: string } | null
  hookId?: string
}

export default function Home({
  identity,
  reflection,
  trust,
  onOpenGuide,
  onAsk,
  onOpenMap,
  onOpenProfile,
  onOpenDiscovery,
  onOpenConnections,
  connectionsCount,
  onPhilosophy,
  onRestart,
  checkInMood,
  checkIns,
  onCheckIn,
  steps,
  onTakeStep,
  onCompleteStep,
  lastReading,
  saveOk,
  firstSeen,
  pendingNames,
  todayIntro,
  stage,
  onSetStage,
  hookId,
}: Props) {
  const name = identity.firstName?.trim()
  const scene = getScene(identity.scene)
  const st = getStage(stage)
  // Once someone is deciding on a person — or married — the app has no business
  // showing them introductions. Following you past the match means acting like it.
  const seeking = stage === 'preparing' || stage === 'talking'
  // The daily reflection is weighted to this person — what they named as their
  // hardest part, how their week has gone, and the thinnest ground on their map.
  const prefs = dailyPrefsFor(hookId, reflection, checkIns, stage)
  const daily = getDailyReflection(new Date(), prefs)
  const whyThisOne = chosenReason(new Date(), prefs)

  const [ask, setAsk] = useState('')
  const [stageOpen, setStageOpen] = useState(false)

  /**
   * Sharing today's reflection — the one thing in Niyyah that leaves the app.
   * It goes out as an image, because a picture of a thought is something people
   * actually post; a link to a marriage app is not. The card on screen is the
   * preview, so there's no confirmation step to sit through.
   */
  const [shareState, setShareState] = useState<'idle' | 'working' | 'saved'>('idle')
  const shareText = `“${daily.title}” — ${daily.body}\n\nFrom Niyyah, the marriage platform built for the Somali diaspora. niyyah.app`
  const fileName = `niyyah-${daily.tag.toLowerCase()}.png`

  // Draw the card ahead of the tap, while the browser is idle. Two reasons: the
  // share sheet opens instantly, and iOS drops the sheet entirely if you await
  // anything between the tap and the call — a pre-drawn card keeps that path
  // synchronous.
  const card = useRef<{ key: string; blob: Blob } | null>(null)
  useEffect(() => {
    let live = true
    const draw = () => {
      renderReflectionCard(daily)
        .then((blob) => {
          if (live && blob) card.current = { key: daily.title, blob }
        })
        .catch(() => {})
    }
    // A beat after the screen settles, so drawing never competes with the
    // entrance animation.
    const t = window.setTimeout(draw, 700)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [daily])

  function settle(result: Promise<string>) {
    result.then((r) => {
      // 'shared' needs no confirmation — the OS sheet already showed one, and
      // 'cancelled' means they changed their mind. Only the quiet desktop
      // download deserves a word.
      if (r === 'saved' || r === 'copied') {
        setShareState('saved')
        window.setTimeout(() => setShareState('idle'), 3200)
      } else {
        setShareState('idle')
      }
    })
  }

  function handleShareReflection() {
    if (shareState === 'working') return
    const ready = card.current?.key === daily.title ? card.current.blob : null
    if (ready) {
      // No await before this call — the tap's activation carries into the sheet.
      settle(shareImage(ready, fileName, 'reflection_shared'))
      return
    }
    setShareState('working')
    settle(
      renderReflectionCard(daily)
        .catch(() => null)
        .then((blob) =>
          blob
            ? shareImage(blob, fileName, 'reflection_shared')
            : // Canvas unavailable — the words still travel.
              shareOrCopy({ text: shareText, url: 'https://niyyah.app' }, 'reflection_shared'),
        ),
    )
  }

  // ── The work: the map's thinnest ground, turned into one thing to actually do.
  // This is the app's centre — everything else on Home is support for it.
  const today = todayKey()
  const order = groundOrder(reflection.dimensions, steps)
  const carried = findOpenStep(steps)
  // Skipping ("something else") only moves the offer, so it needs no memory.
  const [skips, setSkips] = useState(0)
  const ground: Dimension = carried?.dimension ?? order[skips % order.length]
  const work = nextStepFor(ground)
  const groundLabel = reflection.dimensions.find((d) => d.dimension === ground)?.label ?? ''
  const finishedToday = steps.find((s) => s.done === today) ?? null
  const sinceReading = readyToReflect(steps, lastReading, today)
  function swapGround() {
    if (!carried) {
      setSkips((s) => s + 1)
      return
    }
    const i = order.indexOf(carried.dimension)
    onTakeStep(order[(i + 1) % order.length])
  }

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
          {trust.identityVerified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1.5 text-[0.75rem] font-semibold text-forest">
              <CheckIcon size={12} /> Verified
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        {/* This browser won't persist anything (private mode / full storage).
            Say it plainly — the alternative is a user losing their reflection
            and finding out tomorrow. */}
        {!saveOk && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-3.5">
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
              'Welcome back to your space.'
            )}
          </p>
          {journeyLine(firstSeen, checkIns.length) && (
            <p className="mt-2 text-[0.9rem] font-medium text-gold">
              {journeyLine(firstSeen, checkIns.length)}
            </p>
          )}
        </section>

        {/* Say what happened.
            This is the answer to why the icon earns a place on a home screen.
            The rest of Niyyah is the slow work of becoming ready; this is the
            1am text, the auntie at the wedding, the reply you've re-read nine
            times. One line, no guide to choose first — we route it. */}
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
                className={`max-h-28 min-h-[2.75rem] flex-1 resize-none bg-cream/60 px-3.5 py-2.5 text-[0.98rem] leading-relaxed ${fieldClass}`}
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
                  onClick={() => onAsk(m.prompt, m.mode)}
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

        {/* The work. Home's other half, and the app's centre of gravity: the map
            names your thinnest ground, this turns it into a single honest thing
            to do, and doing it is what eventually moves the map. */}
        <section className="animate-rise mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Your work
          </p>
          <div className="relative overflow-hidden rounded-card bg-forest-deep p-7 text-cream">
            <div className="bg-geo pointer-events-none absolute inset-0 opacity-30" aria-hidden />
            <div className="relative">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
                {finishedToday ? 'Done today' : 'From your map'} ·{' '}
                {finishedToday
                  ? reflection.dimensions.find((d) => d.dimension === finishedToday.dimension)
                      ?.label
                  : groundLabel}
              </p>

              {finishedToday ? (
                <>
                  <p className="mt-3 font-display text-[1.5rem] font-medium leading-snug tracking-tight text-balance">
                    {nextStepFor(finishedToday.dimension).done}
                  </p>
                  <p className="mt-3 text-[0.92rem] leading-relaxed text-cream/70 text-pretty">
                    That’s today. One thing at a time — the next one keeps until
                    tomorrow.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-[0.92rem] leading-relaxed text-cream/70 text-pretty">
                    {carried
                      ? `You took this on ${whenLabel(carried.taken, today)}.`
                      : work.frame}
                  </p>
                  <p className="mt-3 font-display text-[1.45rem] font-medium leading-snug tracking-tight text-balance">
                    {work.action}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <button
                      onClick={() => (carried ? onCompleteStep() : onTakeStep(ground))}
                      className="inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-[0.9rem] font-semibold text-forest-deep transition hover:bg-white"
                    >
                      {carried ? (
                        <>
                          <CheckIcon size={13} /> I did this
                        </>
                      ) : (
                        'I’ll do this'
                      )}
                    </button>
                    <button
                      onClick={() => onOpenGuide(work.mode)}
                      className="group inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-gold-soft transition hover:text-gold"
                    >
                      Talk it through with {getMode(work.mode).label}
                      <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </>
              )}

              {/* Footer links get real vertical padding — they're the smallest
                  targets on the screen and this is a thumb-first product. */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 border-t border-cream/10 pt-1.5">
                {sinceReading > 0 ? (
                  <button
                    onClick={onOpenMap}
                    className="py-2.5 text-left text-[0.8rem] leading-snug text-gold-soft underline-offset-4 hover:underline text-pretty"
                  >
                    {sinceReading} things done since your last reading — see if the map has moved.
                  </button>
                ) : (
                  <button
                    onClick={onOpenMap}
                    className="py-2.5 text-[0.8rem] text-cream/50 underline-offset-4 transition hover:text-cream/80 hover:underline"
                  >
                    {steps.some((s) => s.done)
                      ? 'See everything you’ve done'
                      : 'Where this comes from'}
                  </button>
                )}
                {!finishedToday && (
                  <button
                    onClick={swapGround}
                    className="py-2.5 text-[0.8rem] text-cream/40 underline-offset-4 transition hover:text-cream/70 hover:underline"
                  >
                    Not this one
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Where you are in the arc. This is the product's position made
            visible: the app follows you past the match instead of ending there. */}
        <section className="animate-rise mt-8">
          <div className="rounded-card border border-line bg-white/60 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
                Where you are · {st.label}
              </p>
              {stageOpen ? (
                <button
                  onClick={() => setStageOpen(false)}
                  className="text-[0.8rem] font-medium text-muted underline-offset-4 hover:underline"
                >
                  Close
                </button>
              ) : (
                <button
                  onClick={() => setStageOpen(true)}
                  className="text-[0.8rem] font-medium text-forest underline-offset-4 hover:underline"
                >
                  This changed
                </button>
              )}
            </div>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
              {st.focus}
            </p>
            {stageOpen && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2.5 text-[0.82rem] text-muted">
                  Only you decide this — nothing here is assumed from who you’ve messaged.
                </p>
                <div className="flex flex-wrap gap-2">
                  {stages.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onSetStage(s.id)
                        setStageOpen(false)
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition-all ${
                        s.id === stage
                          ? 'border-forest bg-forest text-cream'
                          : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!stageOpen && st.next && (
              <button
                onClick={() => onSetStage(st.next!.id)}
                className="group mt-3 inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-forest underline-offset-4 hover:underline"
              >
                {st.next.prompt}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </section>

        {/* Daily check-in — the act of returning */}
        <section className="animate-rise mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Daily check-in
          </p>
          {checkInMood ? (
            <CheckedIn
              mood={checkInMood}
              history={checkIns}
              onOpenGuide={onOpenGuide}
              onOpenDiscovery={onOpenDiscovery}
            />
          ) : (
            <div className="rounded-card border border-line bg-white/60 p-5">
              {(() => {
                // A return after time away is acknowledged first; otherwise the
                // quiet yesterday-continuity line.
                const reentry = comebackLine(checkIns) ?? yesterdayLine(checkIns)
                return reentry ? (
                  <p className="mb-1 text-[0.82rem] text-muted text-pretty">{reentry}</p>
                ) : null
              })()}
              <p className="font-display text-[1.25rem] font-medium tracking-tight text-ink">
                How’s your heart today?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {moods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onCheckIn(m.id)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-cream px-3 py-3.5 transition-all hover:-translate-y-0.5 hover:border-forest/40 hover:bg-white"
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[0.85rem] font-medium text-ink-soft">{m.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[0.78rem] text-muted">
                One tap. Your guide listens.
              </p>
            </div>
          )}
        </section>

        {/* Today's reflection — the reason to return */}
        <section className="animate-rise mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Today’s reflection
          </p>
          <div className="relative overflow-hidden rounded-card bg-forest-deep p-7 text-cream">
            <div className="bg-geo pointer-events-none absolute inset-0 opacity-40" aria-hidden />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-full bg-gold-soft/15 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-gold-soft">
                  {daily.tag}
                </span>
                {whyThisOne && (
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-cream/40">
                    Chosen for you
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-display text-[1.6rem] font-medium leading-snug tracking-tight text-balance">
                {daily.title}
              </h2>
              <p className="mt-3 text-[1rem] leading-relaxed text-cream/80 text-pretty">
                {daily.body}
              </p>
              {whyThisOne && (
                <p className="mt-3.5 border-l-2 border-gold-soft/40 pl-3 text-[0.85rem] leading-relaxed text-cream/55 text-pretty">
                  Because {whyThisOne}.
                </p>
              )}
              <button
                onClick={handleShareReflection}
                disabled={shareState === 'working'}
                className="mt-5 inline-flex items-center gap-1.5 py-1 text-[0.85rem] font-medium text-gold-soft transition hover:text-gold disabled:opacity-60"
              >
                {shareState === 'saved' ? (
                  <>
                    <CheckIcon size={12} /> Saved — send it to someone who needs it
                  </>
                ) : shareState === 'working' ? (
                  'Making the card…'
                ) : (
                  'Send this to someone'
                )}
              </button>
              {/* Footer: tomorrow's tease + a quiet wordmark, so a screenshot of
                  this card carries the brand wherever it's shared. */}
              <div className="mt-4 flex items-center justify-between border-t border-cream/10 pt-3">
                <p className="text-[0.78rem] text-cream/50">Tomorrow · {tomorrowTag(prefs)}</p>
                <Logo mono size="sm" className="text-cream/35" />
              </div>
            </div>
          </div>
        </section>

        {/* Your space */}
        <section className="mt-10">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Your space
          </p>
          {pendingNames.length > 0 && (
            <div className="mb-3.5 flex items-center gap-3 rounded-2xl border border-line bg-white/50 px-4 py-3">
              <span className="h-2 w-2 flex-none animate-pulse rounded-full bg-gold" />
              <p className="text-[0.88rem] leading-snug text-ink-soft text-pretty">
                Interest sent to {pendingNames.join(' and ')} — you’ll hear when they
                respond. No chasing.
              </p>
            </div>
          )}
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
                  Six voices for the real moments — Auntie, Big Brother, Therapist & more.
                </span>
              </span>
              <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* People in your scene — when a fresh, high-alignment person is
                waiting, lead with them by name. One considered introduction, a
                real reason to meet — not a feed, not a badge count. Hidden once
                they're deciding on someone or married. */}
            {seeking && (
            <button
              onClick={onOpenDiscovery}
              className="group relative flex items-center gap-4 overflow-hidden rounded-card border border-gold/30 bg-gold/[0.08] p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-gold/[0.14]"
            >
              <GlyphTile className="bg-gold/15 text-gold">
                <SparkGlyph />
              </GlyphTile>
              <span className="flex-1">
                {todayIntro ? (
                  <>
                    <span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-gold">
                      Today’s introduction
                    </span>
                    <span className="mt-0.5 block font-display text-[1.2rem] font-medium text-ink">
                      {todayIntro.name}, {todayIntro.age}
                    </span>
                    <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                      {todayIntro.reason
                        ? `${todayIntro.reason.charAt(0).toUpperCase()}${todayIntro.reason.slice(1)}.`
                        : `${todayIntro.headline} — see why you align.`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-display text-[1.2rem] font-medium text-ink">
                      People in your scene
                    </span>
                    <span className="mt-0.5 block text-[0.88rem] text-muted">
                      Serious, verified people{scene ? ` around ${scene.label}` : ''}, ranked by
                      alignment — not looks.
                    </span>
                  </>
                )}
              </span>
              <ArrowRight className="flex-none text-gold transition-transform group-hover:translate-x-0.5" />
            </button>
            )}

            {/* Connections */}
            {connectionsCount > 0 && (
              <button
                onClick={onOpenConnections}
                className="group flex items-center gap-4 rounded-card border border-forest/30 bg-forest/[0.06] p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-forest/[0.1]"
              >
                <GlyphTile className="bg-forest/10 text-forest">
                  <HeartGlyph />
                </GlyphTile>
                <span className="flex-1">
                  <span className="font-display text-[1.2rem] font-medium text-ink">Connections</span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted">
                    {connectionsCount} guided conversation{connectionsCount === 1 ? '' : 's'} underway.
                  </span>
                </span>
                <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Your profile */}
            <button
              onClick={onOpenProfile}
              className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
            >
              <GlyphTile className="bg-sand text-ink-soft">
                <PersonGlyph />
              </GlyphTile>
              <span className="flex-1">
                <span className="font-display text-[1.2rem] font-medium text-ink">Your profile</span>
                <span className="mt-0.5 block text-[0.88rem] text-muted">
                  How members see you — plus your protections and privacy.
                </span>
              </span>
              <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Readiness map */}
            <button
              onClick={onOpenMap}
                className="group rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
              >
                <div className="flex items-center justify-between">
                  <GlyphTile small className="bg-forest/10 text-forest">
                    <CompassGlyph />
                  </GlyphTile>
                  <span className="font-display text-[1.5rem] font-medium text-forest tabular-nums">
                    {reflection.overall}
                  </span>
                </div>
                <p className="mt-3 font-display text-[1.1rem] font-medium text-ink">
                  Readiness map
                </p>
              <p className="mt-1 text-[0.85rem] leading-snug text-muted text-pretty">
                {reflection.headline}
              </p>
            </button>
          </div>
        </section>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <button
            onClick={onPhilosophy}
            className="group inline-flex items-center gap-1.5 text-[0.85rem] text-muted transition-colors hover:text-ink"
          >
            <span>
              <span className="font-medium text-ink-soft">Your space, your pace.</span> Why Niyyah
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-gold transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={onRestart}
            className="text-xs text-muted/70 underline-offset-4 transition hover:text-ink hover:underline"
          >
            Start over from the beginning
          </button>
        </div>
      </main>
    </div>
  )
}

function CheckedIn({
  mood,
  history,
  onOpenGuide,
  onOpenDiscovery,
}: {
  mood: MoodId
  history: CheckIn[]
  onOpenGuide: (mode?: ModeId) => void
  onOpenDiscovery: () => void
}) {
  const m = getMood(mood)
  const pattern = checkInReflection(history)
  const strip = weekStrip(history)
  return (
    <div className="animate-rise rounded-card border border-gold/25 bg-gold/[0.07] p-5">
      <div className="flex items-start gap-3.5">
        <span className="text-2xl">{m.emoji}</span>
        <div className="flex-1">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-gold">
            {m.label} · checked in
          </p>
          <p className="mt-1.5 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">{m.ack}</p>
          {pattern && (
            <p className="mt-2 text-[0.92rem] font-medium leading-relaxed text-forest text-pretty">
              {pattern}
            </p>
          )}
          {m.nudge && (
            <button
              onClick={() => (m.nudge!.target === 'guide' ? onOpenGuide() : onOpenDiscovery())}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-[0.85rem] font-medium text-cream transition hover:bg-forest-deep"
            >
              {m.nudge.label}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Your week — history that accumulates. Dots for missed days; no streaks, no guilt. */}
      <div className="mt-4 border-t border-gold/20 pt-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted">
            Your week
          </p>
          <div className="flex items-center gap-2.5">
            {strip.map((d) =>
              d.mood ? (
                <span key={d.key} className="text-[0.95rem] leading-none" title={d.key}>
                  {getMood(d.mood).emoji}
                </span>
              ) : (
                <span key={d.key} className="h-1.5 w-1.5 rounded-full bg-line" title={d.key} />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

