import type { Identity } from '../types'
import { getHookOption, hookOptions, hookQuestion } from '../data/hook'
import { chapters } from '../data/intake'
import { BackButton, Button, ArrowRight } from './ui'

interface Props {
  identity: Identity
  /** Selected hook option id, if any. */
  value?: string
  onSelect: (id: string) => void
  /** skipIntro: true when momentum is high (insight CTA) — straight to question one. */
  onContinue: (skipIntro: boolean) => void
  onBack: () => void
}

/**
 * The 30-second aha. One question, one instantly personal answer — value before
 * we ask for the full intake.
 */
export default function Hook({ identity, value, onSelect, onContinue, onBack }: Props) {
  const chosen = getHookOption(value)
  const name = identity.firstName?.trim() ?? ''

  return (
    <div className="relative min-h-dvh bg-cream">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 pb-12 pt-6">
        <BackButton onClick={onBack} className="self-start" />

        <div className="flex flex-1 flex-col justify-center py-10">
          {!chosen ? (
            <>
              <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">
                Before anything else
              </p>
              <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
                {hookQuestion}
              </h1>
              <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
                Be honest — there’s no wrong answer, and no one else sees this.
              </p>

              <div className="mt-8 flex flex-col gap-2.5">
                {hookOptions.map((opt, i) => (
                  <button
                    key={opt.id}
                    onClick={() => onSelect(opt.id)}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className="animate-rise flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white/50 p-4 text-left text-[0.98rem] font-medium text-ink transition-all duration-200 hover:border-forest/40 hover:bg-white"
                  >
                    {opt.label}
                    <ArrowRight className="h-4 w-4 flex-none text-gold" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => onContinue(false)}
                className="animate-fade mt-5 self-start text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
                style={{ animationDelay: '260ms' }}
              >
                None of these quite fits — skip for now
              </button>
            </>
          ) : (
            <div className="animate-rise">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold">
                The honest answer
              </p>
              <h1 className="mt-4 font-display text-[1.7rem] font-medium leading-snug tracking-tight text-ink text-balance">
                {chosen.label}.
              </h1>

              <div className="mt-6 rounded-card border border-gold/25 bg-gold/[0.07] p-6">
                {chosen.insight(name, identity.gender)
                  .split(/\n\n+/)
                  .map((p, i) => (
                    <p
                      key={i}
                      className={`text-[1.02rem] leading-relaxed text-ink-soft text-pretty ${i > 0 ? 'mt-3' : ''}`}
                    >
                      {p}
                    </p>
                  ))}
              </div>

              {/* Preview the first chapter here — the CTA lands on question one, not another splash. */}
              <div className="mt-6 border-t border-line/70 pt-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Up next · {chapters[0].kicker}
                </p>
                <p className="mt-2 font-display text-[1.3rem] font-medium tracking-tight text-ink">
                  {chapters[0].title}
                </p>
                <p className="mt-1 text-[0.85rem] text-muted">
                  6 short chapters · about 3 minutes · private to you
                </p>
              </div>
              <div className="mt-7">
                <Button onClick={() => onContinue(true)} className="group">
                  Build my readiness map
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
              <button
                onClick={() => onSelect('')}
                className="mt-4 text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
              >
                Actually, it’s something else
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
