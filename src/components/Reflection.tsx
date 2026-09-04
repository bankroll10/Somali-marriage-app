import { useEffect, useState } from 'react'
import type { Dimension, GroundState, Identity, MapSnapshot, ModeId, Reflection, StepRecord, WaitlistState, VouchState } from '../types'
import { getMode } from '../data/coach'
import { todayKey } from '../lib/dates'
import { changesBetween } from '../lib/reflection'
import {
  doneSteps,
  groundOrder,
  nextStepFor,
  openStep as findOpenStep,
  whenLabel,
} from '../data/nextStep'
import Cohort from './Cohort'
import VouchRow from './VouchRow'
import KeepMap from './KeepMap'
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

/**
 * Where she stands on a ground, in a word.
 *
 * This is where a bar used to fill from zero to a number. The read shows the
 * same three states for him and refuses a number on a person; the map now
 * refuses one on her.
 */
const STATE_LABEL: Record<GroundState, string> = { thin: 'Thin', steady: 'Steady', strong: 'Strong' }
const STATE_CLASS: Record<GroundState, string> = {
  thin: 'border-clay/40 bg-clay/[0.08] text-clay',
  steady: 'border-line bg-sand/60 text-ink-soft',
  strong: 'border-forest/30 bg-forest/[0.08] text-forest',
}

