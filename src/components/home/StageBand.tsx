import { useState } from 'react'
import type { Stage } from '../../types'
import { getStage, stages } from '../../data/stages'
import { ArrowRight } from '../ui'

interface Props {
  stage: Stage
  onSetStage: (s: Stage) => void
  /** The instruments for each stage — the band is where the arc becomes doors. */
  onOpenRead?: () => void
  onOpenBeforeYes?: () => void
  onOpenFamilies?: () => void
  onOpenGuide?: () => void
}

/**
 * Where you are in the arc — the product's position made visible: Niyyah
 * follows you past the match instead of ending there. Moving stage is always
 * the member's own call, never inferred from who they've messaged.
 */
export default function StageBand({ stage, onSetStage, onOpenRead, onOpenBeforeYes, onOpenFamilies, onOpenGuide }: Props) {
  const [open, setOpen] = useState(false)
  const st = getStage(stage)

  // What this stage has for her. The stage system used to be a paragraph and a
  // picker; now each stage opens onto the thing built for it.
  const doors: { label: string; go?: () => void }[] =
    stage === 'talking'
      ? [{ label: 'Is he serious?', go: onOpenRead }, { label: 'The words for your family', go: onOpenFamilies }]
      : stage === 'deciding'
        ? [{ label: 'Before you say yes', go: onOpenBeforeYes }, { label: 'The words for your family', go: onOpenFamilies }]
        : stage === 'married'
          ? [{ label: 'Talk to your guide', go: onOpenGuide }]
          : []

  return (
    <section className="animate-rise mt-8">
      <div className="rounded-card border border-line bg-white/60 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
            Where you are · {st.label}
          </p>
          {open ? (
            <button
              onClick={() => setOpen(false)}
              className="text-[0.8rem] font-medium text-muted underline-offset-4 hover:underline"
            >
              Close
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="text-[0.8rem] font-medium text-forest underline-offset-4 hover:underline"
            >
              This changed
            </button>
          )}
        </div>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">{st.focus}</p>
        {!open && doors.some((d) => d.go) && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {doors
              .filter((d) => d.go)
              .map((d) => (
                <button
                  key={d.label}
                  onClick={d.go}
                  className="rounded-full border border-forest/30 bg-forest/[0.06] px-3.5 py-1.5 text-[0.85rem] font-medium text-forest transition-all hover:bg-forest/[0.12]"
                >
                  {d.label}
                </button>
              ))}
          </div>
        )}
        {open && (
          <div className="mt-4 border-t border-line pt-4">
            <p id="stage-picker-label" className="mb-2.5 text-[0.82rem] text-muted">
              Only you decide this — nothing here is assumed from who you’ve messaged.
            </p>
            <div role="group" aria-labelledby="stage-picker-label" className="flex flex-wrap gap-2">
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSetStage(s.id)
                    setOpen(false)
                  }}
                  aria-pressed={s.id === stage}
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
        {!open && st.next && (
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
  )
}
