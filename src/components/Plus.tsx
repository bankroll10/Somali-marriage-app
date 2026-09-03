import { useState } from 'react'
import { FREE_REPLIES, TRIAL_DAYS, freeForever, plans, plusIncludes, promises } from '../data/plus'
import { ArrowRight, CheckIcon, ScreenHeader } from './ui'

interface Props {
  /** Live trial state — the screen says something different in each. */
  plusActive: boolean
  trialDaysLeft: number
  trialUsed: boolean
  repliesLeft: number
  onStartTrial: () => void
  onEndTrial: () => void
  onBack: () => void
}

/**
 * Niyyah+.
 *
 * Written to be read by someone who has been burned by a subscription before.
 * The order is deliberate: what you already have free, then why this costs
 * money at all, then what it adds, then the price — and the plan we think most
 * people should buy is not the most expensive one. There is no checkout here
 * and no card is taken; the trial is real and simply ends.
 */
export default function Plus({
  plusActive,
  trialDaysLeft,
  trialUsed,
  repliesLeft,
  onStartTrial,
  onEndTrial,
  onBack,
}: Props) {
  const [confirmEnd, setConfirmEnd] = useState(false)

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">Niyyah+</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        {/* Hero — states the honest reason for the price before asking for it. */}
        <section className="relative mt-6 overflow-hidden rounded-card bg-forest-deep p-8 text-cream">
          <div className="bg-geo pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold-soft">
              {plusActive ? `Niyyah+ · ${trialDaysLeft} days left` : 'Niyyah+'}
            </p>
            <h1 className="mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-balance sm:text-[2.4rem]">
              {plusActive ? 'You have all of it.' : 'You should know what you already have.'}
            </h1>
            <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-cream/80 text-pretty">
              {plusActive
                ? 'Every voice, without a counter. Nothing will be charged when this ends — we never took a card.'
                : 'Your map, your work, your reads, the words for your family and your introductions are free and always will be. Niyyah+ pays for the one thing that costs us money every time you use it: the guide, without a counter.'}
            </p>
          </div>
        </section>

        {/* Free first. Nobody should learn what they already have from a paywall. */}
        <section className="mt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Free, and staying free
          </p>
          <div className="rounded-card border border-line bg-white/60 p-6">
            <ul className="space-y-3">
              {freeForever.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[0.95rem] text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-forest/10 text-forest">
                    <CheckIcon size={11} />
                  </span>
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-[0.88rem] leading-relaxed text-muted text-pretty">
              A woman should never have to pay to protect herself, and never to
              answer someone who is serious about her. Other apps charge for
              exactly that. We won’t, at any price, ever.
            </p>
          </div>
        </section>

        {/* What Plus adds */}
        <section className="mt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            What Niyyah+ adds
          </p>
          <div className="space-y-3">
            {plusIncludes.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3.5 rounded-card border border-line bg-white/60 p-5"
              >
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold/15 text-gold">
                  <CheckIcon size={14} />
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-display text-[1.1rem] font-medium text-ink">
                    {item.title}
                    {item.soon && (
                      <span className="rounded-full bg-sand px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
                        With launch
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[0.9rem] leading-relaxed text-muted text-pretty">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Price. Shown only after all of the above. */}
        <section className="mt-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            What it costs
          </p>
          <div className="grid gap-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-card border p-5 ${
                  plan.badge ? 'border-gold/40 bg-gold/[0.07]' : 'border-line bg-white/60'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="flex items-center gap-2">
                    <span className="font-display text-[1.15rem] font-medium text-ink">
                      {plan.label}
                    </span>
                    {plan.badge && (
                      <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-gold">
                        {plan.badge}
                      </span>
                    )}
                  </p>
                  <p className="font-display text-[1.3rem] font-medium tabular-nums text-forest">
                    {plan.price}
                  </p>
                </div>
                <p className="mt-0.5 text-[0.82rem] tabular-nums text-muted">{plan.per}</p>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted text-pretty">
                  {plan.note}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.88rem] leading-relaxed text-muted text-pretty">
            If Niyyah does its job you will stop paying us, and that is the
            outcome we are building for. We would rather be the subscription you
            cancelled for the right reason than the one you forgot about.
          </p>
        </section>

        {/* The offer */}
        <section className="mt-8 rounded-card border border-gold/30 bg-gold/[0.07] p-6 text-center">
          {plusActive ? (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
                Your trial
              </p>
              <p className="mt-3 font-display text-[1.5rem] font-medium leading-snug tracking-tight text-ink text-balance">
                {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
                When it ends you’ll go back to the free plan on your own — no
                charge, because there’s no card on file. Niyyah+ billing opens
                with our public launch, and founding members keep everything free
                for a year after that.
              </p>
              {confirmEnd ? (
                <div className="mt-6">
                  <p className="text-[0.9rem] text-ink-soft text-pretty">
                    End it now? You’ll keep every conversation you’ve had.
                  </p>
                  <div className="mt-3 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        onEndTrial()
                        setConfirmEnd(false)
                      }}
                      className="rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-medium text-cream transition hover:bg-forest-deep"
                    >
                      Yes, end it
                    </button>
                    <button
                      onClick={() => setConfirmEnd(false)}
                      className="rounded-full border border-line px-5 py-2.5 text-[0.88rem] font-medium text-ink-soft transition hover:bg-white"
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmEnd(true)}
                  className="mt-5 text-[0.85rem] font-medium text-forest underline-offset-4 transition hover:underline"
                >
                  End my trial now
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
                {trialUsed ? 'Founding member' : `${TRIAL_DAYS} days free`}
              </p>
              <p className="mt-3 font-display text-[1.5rem] font-medium leading-snug tracking-tight text-ink text-balance">
                {trialUsed ? 'Your first year is on us.' : 'Try it without giving us a card.'}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
                {trialUsed
                  ? 'Niyyah+ arrives with our public launch. Everyone here before then keeps every premium feature free for a full year — our thanks for building this with us.'
                  : `${TRIAL_DAYS} days of everything above. Nothing to cancel and nothing to forget: with no card on file, it can only end.`}
              </p>
              {/* Always offer the way forward. This used to render only when
                  the trial had never been taken, so anyone who tried the cancel
                  flow permanently emptied the page of its only action. */}
              <button
                onClick={onStartTrial}
                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-[0.95rem] font-medium text-cream transition hover:bg-forest-deep"
              >
                {trialUsed ? 'Turn Niyyah+ back on' : `Start my ${TRIAL_DAYS} days`}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </button>
              {!plusActive && repliesLeft > 0 && (
                <p className="mt-4 text-[0.82rem] text-muted">
                  You still have {repliesLeft} of your {FREE_REPLIES} guide replies this month.
                </p>
              )}
            </>
          )}
        </section>

        {/* The promises. Ordinary in a good product, rare in this category. */}
        <section className="mt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            What we promise
          </p>
          <ul className="space-y-2.5">
            {promises.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[0.92rem] text-ink-soft">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                <span className="text-pretty">{p}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
