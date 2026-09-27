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

          {/* The hook keeps the shape of a question you can't answer about
              yourself — but points it at the obstacle, not at her.
              "Are you actually ready?" is clickable because it pokes the fear
              this person already carries: that she might be the reason none of
              this has worked. Asking what's in her way keeps every bit of the
              curiosity and assumes she is fine, which is both kinder and closer
              to what the map actually returns. */}
          <h1 className="animate-rise font-display text-[2.9rem] font-medium leading-[1.04] tracking-tight text-balance sm:text-[3.6rem]">
            What’s in your way?
          </h1>

          <p
            className="animate-rise mt-6 max-w-lg text-[1.05rem] leading-relaxed text-cream/75 text-pretty"
            style={{ animationDelay: '80ms' }}
          >
            Two doors. If you are looking for someone serious, put your name down for an
            introduction made by hand. If you are already talking to someone, a read on what
            they have shown you, the eleven conversations to have before the families do, and
            the words for the families.
          </p>

          {/* The two doors (docs/DECISIONS.md Part 22). Until 2026-09-27 the
              first button was "Start where you are", which led to a question
              about her situation and then the map, and the only other way in
              was the read. Someone who was looking for someone had no door at
              all — the one the two women who signed up had walked through was
              deleted on 2026-09-24. Now the two situations are the two
              buttons, in the words a person would use, and the map's path is
              the quieter line under them. */}
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
                        eyebrow: 'Looking for someone',
                        title: 'I’m looking for someone serious.',
                        desc: 'Put your name down for an introduction, made by hand.',
                        go: onLooking,
                      },
                      {
                        eyebrow: 'Already talking to someone',
                        title: 'I’m already talking to someone.',
                        desc: 'A read on what they have shown you, the eleven conversations, the words for the families.',
                        go: onTalking,
                      },
                    ] as { eyebrow: string; title: string; desc: string; go: () => void }[]
                  ).map((door) => (
                    <button
                      key={door.title}
                      onClick={door.go}
                      className="group flex w-full flex-col items-start rounded-card border border-cream/30 bg-cream/[0.07] p-5 text-left transition hover:-translate-y-0.5 hover:bg-cream/[0.14]"
                    >
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">{door.eyebrow}</span>
                      <span className="mt-2 font-display text-[1.2rem] font-medium leading-snug text-cream text-balance">{door.title}</span>
                      <span className="mt-1.5 text-[0.88rem] leading-snug text-cream/65 text-pretty">{door.desc}</span>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-cream">
                        Go
                        <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                  <button
                    onClick={onBegin}
                    className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-cream/70 underline-offset-4 transition hover:text-cream hover:underline"
                  >
                    Not sure? Start where you are
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {hasProgress && (
                    <button
                      onClick={onResume}
                      className="self-start text-sm font-medium text-cream/70 underline-offset-4 transition hover:text-cream hover:underline"
                    >
                      Pick up where you left off
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* The lead used to promise the map — "thirteen questions, about two
              minutes… the one place you're thinnest" — while the flow behind the
              button routes by stage and only the person not talking to anyone
              ever reaches the map first. The comments below this file already
              said the map "ranks near the bottom of what actually hurts"; the
              first sentence on the page was still selling it. Now the promise
              matches the routing, and the read — the one thing aimed at the
              highest-pain problem we can solve today — is in the first breath
              rather than a card at the bottom. docs/PRODUCT.md.

              What is withheld is the real thing. This used to be a ring with
              "??" in it and "Your number is two minutes away" — a quiz-funnel
              hook that promised a score, and then the map had to deliver one.
              Then it promised "the one place you're thinnest", which is the
              map's object alone; a woman routed to the read never reaches it.
              Every instrument here ends in the same kind of thing — the one
              question to ask him, the one conversation to open, the one honest
              thing to do — so that is what is promised. */}
          <div
            className="animate-rise mt-8 max-w-md border-l-2 border-gold-soft/60 pl-4"
            style={{ animationDelay: '120ms' }}
          >
            <p className="font-display text-[1.15rem] font-medium leading-snug tracking-tight text-cream text-balance">
              The one thing to say next is two minutes away.
            </p>
            <p className="mt-1 text-[0.88rem] leading-snug text-cream/55 text-pretty">
              In words, not a score. No one else sees it — not your family, not anyone you’re talking to.
            </p>
          </div>

          {/* The objection that stops her tapping isn't "is this any good" — it's
              "does opening this mean something failed?" Answered once, plainly,
              before the button. No drama, no reassurance the product can't back:
              the last sentence is simply true, and it explains why she doesn't
              already know the answer. */}
          <p
            className="animate-fade mt-7 max-w-md text-[0.95rem] leading-relaxed text-cream/65 text-pretty"
            style={{ animationDelay: '200ms' }}
          >
            You are not behind, and being here is not an admission of anything.
            Not knowing yet is where these questions start.
          </p>

          {/* What kind of thing this is.
              These three lines used to be written against a dating app — built
              by a Somali, stage-first, the conversations that break marriages —
              and every competitor in this category can say the first and third
              (docs/PRODUCT.md). What none of them does is what these
              say now: work on the relationship she already has, put the same
              questions to him on his own phone, and come back to ask whether
              the conversation happened. The test is Situation.tsx's: a sentence
              no alternative in the category would think to say.
              Three lines, and it stays three. The moment this becomes a feature
              list it has stopped answering her question and started selling. */}
          <ul
            className="animate-fade mt-7 max-w-md space-y-2.5"
            style={{ animationDelay: '220ms' }}
          >
            {[
              'Introductions are made by hand, one at a time, and only after both people have said yes. There is nothing to browse.',
              'The rest works on the relationship you already have — however you met, with no account. Send them the same eleven questions; you both see only where the two of you stand.',
              'A few days later, we ask whether the conversation happened. When you marry, we let you go.',
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[0.93rem] leading-snug text-cream/70 text-pretty">
                <span className="mt-[0.5rem] h-1 w-1 flex-none rounded-full bg-gold-soft" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {/* What is true, in one line. */}
          <p
            className="animate-fade mt-5 text-xs text-cream/60"
            style={{ animationDelay: '300ms' }}
          >
            Private to you · No account · Free
          </p>
          {/* Quiet on purpose: someone arriving for the first time should meet
              the question this app exists to answer, not a login. */}
          <RestoreMap />
        </main>

      </div>
    </div>
  )
}
