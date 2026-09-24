import { useState } from 'react'
import type { Gender, Stage } from '../types'
import { familyScripts } from '../data/families'
import { somali } from '../data/somali'
import { track } from '../lib/analytics'
import ScriptCard, { CheckBack } from './ScriptCard'
import { ArrowRight, ScreenHeader } from './ui'

interface Props {
  gender?: Gender
  stage: Stage
  /** She took the words for one of these — copied or sent them. Home will ask, days later, whether she had it. */
  onTaken: (id: string) => void
  /** Learned here when someone arrives on the bare link, before any words are shown. */
  onSetGender?: (g: Gender) => void
  onBack: () => void
}

/**
 * Bringing the families in.
 *
 * The conversations everyone dreads and nobody rehearses, word for word. All
 * of them are offered; none is ever recommended by anything the app has read.
 * Which one she needs, and when, is hers.
 */
export default function Families({ gender, stage, onTaken, onSetGender, onBack }: Props) {
  // Whose words these are. The bare link used to default to hers, so a man
  // who opened it was handed "Telling your wali you met him online".
  const [side, setSide] = useState<Gender | undefined>(gender)
  const scripts = side ? familyScripts(side, stage) : []
  const [open, setOpen] = useState<string | null>(null)
  const [taken, setTaken] = useState<Set<string>>(() => new Set())
  const intro = somali('families.intro')

  return (
    <div className="min-h-dvh bg-cream pb-16 pt-safe">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">Bringing the families in</p>
      </ScreenHeader>
      <main className="mx-auto max-w-xl px-6">
        <section className="py-8">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">Word for word</p>
          <h1 className="animate-rise mt-3 font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            {intro ? (
              <>
                <span lang="so">{intro.somali}</span> {intro.english}
              </>
            ) : (
              'The words you’ll need.'
            )}
          </h1>
          <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
            Nobody hands you these sentences. They are written to be said out loud by a real person,
            which is why they are a little long and a little awkward. Real ones are. Change anything
            that isn’t you.
          </p>
        </section>

        {!side && (
          <div className="animate-rise rounded-card border border-line bg-white/60 p-5">
            <p className="font-display text-[1.15rem] font-medium text-ink">Whose side are these words for?</p>
            <p className="mt-1 text-[0.88rem] text-muted text-pretty">
              A woman telling her wali and a man approaching her family need different sentences.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              {([{ id: 'woman' as Gender, label: 'Mine — I’m a woman' }, { id: 'man' as Gender, label: 'Mine — I’m a man' }]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSide(opt.id)
                    onSetGender?.(opt.id)
                  }}
                  className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 p-4 text-left text-[0.95rem] font-medium text-ink transition-all hover:border-forest/40"
                >
                  {opt.label}
                  <ArrowRight className="h-4 w-4 flex-none text-gold-ink" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {scripts.map((s) => {
            const isOpen = open === s.id
            return (
              <div key={s.id} className={`rounded-card border transition-colors ${isOpen ? 'border-forest/40 bg-white/70' : 'border-line bg-white/60'}`}>
                <button
                  onClick={() => {
                    setOpen(isOpen ? null : s.id)
                    if (!isOpen) track('family_script_opened', { id: s.id, stage })
                  }}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center gap-4 p-5 text-left"
                >
                  <span className="flex-1">
                    <span className="font-display text-[1.15rem] font-medium text-ink">{s.title}</span>
                    <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">{s.when}</span>
                  </span>
                  <ArrowRight className={`flex-none text-forest transition-transform ${isOpen ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    <ScriptCard
                      script={s.script}
                      title={s.title}
                      source={`families:${s.id}`}
                      travel="family"
                      onTaken={() => {
                        onTaken(s.id)
                        setTaken((prev) => new Set(prev).add(s.id))
                      }}
                    />
                    {taken.has(s.id) && <CheckBack what="you had that conversation" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-[0.8rem] leading-relaxed text-muted text-pretty">
          Nothing here is recommended by anything you told us. They are all offered; which one you need,
          and when, is yours to decide.
        </p>
      </main>
    </div>
  )
}
