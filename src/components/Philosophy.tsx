import { BackButton, Button, GeoBackdrop, Logo, ArrowRight } from './ui'

interface Props {
  onBack: () => void
  onPrimary: () => void
  primaryLabel: string
}

const notList = [
  'Not a hookup app',
  'Not a random dating app',
  'Not a corny “Muslim app”',
  'Not arranged-marriage-only',
]

const bridges = [
  {
    left: 'Tradition',
    right: 'Technology',
    body: 'The wisdom of how it was always done, with the tools of how we actually live now.',
  },
  {
    left: 'Family',
    right: 'Individual choice',
    body: 'Your people involved and honoured — and your heart still your own.',
  },
  {
    left: 'Attraction',
    right: 'Intention',
    body: 'Feeling matters. But you choose on the fit, not the spark.',
  },
  {
    left: 'AI',
    right: 'Faith',
    body: 'Guidance that’s genuinely smart and God-conscious — never one at the cost of the other.',
  },
  {
    left: 'Somali culture',
    right: 'Modern reality',
    body: 'Who you are and where you actually live — both fully honoured.',
  },
]

/**
 * Who this is for, said as a standard rather than a demographic.
 *
 * "The ones who mean it" was already sitting in the Niyyah+ copy doing nothing.
 * It's the right name for a member of a product called *intention* — plain
 * English, nothing to cringe at saying out loud, and it defines belonging by
 * how someone behaves rather than by age, city or how practising they are.
 * Every line is a standard a person can recognise themselves in or decline.
 */
const creed = [
  'You would rather wait two years for the right one than two months for the available one.',
  'You want your family in the room — not managing you from outside it.',
  'You have stopped performing for people who were never going to choose you.',
  'You are willing to hear the part about yourself you would rather not hear.',
]

/**
 * The words this product already uses, collected and defined.
 *
 * These aren't invented jargon — every one of them is live in the app. Writing
 * them down is what turns private product nouns into language members share
 * with each other, and it makes the whole thing legible as one system instead
 * of a pile of screens.
 */
const lexicon = [
  {
    term: 'Your map',
    body: 'The reading you get at the end of the reflection. Not a score of you as a person — the ground you are standing on.',
  },
  {
    term: 'A reading',
    body: 'One dated map. You will have several. The distance between them is the whole point.',
  },
  {
    term: 'Your ground',
    body: 'The seven things a marriage stands on. Everyone is thin somewhere; the map just says where.',
  },
  {
    term: 'The work',
    body: 'One honest thing, taken on and done. Nothing is scored — doing it changes your answers, and your answers are the map.',
  },
  {
    term: 'The mirror',
    body: 'The part of your map you would rather not read. It is the reason to trust the rest of it.',
  },
  {
    term: 'Your space',
    body: 'Where you land each day: what happened, what you are working on, and a thought worth carrying. Not a feed.',
  },
]

const principles = [
  {
    title: 'Choose for deen and character first',
    body: 'Charm fades, money moves, beauty changes. Taqwa and good character are what you lean on for fifty years.',
  },
  {
    title: 'Alignment over attraction',
    body: 'A spark lights up for the wrong person just as bright as the right one. Choose on whether your lives actually fit.',
  },
  {
    title: 'Involve the people who love you',
    body: 'What’s built in the open, with family, carries a barakah that secrecy never can.',
  },
  {
    title: 'Protect your time, faith, and peace',
    body: 'Clarity early. No drifting, no situationships, no shrinking yourself to be chosen.',
  },
]

