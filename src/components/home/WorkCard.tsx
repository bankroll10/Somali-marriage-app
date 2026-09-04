import { useState } from 'react'
import type { Dimension, Reflection, StepRecord } from '../../types'
import { getMode } from '../../data/coach'
import {
  groundOrder,
  nextStepFor,
  openStep as findOpenStep,
  whenLabel,
} from '../../data/nextStep'
import { todayKey } from '../../data/checkin'
import { ArrowRight, CheckIcon } from '../ui'

interface Props {
  reflection: Reflection
  steps: StepRecord[]
  onTakeStep: (d: Dimension) => void
  onCompleteStep: () => void
  onOpenMap: () => void
  onOpenGuide: (mode?: Parameters<typeof getMode>[0]) => void
}

/**
 * The work — Home's centre of gravity.
 *
 * The map names your thinnest ground; this turns it into a single honest thing
 * to do, and doing it is what eventually moves the map. One at a time, nothing
 * scored, no badge for finishing.
 */
export default function WorkCard({
  reflection,
  steps,
  onTakeStep,
  onCompleteStep,
  onOpenMap,
  onOpenGuide,
}: Props) {
  const today = todayKey()
  const order = groundOrder(reflection.thinnest, steps)
  const carried = findOpenStep(steps)
  // Skipping ("not this one") only moves the offer, so it needs no memory.
  const [skips, setSkips] = useState(0)
  const ground: Dimension = carried?.dimension ?? order[skips % order.length]
  const work = nextStepFor(ground)
  const groundLabel = reflection.dimensions.find((d) => d.dimension === ground)?.label ?? ''
  const finishedToday = steps.find((s) => s.done === today) ?? null

  function swapGround() {
    if (!carried) {
      setSkips((s) => s + 1)
      return
    }
    const i = order.indexOf(carried.dimension)
    onTakeStep(order[(i + 1) % order.length])
  }

  return (
    <section className="animate-rise mt-10">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">Your work</p>
      <div className="relative overflow-hidden rounded-card bg-forest-deep p-7 text-cream">
        <div className="bg-geo pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="relative">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
            {finishedToday ? 'Done today' : 'From your map'} ·{' '}
            {finishedToday
              ? reflection.dimensions.find((d) => d.dimension === finishedToday.dimension)?.label
              : groundLabel}
          </p>

          {finishedToday ? (
            <>
              <p className="mt-3 font-display text-[1.5rem] font-medium leading-snug tracking-tight text-balance">
                {nextStepFor(finishedToday.dimension).done}
              </p>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-cream/70 text-pretty">
                That’s today. One thing at a time — the next one keeps until tomorrow.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-cream/70 text-pretty">
                {carried ? `You took this on ${whenLabel(carried.taken, today)}.` : work.frame}
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
          {/* No "see if the map has moved" here. That line sent her back to
              re-answer the intake after two finished steps, to watch a number
              change — a loop, not a practice. The map is reached when she
              wants it. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 border-t border-cream/10 pt-1.5">
            <button
              onClick={onOpenMap}
              className="py-2.5 text-[0.8rem] text-cream/50 underline-offset-4 transition hover:text-cream/80 hover:underline"
            >
              {steps.some((s) => s.done) ? 'See everything you’ve done' : 'Where this comes from'}
            </button>
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
  )
}
