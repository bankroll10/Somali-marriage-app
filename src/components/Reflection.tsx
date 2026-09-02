import { useEffect, useState } from 'react'
import type { Dimension, Identity, MapSnapshot, ModeId, Reflection, StepRecord, WaitlistState } from '../types'
import { getMode } from '../data/coach'
import { todayKey } from '../data/checkin'
import {
  doneSteps,
  groundOrder,
  nextStepFor,
  openStep as findOpenStep,
  readyToReflect,
  whenLabel,
} from '../data/nextStep'
import Waitlist from './Waitlist'
import { BackButton, Button, Logo, ArrowRight, CheckIcon } from './ui'

const GENERATING_STAGES = [
  'Reading what you shared…',
  'Weighing what matters to you…',
  'Drawing your map…',
]

export function Generating() {
  const [stage, setStage] = useState(0)

  // Step through the stages — the pause should feel like consideration, not a spinner.
  useEffect(() => {
    const t = window.setInterval(
      () => setStage((s) => Math.min(s + 1, GENERATING_STAGES.length - 1)),
      750,
    )
    return () => window.clearInterval(t)
  }, [])

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-forest-deep px-6 text-center text-cream">
      <div className="bg-geo absolute inset-0 opacity-40" aria-hidden />
      <div className="relative">
        <div className="mx-auto mb-8 h-14 w-14">
          <svg viewBox="0 0 64 64" fill="none" className="h-full w-full animate-pulse">
            <path
              d="M32 13c-6.5 8.5-12.5 12.8-12.5 21A12.5 12.5 0 0 0 44.5 34c0-8.2-6-12.5-12.5-21Z"
              stroke="var(--color-gold-soft)"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="35" r="4" fill="var(--color-gold-soft)" />
          </svg>
        </div>
        <p key={stage} className="animate-fade font-display text-2xl font-medium tracking-tight">
          {GENERATING_STAGES[stage]}
        </p>
        <p className="mt-3 text-sm text-cream/60">Taking a moment to consider what you’ve shared.</p>
      </div>
    </div>
  )
}

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function ScoreRing({ value, onDark = false }: { value: number; onDark?: boolean }) {
  const r = 52
  const c = 2 * Math.PI * r
  // Start empty, then sweep to the real value — the map should feel *drawn*.
  const [shown, setShown] = useState(0)
  // The number counts up in step with the sweep, so the reveal reads as one motion.
  const [num, setNum] = useState(0)
  useEffect(() => {
    if (reducedMotion()) {
      setShown(value)
      setNum(value)
      return
    }
    const t = window.setTimeout(() => setShown(value), 150)
    const start = performance.now() + 150
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(Math.max((now - start) / 1100, 0), 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setNum(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      window.clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [value])
  const offset = c - (shown / 100) * c
  return (
    <div className="relative h-32 w-32 flex-none">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={onDark ? 'var(--color-cream)' : 'var(--color-sand)'}
          strokeOpacity={onDark ? 0.16 : 1}
          strokeWidth="9"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={onDark ? 'var(--color-gold-soft)' : 'var(--color-gold)'}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-display text-3xl font-medium tabular-nums ${onDark ? 'text-cream' : 'text-forest'}`}
        >
          {num}
        </span>
        <span
          className={`text-[0.65rem] uppercase tracking-[0.18em] ${onDark ? 'text-cream/60' : 'text-muted'}`}
        >
          readiness
        </span>
      </div>
    </div>
  )
}

/** Dimension bar that fills from zero, staggered — the map draws itself. */
function DimensionBar({ score, delay }: { score: number; delay: number }) {
  const [width, setWidth] = useState(reducedMotion() ? score : 0)
  useEffect(() => {
    const t = window.setTimeout(() => setWidth(score), 150)
    return () => window.clearTimeout(t)
  }, [score])
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
      <div
        className="h-full rounded-full bg-forest"
        style={{
          width: `${width}%`,
          transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        }}
      />
    </div>
  )
}

/**
 * How far they've come since the first reading. Returns null until there are at
 * least two — growth needs a before.
 */
function growth(history: MapSnapshot[]) {
  if (history.length < 2) return null
  const first = history[0]
  const latest = history[history.length - 1]
  const days = Math.max(
    0,
    Math.round(
      (new Date(`${latest.date}T00:00:00`).getTime() -
        new Date(`${first.date}T00:00:00`).getTime()) /
        86_400_000,
    ),
  )
  const delta = latest.overall - first.overall
  const when = days === 0 ? 'earlier today' : days === 1 ? 'yesterday' : `${days} days ago`
  return { first, latest, delta, when, changed: first.headline !== latest.headline }
}

interface Props {
  reflection: Reflection
  identity: Identity
  /** Every reading so far, oldest first — powers the growth line. */
  history: MapSnapshot[]
  /** Work taken on from this map — open and finished. */
  steps: StepRecord[]
  onTakeStep: (d: Dimension) => void
  onCompleteStep: () => void
  /** Their saved place — asked right after the dimension bars, until they join. */
  waitlist: WaitlistState | null
  /** Their "hardest part" answer, carried onto the signup. */
  hookId?: string
  onJoinWaitlist: (s: WaitlistState) => void
  /** First-time reveal shows an "enter" CTA; revisits show "back". */
  firstReveal?: boolean
  onContinue: () => void
  /** Reflect again — keeps the journey, records a new reading. */
  onRetake: () => void
  /** Hand a topic to the guide, in the voice suited to it. */
  onOpenGuide: (mode: ModeId) => void
}

export default function ReflectionView({
  reflection: r,
  identity,
  history,
  steps,
  onTakeStep,
  onCompleteStep,
  waitlist,
  hookId,
  onJoinWaitlist,
  firstReveal = false,
  onContinue,
  onRetake,
  onOpenGuide,
}: Props) {
  const name = identity.firstName?.trim()
  const g = growth(history)
  const today = todayKey()
  // The ground to work next: thinnest first, but skipping what's already been
  // worked — so the map keeps handing over something new.
  const carried = findOpenStep(steps)
  const ground = carried?.dimension ?? groundOrder(r.dimensions, steps)[0]
  const groundLabel = r.dimensions.find((d) => d.dimension === ground)?.label ?? ''
  const step = nextStepFor(ground)
  const finished = doneSteps(steps)
  const finishedToday = steps.find((s) => s.done === today) ?? null
  const sinceReading = readyToReflect(steps, history[history.length - 1]?.date, today)
  return (
    <div className="min-h-dvh bg-cream pb-24">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          {firstReveal ? (
            <Logo className="text-ink" />
          ) : (
            <BackButton onClick={onContinue} label="Back to your space" />
          )}
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Readiness map</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        {/* Hero reading — the one screenshot that sells the product: brand,
            person, verdict, and the promise that ties readiness to matching. */}
        <section className="animate-rise relative mt-8 overflow-hidden rounded-card bg-forest-deep p-7 text-cream sm:p-9">
          <div className="bg-geo pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className="relative flex flex-col items-start gap-7 sm:flex-row sm:items-center">
            <ScoreRing value={r.overall} onDark />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-soft">
                {name ? `${name} · your marriage-readiness map` : 'Your marriage-readiness map'}
              </p>
              <h1 className="mt-2 font-display text-[2.1rem] font-medium leading-tight tracking-tight text-balance sm:text-[2.5rem]">
                {r.headline}
              </h1>
              {/* The first time, a number attached to the words "marriage
                  readiness" can read as a verdict on her as a person — which is
                  exactly the fear that made her open this. Say what it isn't,
                  before she has time to decide for herself. Afterwards the line
                  goes back to explaining what the map is for. */}
              <p className="mt-3 max-w-md text-[0.92rem] leading-relaxed text-cream/70 text-pretty">
                {firstReveal
                  ? 'A starting point, not a verdict — and not a measure of you as a person. It moves as you do, and no one sees it but you.'
                  : 'Readiness first, profiles later — that’s how Niyyah chooses who you meet. No one sees this map but you.'}
              </p>
            </div>
          </div>

          {/* How far they've come. Only appears once there's a real before —
              the number moves, but the identity shift is the point. */}
          {g && (
            <div className="relative mt-7 border-t border-cream/15 pt-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
                Since your first reflection · {g.when}
              </p>
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-[1.15rem] font-medium leading-snug text-cream/90 text-pretty">
                  {g.changed ? (
                    <>
                      <span className="text-cream/50">{g.first.headline}</span>
                      <span className="mx-2 text-cream/40">→</span>
                      {g.latest.headline}
                    </>
                  ) : (
                    <>Still {g.latest.headline.toLowerCase()} — and steadier for it.</>
                  )}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.75rem] font-semibold tabular-nums ${
                    g.delta > 0
                      ? 'bg-gold-soft/20 text-gold-soft'
                      : 'bg-cream/10 text-cream/60'
                  }`}
                >
                  {g.delta > 0 ? `+${g.delta}` : g.delta < 0 ? g.delta : 'steady'}
                </span>
              </div>
              {g.delta < 0 && (
                <p className="mt-2 text-[0.85rem] leading-relaxed text-cream/60 text-pretty">
                  A lower reading isn’t a step back — it usually means you answered
                  more honestly. That’s worth more than a high score.
                </p>
              )}
            </div>
          )}
        </section>

        <p className="animate-fade mb-12 mt-8 text-[1.08rem] leading-relaxed text-ink-soft text-pretty">
          {r.summary}
        </p>

        {/* Dimensions */}
        <Section title="Across the things that matter">
          <div className="space-y-5">
            {r.dimensions.map((d, i) => (
              <div key={d.dimension} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[1.05rem] font-medium text-ink">{d.label}</span>
                  <span className="text-sm tabular-nums text-muted">{d.score}</span>
                </div>
                <DimensionBar score={d.score} delay={i * 90} />
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted text-pretty">{d.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* The ask, right where the map has just said something specific about
            her — before the long tail of sections she may never scroll to.
            Shown on every map view, not only first reveal, so skipping it once
            doesn't mean never seeing it again. Waitlist itself switches from
            the form to a quiet "you're counted" confirmation once joined (same
            pattern as Profile) — the confirmation has to render right here, on
            submit, or she gets no feedback that anything happened. Skippable —
            everything below works whether or not she joins. */}
        <section className="mb-12">
          <Waitlist
            identity={identity}
            overall={r.overall}
            hookId={hookId}
            joined={waitlist}
            onJoined={onJoinWaitlist}
          />
        </section>

        {/* Diagnosis → practice. A map that names your thinnest ground and stops
            there leaves you as anxious as you arrived: one honest, doable thing,
            taken on, done, and kept as a record. This is the working half of the
            map — the reason it's an instrument and not a verdict. */}
        <Section title="Where to put your effort">
          <div className="rounded-card border border-gold/30 bg-gold/[0.07] p-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
              {finishedToday
                ? `Done today · ${r.dimensions.find((d) => d.dimension === finishedToday.dimension)?.label}`
                : groundLabel}
            </p>

            {finishedToday ? (
              <p className="mt-3 font-display text-[1.3rem] font-medium leading-snug tracking-tight text-ink text-pretty">
                {nextStepFor(finishedToday.dimension).done}
              </p>
            ) : (
              <>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted text-pretty">
                  {carried ? `You took this on ${whenLabel(carried.taken, today)}.` : step.frame}
                </p>
                <p className="mt-4 font-display text-[1.3rem] font-medium leading-snug tracking-tight text-ink text-pretty">
                  {step.action}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <button
                    onClick={() => (carried ? onCompleteStep() : onTakeStep(ground))}
                    className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-medium text-cream transition hover:bg-forest-deep"
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
                    onClick={() => onOpenGuide(step.mode)}
                    className="group inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-forest transition hover:text-forest-deep"
                  >
                    Talk it through with {getMode(step.mode).label}
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </>
            )}

            <p className="mt-4 border-t border-gold/20 pt-3.5 text-[0.8rem] leading-relaxed text-muted text-pretty">
              Doing this doesn’t move your number — nothing here is scored. It
              changes your answers, and your answers are the map.
            </p>
          </div>
        </Section>

        {/* What you've done. Private, undated by any streak, and the only proof
            of change the app offers that isn't a number. */}
        {finished.length > 0 && (
          <Section title="What you’ve done">
            <ul className="space-y-3">
              {finished.slice(0, 6).map((s, i) => (
                <li
                  key={`${s.dimension}-${s.done}-${i}`}
                  className="flex items-start gap-3.5 rounded-2xl border border-line bg-white/60 px-5 py-4"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-forest/10 text-forest">
                    <CheckIcon size={11} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[0.95rem] leading-snug text-ink-soft text-pretty">
                      {nextStepFor(s.dimension).done}
                    </span>
                    <span className="mt-1 block text-[0.78rem] uppercase tracking-[0.12em] text-muted">
                      {r.dimensions.find((d) => d.dimension === s.dimension)?.label} ·{' '}
                      {whenLabel(s.done!, today)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {finished.length > 6 && (
              <p className="mt-3 text-[0.82rem] text-muted">
                And {finished.length - 6} more before these.
              </p>
            )}
            {sinceReading > 0 && (
              <div className="mt-5 rounded-card bg-forest p-6 text-cream">
                <p className="font-display text-[1.25rem] font-medium leading-snug tracking-tight text-balance">
                  {sinceReading} things done since this reading.
                </p>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-cream/75 text-pretty">
                  You’ve changed something real since you last answered. Answer
                  again and the map will say so — or it won’t, which is worth
                  knowing too.
                </p>
                <button
                  onClick={onRetake}
                  className="group mt-4 inline-flex items-center gap-1.5 rounded-full bg-cream px-5 py-2.5 text-[0.88rem] font-semibold text-forest-deep transition hover:bg-white"
                >
                  Reflect again
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </Section>
        )}

        {/* Core values */}
        {r.coreValues.length > 0 && (
          <Section title="What you carry">
            <div className="flex flex-wrap gap-2.5">
              {r.coreValues.map((v) => (
                <span
                  key={v}
                  className="rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-[0.9rem] font-medium text-forest"
                >
                  {v}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Non-negotiables */}
        {r.nonNegotiables.length > 0 && (
          <Section title="Your non-negotiables">
            <ul className="space-y-2.5">
              {r.nonNegotiables.map((n) => (
                <li key={n} className="flex items-start gap-3 text-[1rem] text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.9rem] italic leading-relaxed text-muted">
              These are not too much to ask. They are how you protect your time and your heart.
            </p>
          </Section>
        )}

        {/* Honest mirror */}
        <Section title="The honest mirror">
          <div className="rounded-card border border-line bg-white/60 p-6">
            <p className="text-[1.02rem] leading-relaxed text-ink-soft text-pretty">{r.growthNote}</p>
          </div>
        </Section>

        {/* Alignment */}
        <Section title="What alignment looks like for you">
          <div className="rounded-card bg-forest p-6 text-cream">
            <p className="text-[1.05rem] leading-relaxed text-cream/90 text-pretty">{r.alignment}</p>
          </div>
        </Section>

        {/* Next: into your space — light card; the dark hero lives at the top now. */}
        <section className="mt-14 rounded-card border border-line bg-white/60 p-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
            {firstReveal ? 'Now you’re not doing this alone' : 'Your space'}
          </p>
          <p className="mt-3 font-display text-[1.6rem] font-medium leading-snug tracking-tight text-ink text-balance">
            {firstReveal ? 'This is your foundation.' : 'Back to your space'}
          </p>
          <p className="mx-auto mt-3 max-w-md text-[0.98rem] leading-relaxed text-ink-soft text-pretty">
            From here your map quietly powers everything — a guide for the real
            moments, protections you control, and introductions chosen by how
            your lives fit.
          </p>
          <div className="mt-7">
            <Button onClick={onContinue} className="group">
              {firstReveal ? 'Enter your space' : 'Back to your space'}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          {/* Offered on revisits only — never straight after a fresh reading. */}
          {!firstReveal && (
            <button
              onClick={onRetake}
              className="mt-5 text-[0.85rem] font-medium text-forest underline-offset-4 transition hover:underline"
            >
              Hearts change — reflect again
            </button>
          )}
        </section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted">{title}</h2>
      {children}
    </section>
  )
}