function StateTag({ state }: { state: GroundState }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] ${STATE_CLASS[state]}`}>
      {STATE_LABEL[state]}
    </span>
  )
}

/** "3 days ago" for the previous reading — the only date arithmetic the map needs. */
function agoLabel(fromDate: string, toDate: string): string {
  const days = Math.max(
    0,
    Math.round((new Date(`${toDate}T00:00:00`).getTime() - new Date(`${fromDate}T00:00:00`).getTime()) / 86_400_000),
  )
  return days === 0 ? 'earlier today' : days === 1 ? 'yesterday' : `${days} days ago`
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
  /** Guide voices she has used — goes with her place in the cohort. */
  voices?: string[]
  ledger?: string[]
  onScene?: (scene: string) => void
  /** Their "hardest part" answer, carried onto the signup. */
  hookId?: string
  onJoinWaitlist: (s: WaitlistState) => void
  /** A family member's vouch, once given — see components/VouchRow.tsx. */
  vouch: VouchState | null
  onKept: (code: string) => void
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
  voices,
  ledger,
  onScene,
  hookId,
  onJoinWaitlist,
  vouch,
  onKept,
  firstReveal = false,
  onContinue,
  onRetake,
  onOpenGuide,
}: Props) {
  const name = identity.firstName?.trim()
  const today = todayKey()
  // What changed since the previous reading — answers, in her own words, and
  // any ground that moved. Nothing to show until there is a before.
  const latest = history[history.length - 1]
  const previous = history.length >= 2 ? history[history.length - 2] : undefined
  const changes = latest ? changesBetween(previous, latest) : { answers: [], grounds: [] }
  const hasChanges = changes.answers.length > 0 || changes.grounds.length > 0
  const thinLabel = r.dimensions.find((d) => d.dimension === r.thinnest[0])?.label.toLowerCase() ?? ''
  const strongLabels = r.dimensions.filter((d) => d.state === 'strong').map((d) => d.label.toLowerCase())
  // The ground to work next: thinnest first, but skipping what's already been
  // worked — so the map keeps handing over something new.
  const carried = findOpenStep(steps)
  const ground = carried?.dimension ?? groundOrder(r.thinnest, steps)[0]
  const groundLabel = r.dimensions.find((d) => d.dimension === ground)?.label ?? ''
  const step = nextStepFor(ground)
  const finished = doneSteps(steps)
  const finishedToday = steps.find((s) => s.done === today) ?? null
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
        {/* The reading. There used to be a ring here counting up to a number,
            and a gold "+7" badge on the next visit. Both are gone: a score on
            readiness was an answer key that penalised honesty, and a delta was
            a reason to re-answer. What is here is the verdict in words and,
            on a return, exactly what changed. */}
        <section className="animate-rise relative mt-8 overflow-hidden rounded-card bg-forest-deep p-7 text-cream sm:p-9">
          <div className="bg-geo pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-soft">
              {name ? `${name} · your map` : 'Your map'}
            </p>
            <h1 className="mt-2 font-display text-[2.1rem] font-medium leading-tight tracking-tight text-balance sm:text-[2.5rem]">
              {r.headline}
            </h1>
            <p className="mt-3 max-w-lg text-[1rem] leading-relaxed text-cream/85 text-pretty">
              {strongLabels.length > 0
                ? `Strong on ${strongLabels.slice(0, 3).join(', ')}. Thinnest on ${thinLabel}.`
                : `Steady across most of it. Thinnest on ${thinLabel}.`}
            </p>
            <p className="mt-3 max-w-md text-[0.92rem] leading-relaxed text-cream/60 text-pretty">
              {firstReveal
                ? 'A starting point, not a verdict — and not a measure of you as a person. No one sees this but you.'
                : 'What decides who you meet is what you’ve done here and what you won’t compromise on — never this reading. No one sees it but you.'}
            </p>
          </div>

          {/* What changed since last time. Only when there is a before, and
              only what actually moved — her words then and now. */}
          {previous && latest && (
            <div className="relative mt-7 border-t border-cream/15 pt-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
                Since your last reading · {agoLabel(previous.date, latest.date)}
              </p>
              {!hasChanges ? (
                <p className="mt-2.5 text-[1rem] leading-snug text-cream/85 text-pretty">
                  You answered the same way. That is not nothing — it means the ground has held.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {changes.grounds.map((c) => (
                    <li key={c.label} className="text-[0.95rem] leading-snug text-cream/85 text-pretty">
                      <span className="font-medium text-cream">{c.label}</span> was {STATE_LABEL[c.then].toLowerCase()}. It reads{' '}
                      {STATE_LABEL[c.now].toLowerCase()} now.
                    </li>
                  ))}
                  {changes.answers.slice(0, 4).map((c) => (
                    <li key={c.prompt} className="text-[0.92rem] leading-snug text-cream/80 text-pretty">
                      <span className="block text-[0.72rem] uppercase tracking-[0.12em] text-cream/50">{c.prompt}</span>
                      <span className="text-cream/60">Then: {c.then}.</span> <span className="text-cream">Now: {c.now}.</span>
                    </li>
                  ))}
                </ul>
              )}
              {previous.headline !== latest.headline && (
                <p className="mt-3 text-[0.85rem] leading-relaxed text-cream/60 text-pretty">
                  Last time this read “{previous.headline}”. A different reading is not a step up or down — it is
                  a different set of answers, and honesty counts for more than either.
                </p>
              )}
            </div>
          )}
        </section>

        <p className="animate-fade mb-12 mt-8 text-[1.08rem] leading-relaxed text-ink-soft text-pretty">
          {r.summary}
        </p>

        {/* The seven grounds. A word each — never a bar, never a number. */}
        <Section title="Across the things that matter">
          <div className="space-y-5">
            {r.dimensions.map((d, i) => (
              <div key={d.dimension} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-[1.05rem] font-medium text-ink">{d.label}</span>
                  <StateTag state={d.state} />
                </div>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted text-pretty">{d.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* The ask, right where the map has just said something specific about
            her — before the long tail of sections she may never scroll to.
            Shown on every map view, not only first reveal, so skipping it once
            doesn't mean never seeing it again. The card switches from the form
            to a "you're counted" confirmation on submit, right here, so she
            sees that something happened. Skippable — everything below works
            whether or not she joins. */}
        <section className="mb-12">
          <Cohort
            identity={identity}
            hookId={hookId}
            voices={voices}
            ledger={ledger}
            joined={waitlist}
            onJoined={onJoinWaitlist}
            onScene={onScene}
          />
          {/* The one verification we claim, offered where she has just finished
              something and can see why it would matter. It used to live only on
              a profile screen she may never open. */}
          <VouchRow vouch={vouch} onKept={onKept} />
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
              Nothing here is scored. Doing this changes your answers, and your
              answers are the map.
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

        {/* Everything above exists only in this browser. Said here, after she has
            read it, because that is the moment losing it would actually cost
            something. Joining the cohort already keeps the map, so the card
            steps aside once she's counted. */}
        {!waitlist && (
          <section className="mb-12">
            <KeepMap />
          </section>
        )}

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
            moments, the work you take on, and, when your city opens,
            introductions chosen by how your lives fit and what you won’t
            compromise on.
          </p>
          <div className="mt-7">
            <Button onClick={onContinue} className="group">
              {firstReveal ? 'Enter your space' : 'Back to your space'}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          {/* Offered on revisits only, and never nudged: a retake is hers to
              want when something in her life has changed, not something the
              app asks for after a count of finished steps. */}
          {!firstReveal && (
            <button
              onClick={onRetake}
              className="mt-5 text-[0.85rem] font-medium text-forest underline-offset-4 transition hover:underline"
            >
              Something changed — answer again
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
