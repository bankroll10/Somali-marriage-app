import { useState } from 'react'
import type { Identity, Stage } from '../types'
import { stages } from '../data/stages'
import { countryFor, scenes } from '../data/scenes'
import { countries, getCountry } from '../data/countries'
import { reachOptions } from '../data/reach'
import { speak } from '../data/read'
import { somali } from '../data/somali'
import { ArrowRight, BackButton, Button } from './ui'

interface Props {
  identity: Identity
  onChoose: (stage: Stage) => void
  onScene: (scene: string) => void
  /** Her country when she is somewhere else, and how far she would go. */
  onChangeIdentity: (updater: (prev: Identity) => Identity) => void
  onBack: () => void
}

const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition-all ${
    on ? 'border-forest bg-forest text-cream' : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
  }`

/**
 * What's happening right now?
 *
 * Muzz asks sect, prayer frequency, an ethnicity filter and photos. Family asks
 * which family he is from. We ask, after her name and gender, one question in
 * her own words — and the answer decides where we start. A woman who is already
 * talking to someone does not need sixteen questions about herself before we
 * will help her with tonight; that toll gate is where both of the two real
 * people who ever opened the intake stopped (src/data/intake.ts — n = 2).
 *
 * The line she reads after choosing is the sentence test: something no
 * alternative in the category would think to say.
 */
export default function Situation({ identity, onChoose, onScene, onChangeIdentity, onBack }: Props) {
  const [chosen, setChosen] = useState<Stage | null>(null)
  const say = speak(identity.gender ?? 'woman')
  const st = stages.find((s) => s.id === chosen)
  const somaliLine = chosen ? somali(`situation.${chosen}`) : null
  const within = getCountry(countryFor(identity))?.within

  return (
    <div className="relative min-h-dvh bg-cream">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 pb-12 pt-safe-6">
        <BackButton onClick={chosen ? () => setChosen(null) : onBack} className="self-start" />

        <main className="flex flex-1 flex-col justify-center py-10">
          {!st ? (
            <>
              <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">Where you are</p>
              <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
                What’s happening right now?
              </h1>
              <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
                Four honest answers. Yours decides where we start — not where an app thinks you should.
              </p>
              <div className="mt-8 flex flex-col gap-2.5">
                {stages.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setChosen(s.id)}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className="animate-rise flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white/50 p-4 text-left text-[0.98rem] font-medium text-ink transition-all duration-200 hover:border-forest/40 hover:bg-white"
                  >
                    {s.situation}
                    <ArrowRight className="h-4 w-4 flex-none text-gold-ink" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="animate-rise">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">Where you are</p>
              <h1 className="mt-4 font-display text-[1.7rem] font-medium leading-snug tracking-tight text-ink text-balance">
                {st.situation}.
              </h1>

              <div className="mt-6 rounded-card border border-gold/25 bg-gold/[0.07] p-6">
                {somaliLine && (
                  <p className="mb-2 font-display text-[1.1rem] font-medium text-ink text-pretty">
                    <span lang="so">{somaliLine.somali}</span> {somaliLine.english}
                  </p>
                )}
                <p className="text-[1.05rem] leading-relaxed text-ink-soft text-pretty">{say(st.arrival)}</p>
              </div>

              {/* One tap, optional: the city. It is a belonging signal, not a form
                  field — the note under each is the point. */}
              <div className="mt-7">
                <p id="situation-scene-label" className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Where are you? <span className="normal-case tracking-normal">(optional)</span>
                </p>
                <div role="group" aria-labelledby="situation-scene-label" className="mt-3 flex flex-wrap gap-2">
                  {scenes.map((sc) => {
                    const on = identity.scene === sc.id
                    return (
                      <button key={sc.id} type="button" onClick={() => onScene(sc.id)} aria-pressed={on} className={chip(on)}>
                        {sc.label}
                      </button>
                    )
                  })}
                </div>
                {identity.scene && (
                  <p className="mt-2.5 text-[0.85rem] text-muted">
                    {scenes.find((sc) => sc.id === identity.scene)?.note}
                  </p>
                )}

                {/* Somewhere else is not a city, so it has no country of its
                    own. One more tap, and she is counted with her country. */}
                {identity.scene === 'other' && (
                  <div className="mt-5">
                    <p id="situation-country-label" className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                      Somewhere else in… <span className="normal-case tracking-normal">(optional)</span>
                    </p>
                    <div role="group" aria-labelledby="situation-country-label" className="mt-3 flex flex-wrap gap-2">
                      {countries.map((c) => {
                        const on = identity.country === c.id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => onChangeIdentity((prev) => ({ ...prev, country: c.id }))}
                            aria-pressed={on}
                            className={chip(on)}
                          >
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* How far she would go. Asked, never inferred; left blank it
                    means her city. See src/data/reach.ts. */}
                {identity.scene && (
                  <div className="mt-5">
                    <p id="situation-reach-label" className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                      How far would you go for the right person? <span className="normal-case tracking-normal">(optional)</span>
                    </p>
                    <div role="group" aria-labelledby="situation-reach-label" className="mt-3 flex flex-wrap gap-2">
                      {reachOptions(within).map((r) => {
                        const on = identity.reach === r.id
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => onChangeIdentity((prev) => ({ ...prev, reach: r.id }))}
                            aria-pressed={on}
                            className={chip(on)}
                          >
                            {r.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <Button onClick={() => onChoose(st.id)} className="group">
                  Continue
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
              <button
                onClick={() => setChosen(null)}
                className="mt-4 text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
              >
                Actually, it’s something else
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