export default function Philosophy({ onBack, onPrimary, primaryLabel }: Props) {
  return (
    <div className="min-h-dvh bg-cream pb-20">
      {/* Hero — the positioning */}
      <div className="relative overflow-hidden bg-forest-deep text-cream">
        <GeoBackdrop className="opacity-70" />
        <div className="relative mx-auto max-w-2xl px-6 pb-12 pt-6">
          <div className="flex items-center justify-between">
            <BackButton onClick={onBack} tone="light" />
            <Logo mono className="text-cream" />
            <span className="w-9" />
          </div>

          <div className="py-12">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-soft">
              Our philosophy
            </p>
            <h1 className="animate-rise mt-4 font-display text-[2.1rem] font-medium leading-[1.12] tracking-tight text-balance sm:text-[2.7rem]">
              The trusted marriage platform for the{' '}
              <span className="italic text-gold-soft">Somali diaspora.</span>
            </h1>
            <p className="animate-rise mt-5 text-[1.05rem] leading-relaxed text-cream/75 text-pretty">
              Powered by AI · guided by faith · designed for serious people. A place
              not for swiping, but for choosing well — with your faith, your family,
              and your standards intact.
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-6">
        {/* Not / a bridge */}
        <section className="py-10">
          <div className="flex flex-wrap gap-2">
            {notList.map((n) => (
              <span
                key={n}
                className="rounded-full border border-line bg-white/50 px-3.5 py-1.5 text-[0.85rem] font-medium text-muted line-through decoration-clay/50"
              >
                {n}
              </span>
            ))}
          </div>
          <h2 className="mt-6 font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            A modern bridge.
          </h2>
          <p className="mt-3 max-w-lg text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
            Between the world that raised you and the world you live in. Niyyah
            doesn’t ask you to abandon either side — it holds them together.
          </p>
        </section>

        {/* The five bridges */}
        <section className="mb-12">
          <h3 className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Five bridges we hold
          </h3>
          <div className="space-y-3">
            {bridges.map((b, i) => (
              <div
                key={b.left}
                className="animate-rise rounded-card border border-line bg-white/50 p-5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3 font-display text-[1.1rem] font-medium text-ink">
                  <span>{b.left}</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-none text-gold"
                    aria-hidden
                  >
                    <path
                      d="M7 8.5 3.5 12 7 15.5M17 8.5l3.5 3.5-3.5 3.5M4 12h16"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{b.right}</span>
                </div>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-muted text-pretty">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Learn to choose */}
        <section className="mb-12 rounded-card bg-forest p-7 text-cream sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-soft">
            The real product
          </p>
          <h3 className="mt-3 font-display text-[1.6rem] font-medium leading-snug tracking-tight text-balance">
            A place to learn how to choose.
          </h3>
          <p className="mt-3 text-[1rem] leading-relaxed text-cream/80 text-pretty">
            Most people don’t need more options — they need wisdom while navigating
            them. Everything here, from your readiness map to your guide, teaches
            the same four things.
          </p>
          <div className="mt-6 space-y-4">
            {principles.map((p, i) => (
              <div key={p.title} className="flex gap-3.5">
                <span className="font-display text-[1.1rem] font-medium text-gold-soft tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-[1.05rem] font-medium">{p.title}</p>
                  <p className="mt-0.5 text-[0.9rem] leading-relaxed text-cream/70 text-pretty">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we will not do.
            Every product in this category is tempted by the same lie — invent
            people so a young marketplace looks alive. We won't, and saying so
            plainly turns the one thing that looks like a weakness (a city that
            is still filling) into the clearest proof of the trust everything
            else here rests on. It sat in muted small print under a list of
            profiles. It belongs stated, in our own voice, without apology. */}
        <section className="mb-12 rounded-card border border-gold/30 bg-gold/[0.07] p-7 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            What we won’t do
          </p>
          <h3 className="mt-3 font-display text-[1.6rem] font-medium leading-snug tracking-tight text-ink text-balance">
            We will never invent a person to make this look busy.
          </h3>
          <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft text-pretty">
            While your city fills, some of what you see is there to show you how
            introductions will work — and every one of those says so, on the card,
            where you cannot miss it. You will never be quietly counted as
            interested, never shown a face that does not belong to someone real,
            and never told a room is full when it is filling.
          </p>
          <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft text-pretty">
            A marriage platform that will lie about how many people are here will
            lie about who they are. We would rather open slowly and be believed.
          </p>
        </section>

        {/* Who this is for. A standard someone recognises themselves in — or
            declines, which is the point. Membership by conduct, never by how
            practising, how old, or how long they've been looking. */}
        <section className="mb-12">
          <h3 className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            The ones who mean it
          </h3>
          <div className="rounded-card border border-gold/30 bg-gold/[0.07] p-6 sm:p-7">
            <p className="font-display text-[1.5rem] font-medium leading-snug tracking-tight text-ink text-balance">
              You’ll know if this is yours.
            </p>
            <ul className="mt-5 space-y-3.5">
              {creed.map((line) => (
                <li key={line} className="flex items-start gap-3 text-[1rem] leading-relaxed text-ink-soft">
                  <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                  <span className="text-pretty">{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-gold/20 pt-4 text-[0.92rem] leading-relaxed text-muted text-pretty">
              Niyyah means intention. That’s the whole entry requirement — not how
              practising you are, not how long you’ve been looking, not how many
              people your family has already put in front of you.
            </p>
          </div>
        </section>

        {/* The vocabulary, written down. Shared words are what make a group a
            group; these are already the app's own, just never taught. */}
        <section className="mb-12">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted">
            The words we use
          </h3>
          <p className="mb-5 max-w-lg text-[0.95rem] leading-relaxed text-muted text-pretty">
            You’ll see these everywhere in here. They mean something specific.
          </p>
          <dl className="space-y-3">
            {lexicon.map((l, i) => (
              <div
                key={l.term}
                className="animate-rise rounded-card border border-line bg-white/50 p-5"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <dt className="font-display text-[1.1rem] font-medium text-ink">{l.term}</dt>
                <dd className="mt-1 text-[0.92rem] leading-relaxed text-muted text-pretty">
                  {l.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col items-center gap-3 text-center">
          <Button onClick={onPrimary} className="group">
            {primaryLabel}
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </main>
    </div>
  )
}
