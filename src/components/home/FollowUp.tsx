import { useState } from 'react'
import type { FollowUp as FollowUpRecord } from '../../types'
import type { FollowUpAsk } from '../../lib/followup'
import ScriptCard from '../ScriptCard'
import { ArrowRight } from '../ui'

interface Props {
  ask: FollowUpAsk
  onAnswer: (id: string, outcome: NonNullable<FollowUpRecord['outcome']>, agreed?: boolean) => void
  onAskGuide: (text: string) => void
}

/**
 * "Have you had it?"
 *
 * The one place this product asks about her life rather than about itself. It
 * is not a reminder and not a streak: it comes days after we handed her the
 * words, it asks once, and every answer closes it — "not yet" as fully as
 * "we talked". Nothing here congratulates her and nothing counts.
 */
export default function FollowUp({ ask, onAnswer, onAskGuide }: Props) {
  const [phase, setPhase] = useState<'asking' | 'howd-it-go' | 'the-words'>('asking')
  const id = ask.followUp.id

  return (
    <section className="animate-rise mt-8">
      <div className="rounded-card border border-gold/30 bg-gold/[0.07] p-5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
          Since last time
        </p>
        <p className="mt-2 font-display text-[1.15rem] font-medium leading-snug text-ink text-pretty">
          {ask.question}
        </p>

        {phase === 'asking' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => (ask.writesBack ? setPhase('howd-it-go') : onAnswer(id, 'asked'))}
              className="rounded-full border border-forest bg-forest px-4 py-2 text-[0.85rem] font-medium text-cream transition-all hover:bg-forest-deep"
            >
              We talked about it
            </button>
            <button
              onClick={() => setPhase('the-words')}
              className="rounded-full border border-line bg-white/60 px-4 py-2 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40"
            >
              Not yet
            </button>
            <button
              onClick={() => {
                onAnswer(id, 'differently')
                onAskGuide(`I was going to talk to him about ${ask.label}, and it went differently.`)
              }}
              className="rounded-full border border-line bg-white/60 px-4 py-2 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40"
            >
              It went differently
            </button>
          </div>
        )}

        {phase === 'howd-it-go' && (
          <div className="mt-4">
            <p className="text-[0.9rem] leading-snug text-ink-soft text-pretty">
              And where did the two of you land?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onAnswer(id, 'asked', true)}
                className="rounded-full border border-forest bg-forest px-4 py-2 text-[0.85rem] font-medium text-cream transition-all hover:bg-forest-deep"
              >
                We agree
              </button>
              <button
                onClick={() => onAnswer(id, 'asked', false)}
                className="rounded-full border border-line bg-white/60 px-4 py-2 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40"
              >
                We don’t agree
              </button>
            </div>
            <p className="mt-3 text-[0.82rem] leading-snug text-muted text-pretty">
              Either way it goes into your sheet, so the list stays true to where you
              actually are.
            </p>
          </div>
        )}

        {phase === 'the-words' && (
          <div className="mt-1">
            <p className="mt-3 text-[0.9rem] leading-snug text-ink-soft text-pretty">
              Then here they are again. There’s no hurry in this — the words keep.
            </p>
            <ScriptCard script={ask.script} title="The words, again" source="followup" travel={ask.travel} />
            <button
              onClick={() => onAnswer(id, 'not-yet')}
              className="group mt-5 inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-forest underline-offset-4 hover:underline"
            >
              Put it away for now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
