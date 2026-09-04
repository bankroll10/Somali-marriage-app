import { REPLIES_PER_STEP, freeForever, paidLater, promises } from '../data/plus'
import { CheckIcon, ScreenHeader } from './ui'

interface Props {
  onBack: () => void
}

/**
 * What is free, what will cost money, and why.
 *
 * This screen used to sell Niyyah+: a monthly, six-month and yearly plan whose
 * one real feature was "your guide, without a counter", with a seven-day
 * no-card trial to start it. The copy was honest and the mechanism was not —
 * a product paid to lift a reply counter earns most from the member having the
 * worst night. There is no trial and no plan here now. The guide is free and
 * budgeted by progress; what will be sold is bought once, for a stage or for a
 * person, and prices are set at launch rather than invented here.
 */
export default function Plus({ onBack }: Props) {
  return (
    <div className="min-h-dvh bg-cream pb-16">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">What’s free, and what isn’t</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        <section className="relative mt-6 overflow-hidden rounded-card bg-forest-deep p-8 text-cream">
          <div className="bg-geo pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold-soft">The rule</p>
            <h1 className="mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-balance sm:text-[2.4rem]">
              We never earn more because you’re having a hard night.
            </h1>
            <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-cream/80 text-pretty">
              Every app in this category is paid when you stay longer, message more, or stay single. Ours
              isn’t priced by the reply, the message or the month. What we will sell is bought once — for a
              stage, or for a person — and it ends when it has done its job.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">Free, and staying free</p>
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
              A woman should never have to pay to protect herself, and never to answer someone who is
              serious about her. Other apps charge for exactly that. We won’t, at any price, ever.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">How the guide is paid for</p>
          <div className="rounded-card border border-line bg-white/60 p-6">
            <p className="text-[0.98rem] leading-relaxed text-ink-soft text-pretty">
              Every reply costs us money to run, so there is a budget. It doesn’t refill on the first of the
              month — it refills when something real moves. Every step on the ladder and every follow-up
              you answer gives you {REPLIES_PER_STEP} more replies: you say where you are, you build your map,
              you take a read on someone, you go through the eleven, you ask him to answer them too, you
              tell us the conversation happened. To talk to the guide more, you move — and the guide is
              what moves you.
            </p>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-muted text-pretty">
              There is no counter on the screen and no way to buy more. That is the whole point.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            What will cost money, with the launch
          </p>
          <div className="space-y-3">
            {paidLater.map((item) => (
              <div key={item.title} className="flex items-start gap-3.5 rounded-card border border-line bg-white/60 p-5">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold/15 text-gold">
                  <CheckIcon size={14} />
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-display text-[1.1rem] font-medium text-ink">
                    {item.title}
                    <span className="rounded-full bg-sand px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
                      Bought once
                    </span>
                  </p>
                  <p className="mt-1 text-[0.9rem] leading-relaxed text-muted text-pretty">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.88rem] leading-relaxed text-muted text-pretty">
            Prices are set at launch, not before. If Niyyah does its job you will stop paying us, and that is
            the outcome we are building for.
          </p>
        </section>

        <section className="mt-8 rounded-card border border-gold/30 bg-gold/[0.07] p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Founding members</p>
          <p className="mt-3 font-display text-[1.4rem] font-medium leading-snug tracking-tight text-ink text-balance">
            Your first year is on us.
          </p>
          <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
            Everyone here before the public launch keeps every paid feature free for a full year after it —
            our thanks for building this with us.
          </p>
        </section>

        <section className="mt-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted">What we promise</p>
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
