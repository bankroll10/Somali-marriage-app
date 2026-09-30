import { Button, GeoBackdrop, Logo, ArrowRight } from './ui'
import { SinceLastTime } from './home/FollowUp'
import type { FollowUpAsk, Landed } from '../lib/followup'
import type { FollowUp as FollowUpRecord } from '../types'
import RestoreMap from './RestoreMap'
import { EYEBROW } from '../data/brand'

interface Props {
  /** Not sure which door: the situation question, then the map. */
  onBegin: () => void
  /** The first door: not talking to anyone, and wants to be introduced (src/components/Looking.tsx). */
  onLooking: () => void
  /** The second door: already talking to someone (src/components/Talking.tsx). */
  onTalking: () => void
  hasProgress: boolean
  completed: boolean
  onResume: () => void
  onEnter: () => void
  /**
   * A conversation someone was handed words for, days ago, with no Home to be
   * asked about it on — a stranger who took the family words, say. Asked here,
   * where they land, instead of never (docs/PRODUCT.md).
   */
  followUpAsk?: FollowUpAsk | null
  onAnswerFollowUp?: (id: string, outcome: NonNullable<FollowUpRecord['outcome']>, landed?: Landed, putAway?: boolean) => void
  onAskGuide?: (text: string) => void
}


export default function Welcome({
  onBegin,
  onLooking,
  onTalking,
  hasProgress,
  completed,
  onResume,
  onEnter,
  followUpAsk = null,
  onAnswerFollowUp,
  onAskGuide,
}: Props) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-forest-deep text-cream">
      <GeoBackdrop className="opacity-70" />

      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-6 pb-12 pt-safe-8">
        <header className="flex items-center justify-between">
          <Logo mono className="text-cream" />
          <span className="text-xs uppercase tracking-[0.2em] text-cream/50">نية</span>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          {onAnswerFollowUp && (
            <SinceLastTime
              ask={followUpAsk}
              onAnswer={onAnswerFollowUp}
              onAskGuide={(text) => onAskGuide?.(text)}
              wrap="-mt-8 mb-10 rounded-card bg-cream px-4 pb-4 text-ink"
            />
          )}
          <p className="animate-fade mb-5 text-sm font-medium uppercase tracking-[0.25em] text-gold-soft">
            {EYEBROW}
          </p>

          {/* The headline says what the product is for, in a sentence a
              first-time visitor can repeat: serious introductions, and
              thinking a marriage through. It used to ask "What's in your
              way?", which described neither door (docs/DECISIONS.md Part 25). */}
          <h1 className="animate-rise font-display text-[2.6rem] font-medium leading-[1.06] tracking-tight text-balance sm:text-[3.4rem]">
            Meet someone serious. Think marriage through.
          </h1>

          <p
            className="animate-rise mt-5 max-w-lg text-[1.05rem] leading-relaxed text-cream/80 text-pretty"
            style={{ animationDelay: '80ms' }}
          >
            Niyyah runs a founder-led introduction pilot, and offers tools for people already
            considering someone for marriage.
          </p>

          {/* The two doors (docs/DECISIONS.md Parts 22 and 25): the two
              situations in a person's own words, each card ending in what
              the tap does. The map's path is the quieter line under them. */}
          <div className="animate-rise mt-8" style={{ animationDelay: '160ms' }}>
            {completed ? (
              <Button variant="onDark" onClick={onEnter} className="group">
                Enter Niyyah
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        eyebrow: 'Introductions',
                        title: 'I’m looking for someone serious.',
                        desc: 'Put your name down for an introduction made by hand. The founder speaks with you first. Beginning in Minneapolis–St. Paul.',
                        action: 'See how introductions work',
                        go: onLooking,
                      },
                      {
                        eyebrow: 'Tools',
                        title: 'I’m already talking to someone.',
                        desc: 'Understand what they have shown you, talk through the big questions before the families do, and find the words for them.',
                        action: 'Choose where to start',
                        go: onTalking,
                      },
                    ] as { eyebrow: string; title: string; desc: string; action: string; go: () => void }[]
                  ).map((door) => (
                    <button
                      key={door.title}
                      onClick={door.go}
                      className="group flex w-full flex-col items-start rounded-card border border-cream/30 bg-cream/[0.07] p-5 text-left transition hover:-translate-y-0.5 hover:bg-cream/[0.14]"
                    >
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-gold-soft">{door.eyebrow}</span>
                      <span className="mt-2 font-display text-[1.25rem] font-medium leading-snug text-cream text-balance">{door.title}</span>
                      <span className="mt-2 text-[0.92rem] leading-snug text-cream/75 text-pretty">{door.desc}</span>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[0.92rem] font-medium text-gold-soft">
                        {door.action}
                        <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-5">
                  <button
                    onClick={onBegin}
                    className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-cream/75 underline-offset-4 transition hover:text-cream hover:underline"
                  >
                    Not sure? Start where you are
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {hasProgress && (
                    <button
                      onClick={onResume}
                      className="inline-flex min-h-11 items-center self-start text-sm font-medium text-cream/75 underline-offset-4 transition hover:text-cream hover:underline"
                    >
                      Pick up where you left off
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* What is true, once, and no more than the code does. Every tool
              runs with no account and is free. Answers stay on the phone
              unless the person sends something: a name for an introduction
              (read by the founder), the eleven to someone, a kept map, a
              message to the live guide (src/components/Trust.tsx and
              docs/PRIVACY.md hold the full list). The old lines here, "No one
              else sees it" and "Private to you", said more than that: the
              eleven is sent to the other person on purpose, and an introduction
              request is read by the founder. */}
          <div className="animate-fade mt-8 max-w-md space-y-2.5" style={{ animationDelay: '220ms' }}>
            <p className="text-[0.95rem] leading-relaxed text-cream/75 text-pretty">
              You are not behind, and being here is not an admission of anything.
            </p>
            <p className="text-[0.88rem] leading-relaxed text-cream/65 text-pretty">
              Free, and no account. What you answer stays on your phone unless you choose to send
              something, such as your name for an introduction, which the founder reads, or questions
              for the person you are talking to.
            </p>
          </div>
          {/* Quiet on purpose: someone arriving for the first time should meet
              the question this app exists to answer, not a login. */}
          <RestoreMap />
        </main>

      </div>
    </div>
  )
}
