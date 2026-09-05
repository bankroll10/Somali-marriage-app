import { Button, GeoBackdrop, Logo, ArrowRight } from './ui'
import RestoreMap from './RestoreMap'

interface Props {
  onBegin: () => void
  /** The other door: she already has someone, and needs tonight solved first. */
  onRead: () => void
  hasProgress: boolean
  completed: boolean
  onResume: () => void
  onEnter: () => void
  onPhilosophy: () => void
}


export default function Welcome({
  onBegin,
  onRead,
  hasProgress,
  completed,
  onResume,
  onEnter,
  onPhilosophy,
}: Props) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-forest-deep text-cream">
      <GeoBackdrop className="opacity-70" />

      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-6 pb-12 pt-8">
        <header className="flex items-center justify-between">
          <Logo mono className="text-cream" />
          <span className="text-xs uppercase tracking-[0.2em] text-cream/50">نية</span>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <p className="animate-fade mb-5 text-sm font-medium uppercase tracking-[0.25em] text-gold-soft">
            Built for the Somali diaspora
          </p>

          {/* The hook keeps the shape of a question you can't answer about
              yourself — but points it at the obstacle, not at her.
              "Are you actually ready?" is clickable because it pokes the fear
              this person already carries: that she might be the reason none of
              this has worked. Asking what's in her way keeps every bit of the
              curiosity and assumes she is fine, which is both kinder and closer
              to what the map actually returns. */}
          <h1 className="animate-rise font-display text-[2.9rem] font-medium leading-[1.04] tracking-tight text-balance sm:text-[3.6rem]">
            What’s <span className="italic text-gold-soft">actually</span> in your way?
          </h1>

          <p
            className="animate-rise mt-6 max-w-lg text-[1.05rem] leading-relaxed text-cream/75 text-pretty"
            style={{ animationDelay: '80ms' }}
          >
            Before you meet anyone: thirteen questions, about two minutes. Then a
            straight answer — the ground you’re standing on, the one place you’re
            thinnest right now, and one honest thing to do about it this week.
          </p>

          {/* What is withheld is the real thing. This used to be a ring with
              "??" in it and "Your number is two minutes away" — a quiz-funnel
              hook that promised a score, and then the map had to deliver one.
              The honest object was already in the paragraph above. */}
          <div
            className="animate-rise mt-8 max-w-md border-l-2 border-gold-soft/60 pl-4"
            style={{ animationDelay: '120ms' }}
          >
            <p className="font-display text-[1.15rem] font-medium leading-snug tracking-tight text-cream text-balance">
              The one place you’re thinnest is two minutes away.
            </p>
            <p className="mt-1 text-[0.88rem] leading-snug text-cream/55 text-pretty">
              In words, not a score. No one else ever sees it — not your family, not a match, not us.
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
            Most people have simply never been asked these questions.
          </p>

          {/* What kind of thing this is.
              Everything that makes Niyyah different from a dating app was, until
              now, only visible after she had already spent two minutes: no
              swiping lives on the sample introduction, wali-friendly on Trust, values-before-
              photos on a candidate card. All of it behind the decision it was
              supposed to inform. A difference nobody can perceive at the moment
              of choosing does no work at all.
              Three lines, and it stays three. The moment this becomes a feature
              list it has stopped answering her question and started selling. */}
          <ul
            className="animate-fade mt-7 max-w-md space-y-2.5"
            style={{ animationDelay: '220ms' }}
          >
            {[
              'Built by a Somali, for the questions our aunties ask — and the ones they don’t.',
              'We start where you are: getting ready, talking to someone, or deciding with the families.',
              'The conversations that break marriages — where you’d live, money home, a second wife — asked early, not too late.',
            ].map((line) => (
              <li key={line} className="flex gap-3 text-[0.93rem] leading-snug text-cream/70 text-pretty">
                <span className="mt-[0.5rem] h-1 w-1 flex-none rounded-full bg-gold-soft" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div
            className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: '160ms' }}
          >
            {completed ? (
              <Button variant="onDark" onClick={onEnter} className="group">
                Enter Niyyah
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            ) : (
              <>
                <Button variant="onDark" onClick={onBegin} className="group">
                  Start where you are
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
                {hasProgress && (
                  <button
                    onClick={onResume}
                    className="text-sm font-medium text-cream/70 underline-offset-4 transition hover:text-cream hover:underline"
                  >
                    Pick up where you left off
                  </button>
                )}
              </>
            )}
          </div>
          {/* The line this page used to lead with. It's the best sentence in the
              product — but it's the reward for reading, not the hook. */}
          <p
            className="animate-fade mt-6 max-w-md text-[0.95rem] leading-relaxed text-cream/60 text-pretty"
            style={{ animationDelay: '260ms' }}
          >
            Then: find someone serious — without losing your{' '}
            <span className="italic text-cream/80">dignity, faith, time, or peace.</span>
          </p>
          <p
            className="animate-fade mt-4 text-xs text-cream/45"
            style={{ animationDelay: '300ms' }}
          >
            Private to you · Minneapolis opens first · We never pretend a city is full
          </p>
          {/* The second door.
              The map answers "am I ready" — which ranks near the bottom of what
              actually hurts. The woman with a live problem is already talking to
              someone and wants to know what he means, tonight. Making her answer
              thirteen questions about herself first is a toll gate, not an
              onboarding, and it is where we lost Samira. This costs the hero
              nothing and opens the product to the person in the most pain. */}
          <div
            className="animate-rise mt-8 w-full max-w-md rounded-card border border-cream/15 bg-cream/[0.06] p-5"
            style={{ animationDelay: '300ms' }}
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
              Already talking to someone?
            </p>
            <p className="mt-2 font-display text-[1.2rem] font-medium leading-snug text-cream text-balance">
              Start with a read on them instead.
            </p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-cream/60 text-pretty">
              Eleven questions about what they have actually done. You get an
              honest read and the one question worth asking them next — no
              account, no intake first.
            </p>
            <button
              onClick={onRead}
              className="group mt-4 inline-flex items-center gap-2 rounded-full border border-cream/30 px-5 py-2.5 text-[0.9rem] font-medium text-cream transition hover:bg-cream/10"
            >
              Is he serious?
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Quiet on purpose: someone arriving for the first time should meet
              the question this app exists to answer, not a login. */}
          <RestoreMap />

          <button
            onClick={onPhilosophy}
            className="animate-fade mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-gold-soft underline-offset-4 transition hover:underline"
            style={{ animationDelay: '340ms' }}
          >
            Why we’re different
            <ArrowRight className="h-4 w-4" />
          </button>
        </main>

      </div>
    </div>
  )
}
