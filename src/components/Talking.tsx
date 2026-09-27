import { ArrowRight, BackButton, CompassGlyph, GlyphTile, PeopleGlyph, SeedGlyph, TextButton } from './ui'

interface Props {
  onRead: () => void
  onBeforeYes: () => void
  onFamilies: () => void
  /** The other door, for someone who tapped this one by mistake. */
  onLooking: () => void
  onBack: () => void
}

/**
 * I'm already talking to someone.
 *
 * The second door on Welcome, and the one screen between it and the three
 * instruments built for a relationship a person already has: the read, the
 * eleven and the family words (docs/PRODUCT.md §2). Until 2026-09-27 the
 * door went straight to the read, which is right for the person who cannot
 * tell what {he} means yet and one tap wrong for the one whose families are
 * about to be involved. Three cards, each the situation as she would say it,
 * and no question about who she is: the instruments ask that themselves, and
 * none of them needs an account.
 */
export default function Talking({ onRead, onBeforeYes, onFamilies, onLooking, onBack }: Props) {
  const doors = [
    {
      title: 'I can’t tell what they mean yet',
      desc: 'Get a read: ninety seconds on what they have shown you, and the one question to ask next.',
      go: onRead,
      glyph: <CompassGlyph />,
    },
    {
      title: 'We’re getting serious',
      desc: 'Before you say yes: the eleven conversations to have before the families do, and the one to open first.',
      go: onBeforeYes,
      glyph: <SeedGlyph />,
    },
    {
      title: 'The families are coming in',
      desc: 'The words for your family — the wali, hooyo, the mahr — written to be said aloud.',
      go: onFamilies,
      glyph: <PeopleGlyph />,
    },
  ]

  return (
    <div className="relative min-h-dvh bg-cream">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 pb-12 pt-safe-6">
        <BackButton onClick={onBack} className="self-start" />

        <main className="flex flex-1 flex-col justify-center py-10">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">Already talking to someone</p>
          <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
            Where are you with it?
          </h1>
          <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
            Three places to start. No account, and nothing here asks who they are.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {doors.map((d, i) => (
              <button
                key={d.title}
                onClick={d.go}
                style={{ animationDelay: `${i * 45}ms` }}
                className="animate-rise group flex w-full items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
              >
                <GlyphTile className="bg-forest/10 text-forest">{d.glyph}</GlyphTile>
                <span className="flex-1">
                  <span className="font-display text-[1.15rem] font-medium text-ink">{d.title}</span>
                  <span className="mt-0.5 block text-[0.88rem] leading-snug text-muted text-pretty">{d.desc}</span>
                </span>
                <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          <p className="mt-8 text-[0.92rem] text-muted">
            Not talking to anyone?{' '}
            <TextButton onClick={onLooking} className="text-[0.92rem] font-medium text-forest underline">
              Put your name down for an introduction
            </TextButton>
          </p>
        </main>
      </div>
    </div>
  )
}
