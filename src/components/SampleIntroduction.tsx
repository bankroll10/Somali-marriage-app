import { useMemo } from 'react'
import type { AnswerValue, Answers, Identity, WaitlistState } from '../types'
import { candidatesFor } from '../data/candidates'
import { getScene } from '../data/scenes'
import { alignment } from '../lib/matching'
import Cohort from './Cohort'
import HowYoudLive from './HowYoudLive'
import { LockGlyph, ScreenHeader } from './ui'

interface Props {
  identity: Identity
  answers: Answers
  hookId?: string
  ledger?: string[]
  waitlist: WaitlistState | null
  onJoinWaitlist: (s: WaitlistState) => void
  onScene?: (scene: string) => void
  /** The three "how you'd live" answers are taken here, where they change the reasons in front of her. */
  onAnswer: (questionId: string, value: AnswerValue) => void
  onBack: () => void
}

/**
 * One introduction, clearly a sample.
 *
 * This used to be a room of fourteen invented people wearing verified badges,
 * behind a "verify to enter" gate. It taught her that this is a dating app
 * populated by fiction — the one lesson that undoes the whole trust claim.
 *
 * What survives is the part that is true: the matching is real, and it runs on
 * her actual map. So this shows one person — invented, and said so in the
 * first line — and the exact reasons her answers align with his. Her side of
 * the screen is real. There is no "express interest", because there is nobody
 * on the other side of it, and the honest next step is the count below.
 */
export default function SampleIntroduction({
  identity,
  answers,
  hookId,
  ledger,
  waitlist,
  onJoinWaitlist,
  onScene,
  onAnswer,
  onBack,
}: Props) {
  const sample = useMemo(() => {
    // Women are who this is built for first; a missing gender shows her side.
    const pool = candidatesFor(identity.gender ?? 'woman')
    return pool
      .map((candidate) => ({ candidate, align: alignment(answers, candidate) }))
      // Never show her a sample that fails one of her non-negotiables; the
      // real thing will not, either. Then her city, then the closest fit.
      .filter((x) => !x.align.blocked)
      .sort((a, b) => {
        const as = a.candidate.scene === identity.scene ? 1 : 0
        const bs = b.candidate.scene === identity.scene ? 1 : 0
        if (as !== bs) return bs - as
        return b.align.fit - a.align.fit
      })[0]
  }, [identity.gender, identity.scene, answers])

  if (!sample) return null
  const { candidate: c, align } = sample

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">How an introduction will look</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        <section className="py-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            A sample — not a real member
          </p>
          <h1 className="mt-2 font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            Chosen by alignment — not looks.
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted text-pretty">
            When your city opens, this is what you’ll see: one person at a time,
            why we think your lives fit, where you differ, and the first thing to
            ask. Never a percentage, never a ranking. {c.name} is invented to show
            it. Your side is real — every line below comes from your own map.
          </p>
        </section>

        {/* The person */}
        <div className="flex items-center gap-5">
          <div className="relative h-20 w-20 flex-none">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-forest">
              <span className="font-display text-2xl font-medium text-cream/40 blur-[1px]">{c.name.charAt(0)}</span>
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-cream px-1.5 py-1 text-muted shadow">
              <LockGlyph className="h-3 w-3" />
            </span>
          </div>
          <div>
            <h2 className="font-display text-[1.6rem] font-medium tracking-tight text-ink">
              {c.name}, {c.age}
            </h2>
            <p className="text-[0.95rem] text-muted">
              {c.occupation} · {getScene(c.scene)?.label}
            </p>
            <p className="mt-1 text-[0.78rem] font-medium uppercase tracking-[0.14em] text-gold">Sample</p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-2.5 py-1 text-[0.72rem] font-semibold text-forest">
              Vouched by family · sample
            </p>
          </div>
        </div>

        {/* The part that is real: her map, read against someone. */}
        <div className="mt-6 rounded-card bg-forest p-6 text-cream">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-soft">Why your lives would fit</p>
          {align.reasons.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {align.reasons.map((r) => (
                <li key={r} className="flex gap-2.5 text-[0.95rem] text-cream/85">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-soft" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[0.95rem] text-cream/85 text-pretty">
              Not much yet — the more of your map you’ve answered, the more there is to read here.
            </p>
          )}
          {align.differs && (
            <div className="mt-4 border-t border-cream/15 pt-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">Where you differ</p>
              <p className="mt-1.5 text-[0.95rem] text-cream/85">{align.differs}</p>
            </div>
          )}
          <div className="mt-4 border-t border-cream/15 pt-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">The first thing to ask</p>
            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-cream/85 text-pretty">{align.ask}</p>
          </div>
          <p className="mt-4 text-[0.82rem] leading-relaxed text-cream/60 text-pretty">
            What you said you won’t compromise on is checked first; anyone who fails it is never shown.
            The rest is read from your answers on faith, timeline, family, children, what you value most
            — and, once you’ve said, how you’d live. A real member would be read the same way.
          </p>
        </div>

        {/* The three grounds no other app reads on. Asked here, not in the
            intake, because here an answer changes the reasons above as she
            taps — value she can see, in the moment she gives it. */}
        <div className="mt-5 rounded-card border border-gold/30 bg-gold/[0.07] p-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">Sharpen this read</p>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-muted text-pretty">
            Three things about how you’d live. No other app reads on these — and they are what our
            marriages actually break on. Optional; the reasons above change as you answer.
          </p>
          <div className="mt-4">
            <HowYoudLive answers={answers} onAnswer={onAnswer} />
          </div>
        </div>

        <p className="mt-7 text-[1.05rem] leading-relaxed text-ink-soft text-pretty">{c.bio}</p>

        <div className="mt-6 space-y-4">
          {c.prompts.map((p) => (
            <div key={p.q} className="rounded-card border border-line bg-white/60 p-5">
              <p className="text-[0.82rem] font-medium uppercase tracking-[0.14em] text-muted">{p.q}</p>
              <p className="mt-2 text-[1rem] leading-relaxed text-ink text-pretty">“{p.a}”</p>
            </div>
          ))}
        </div>

        {/* What would happen next — future tense, because nothing does yet. */}
        <div className="mt-8 rounded-card border border-line bg-white/60 p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">What happens next, when it’s real</p>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
            Here you’d say yes, or no with a reason — one person at a time, and the
            next only after you’ve answered. A considered no is progress here, not
            a swipe. If it’s mutual, photos are shown to each other and a guided
            conversation opens, with your wali welcome inside it. Nobody is on the
            other side of this sample, so the only honest next step is the one below.
          </p>
        </div>

        <div className="mt-6">
          <Cohort
            identity={identity}
            hookId={hookId}
            ledger={ledger}
            joined={waitlist}
            onJoined={onJoinWaitlist}
            onScene={onScene}
            compact
          />
        </div>
      </main>
    </div>
  )
}
