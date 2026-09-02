import { Button, GeoBackdrop, Logo, ArrowRight } from './ui'
import RestoreMap from './RestoreMap'

interface Props {
  onBegin: () => void
  hasProgress: boolean
  completed: boolean
  onResume: () => void
  onEnter: () => void
  onPhilosophy: () => void
}


/**
 * The result, withheld.
 *
 * Same ring the readiness map reveals at the end — drawn here with the number
 * replaced by "??" and the arc barely started. It shows the exact shape of what
 * you get without giving any of it away, which is the only honest way to build
 * curiosity: nothing here is a claim, it's the real object with the answer
 * removed.
 */
function LockedRing() {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-24 w-24 flex-none" aria-hidden>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-cream)" strokeOpacity="0.14" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--color-gold-soft)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * 0.88}
          className="animate-ring-tease"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[1.6rem] font-medium leading-none text-cream/80">??</span>
        <span className="mt-1 text-[0.55rem] uppercase tracking-[0.18em] text-cream/45">
          readiness
        </span>
      </div>
    </div>
  )
}

export default function Welcome({
  onBegin,
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

          {/* The gap, made visible. You can see the shape of your answer and not
              the answer: the ring is drawn, the number is withheld. */}
          <div
            className="animate-rise mt-8 flex items-center gap-5"
            style={{ animationDelay: '120ms' }}
          >
            <LockedRing />
            <div className="min-w-0">
              <p className="font-display text-[1.15rem] font-medium leading-snug tracking-tight text-cream text-balance">
                Your number is two minutes away.
              </p>
              <p className="mt-1 text-[0.88rem] leading-snug text-cream/55 text-pretty">
                No one else ever sees it — not your family, not a match, not us.
              </p>
            </div>
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
              swiping lives on Discovery, wali-friendly on Trust, values-before-
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
              'No swiping, no feed — a few considered introductions, ranked by how your lives actually fit.',
              'You meet values first and faces later: photos stay private until you both choose.',
              'Your family and your wali belong inside this, not outside it.',
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
                  Show me what’s in my way
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
