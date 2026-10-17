import { Button, GeoBackdrop, Logo, ArrowRight } from './ui'
import { SinceLastTime } from './home/FollowUp'
import type { FollowUpAsk, Landed } from '../lib/followup'
import type { FollowUp as FollowUpRecord } from '../types'
import RestoreMap from './RestoreMap'
import { EYEBROW } from '../data/brand'

interface Props {
  /** Not sure which door: the situation question, then the map. */
  onBegin: () => void
  /** An earlier introduction request: new requests are closed, so this only manages one (src/components/Looking.tsx). */
  onLooking: () => void
  /** The tools, for someone already considering a person (src/components/Talking.tsx). */
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


/** The primary action's look: the Button's onDark variant, as a link (src/components/ui.tsx). */
const DEMO_LINK =
  'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.95rem] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 bg-cream text-forest-deep hover:bg-white hover:-translate-y-0.5 shadow-lift focus-visible:ring-offset-forest-deep'

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

          {/* The headline says what Niyyah is for and where it starts. Nothing
              here says introductions work: the demo is fictional and the first
              screen says so once, in the line under its button (docs/DECISIONS.md,
              release R4). It used to say "Think marriage through." (release R3). */}
          <h1 className="animate-rise font-display text-[2.6rem] font-medium leading-[1.06] tracking-tight text-balance sm:text-[3.4rem]">
            Meet with marriage in mind.
          </h1>

          <p
            className="animate-rise mt-5 max-w-lg text-[1.05rem] leading-relaxed text-cream/80 text-pretty"
            style={{ animationDelay: '80ms' }}
          >
            We’re building Niyyah to help Somali singles meet, learn about each other, and decide about
            marriage. Starting with Minneapolis–St. Paul.
          </p>

          {/* The demo is a separate page (/demo/, a second build), so this is a
              plain link: a full load into a bundle that shares nothing with the
              app. For someone who has finished the map, Enter Niyyah is still
              the first thing offered. */}
          <div className="animate-rise mt-8" style={{ animationDelay: '160ms' }}>
            {completed ? (
              <Button variant="onDark" onClick={onEnter} className="group">
                Enter Niyyah
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            ) : (
              <a href="/demo/" className={`group ${DEMO_LINK}`}>
                Explore the demo
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
            {completed ? (
              <p className="mt-4">
                <a
                  href="/demo/"
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-cream/75 underline-offset-4 transition hover:text-cream hover:underline"
                >
                  Explore the demo
                  <ArrowRight className="h-4 w-4" />
                </a>
              </p>
            ) : null}
            <p className="mt-3 max-w-md text-[0.92rem] leading-snug text-cream/70 text-pretty">
              Try the experience with fictional people. Real introductions and messaging aren’t open yet.
            </p>

            {!completed && (
              <>
                {/* The tools, for someone who is already considering a person
                    (docs/DECISIONS.md Parts 22 and 25, then releases R3 and R4):
                    the same handler, now the second door. */}
                <div className="mt-10 max-w-md border-t border-cream/30 pt-6">
                  <h2 className="font-display text-[1.25rem] font-medium leading-snug text-cream">Already considering someone?</h2>
                  <p className="mt-2 text-[0.92rem] leading-snug text-cream/75 text-pretty">
                    Explore tools for the conversations and decisions ahead.
                  </p>
                  <button
                    onClick={onTalking}
                    className="group mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-cream/30 bg-cream/[0.07] px-6 py-2.5 text-[0.95rem] font-medium text-cream transition hover:-translate-y-0.5 hover:bg-cream/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-deep"
                  >
                    Use the tools
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </button>
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
            {/* For anyone who put their name down while requests were open,
                with or without a receipt on this phone, including someone
                who already has a Home. */}
            <button
              onClick={onLooking}
              className="mt-1 inline-flex min-h-11 items-center self-start text-sm font-medium text-cream/75 underline-offset-4 transition hover:text-cream hover:underline"
            >
              Manage an earlier introduction request
            </button>
          </div>

          {/* What is true, once, and no more than the code does. Every tool
              runs with no account and is free. Answers stay on the phone
              unless the person sends something: the eleven to someone, a kept
              map, a message to the live guide (src/components/Trust.tsx and
              docs/PRIVACY.md hold the full list). The old lines here, "No one
              else sees it" and "Private to you", said more than that: the
              eleven is sent to the other person on purpose. Introduction
              requests are closed (release R3), so they are no longer named
              here; Trust still says what an earlier one holds. */}
          <div className="animate-fade mt-8 max-w-md space-y-2.5" style={{ animationDelay: '220ms' }}>
            <p className="text-[0.95rem] leading-relaxed text-cream/75 text-pretty">
              You are not behind, and being here is not an admission of anything.
            </p>
            <p className="text-[0.88rem] leading-relaxed text-cream/65 text-pretty">
              Free, and no account. What you answer stays on your phone unless you choose to send
              something, such as questions for the person you are talking to. Niyyah also counts
              which steps people reach, in one word each and never in your words; you can turn that
              off under Your privacy.
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
