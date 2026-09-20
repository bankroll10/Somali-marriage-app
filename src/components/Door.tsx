import { useEffect, useState } from 'react'
import type { Gender, Identity } from '../types'
import { countryFor, getScene, scenes } from '../data/scenes'
import { countries, getCountry } from '../data/countries'
import { hesitationOptions, type Hesitation } from '../data/hesitation'
import { cohortCount, opensWhen } from '../lib/cohort'
import { DoorCount, type CountState } from './Cohort'
import { ArrowRight, ScreenHeader, fieldClass } from './ui'

interface Props {
  identity: Identity
  /** A member with a map is sent to Home, where the door card already is. */
  hasMap: boolean
  onScene: (scene: string) => void
  onCountry: (country: string) => void
  /**
   * Which side of the door he is on.
   *
   * The door exists for the men's funnel (docs/MACHINE.md M1), and that
   * funnel is read as `sidesByVia.man.group.arrived` — the number A6 and
   * docs/REDTEAM.md's two-week kill test both turn on. But `arrived` fires
   * the moment the page loads, and until this question existed the door
   * asked for a city and never a side, so a man who read the number and left
   * was recorded `unsaid`. The cell therefore counted men who went on to
   * start a map, not men who arrived — collapsing the exact two things A6
   * was built to tell apart: the channel not working, and the map turning
   * men away. One tap, asked once, and Identity is pre-filled so it is not
   * asked twice. docs/ROADMAP.md.
   */
  onGender: (gender: Gender) => void
  /** Count me in: the map first, since being counted takes one. */
  onCount: () => void
  /** Not now, and why — one word about the door. */
  onHesitate: (reason: Hesitation) => void
  onBack: () => void
}

/**
 * The door, as a link: `/?door`.
 *
 * Every other link into Niyyah lands on an instrument — the read, the eleven,
 * the family words — and every one of them presumes the person is already
 * talking to someone. The man who was sent here because he is *looking* had
 * nowhere to land: "who are you reading?" is a question he cannot answer.
 * docs/MACHINE.md found that this, not any feature, was the weakest link in
 * the machine — the door opens at forty men, and no link started a man
 * towards it.
 *
 * So this screen shows him the number, honestly — his city today, and the
 * people across his country who would travel — and one way in: the map. It
 * asks nothing of him that the door card on Home does not ask of her, and it
 * records nothing of its own. An open is not a rung. If he walks on, the
 * ladder says `arrived` on a `door` via and nothing more; if he taps "not
 * now" and says why, one word from a list we wrote.
 */
export default function Door({
  identity,
  hasMap,
  onScene,
  onCountry,
  onGender,
  onCount,
  onHesitate,
  onBack,
}: Props) {
  const [scene, setScene] = useState(identity.scene ?? '')
  const [namedCountry, setNamedCountry] = useState(identity.country ?? '')
  const [count, setCount] = useState<CountState>('loading')
  const [hesitating, setHesitating] = useState<'closed' | 'open' | 'said'>('closed')

  const country = countryFor({ scene, country: identity.country }) ?? (scene === 'other' ? namedCountry : '')

  // The real number, read fresh. Never cached into a guess.
  useEffect(() => {
    if (!scene || !country) return
    let live = true
    setCount('loading')
    cohortCount(scene, country).then((c) => {
      // 'loading' and 'unreachable' are different sentences: this screen is
      // where a stranger from a mosque group lands, and it used to greet them
      // with "The count isn't reachable right now" while it was reading it
      // (docs/FAIL.md).
      if (live) setCount(c ?? 'unreachable')
    })
    return () => {
      live = false
    }
  }, [scene, country])

  const place = getScene(scene)
  const other = scene === 'other'
  const within = getCountry(country)?.within ?? 'your country'
  const city = place && !other ? place.label : 'Your city'
  const pool = other ? within : city

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">The door</p>
      </ScreenHeader>
      <main className="mx-auto max-w-xl px-6">
        <div className="py-10">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
            {place ? (other && country ? getCountry(country)?.label : place.label) : 'The first cities'}
          </p>
          <h1 className="animate-rise mt-2.5 font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            Nobody is introduced to anyone until both sides are here.
          </h1>
          {/* The condition, then where it stands — two paragraphs, because as
              one this was the longest block on the screen a stranger from a
              mosque group lands on (docs/LOAD.md). */}
          <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
            {opensWhen(scene && country ? pool : 'Each city')}
          </p>
          <p className="animate-rise mt-2.5 text-[0.98rem] leading-relaxed text-muted text-pretty">
            {scene && country ? (
              <DoorCount count={count} city={city} within={within} other={other} />
            ) : scene ? (
              'Say which country you’re in to see where it stands.'
            ) : (
              'Pick your city to see where it stands.'
            )}
          </p>

          <div className="mt-6 space-y-2.5">
            {!identity.gender && (
              <div>
                <p className="mb-2 text-[0.85rem] text-muted">You are…</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      { id: 'woman', label: 'A woman' },
                      { id: 'man', label: 'A man' },
                    ] as { id: Gender; label: string }[]
                  ).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onGender(o.id)}
                      className="rounded-card border border-line bg-white/60 px-4 py-3 text-[0.95rem] font-medium text-ink transition hover:border-forest/40 hover:bg-white"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!identity.scene && (
              <select
                value={scene}
                onChange={(e) => {
                  setScene(e.target.value)
                  setCount('loading')
                  if (e.target.value) onScene(e.target.value)
                }}
                aria-label="Your community"
                className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
              >
                <option value="">Where are you?</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            {other && !identity.country && (
              <select
                value={namedCountry}
                onChange={(e) => {
                  setNamedCountry(e.target.value)
                  setCount('loading')
                  if (e.target.value) onCountry(e.target.value)
                }}
                aria-label="Your country"
                className={`w-full bg-white/70 px-4 py-3 text-[0.98rem] ${fieldClass}`}
              >
                <option value="">Somewhere else in…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={onCount}
            className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-[0.92rem] font-medium text-cream transition hover:bg-forest-deep"
          >
            Count me in
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </button>
          {/* What joining costs, then what it does not do. One 67-word block
              under the only button on the screen (docs/LOAD.md); the same
              words, in the order a person needs them. */}
          <p className="mt-3 text-[0.85rem] leading-relaxed text-muted text-pretty">
            {hasMap
              ? 'Your map is already here — being counted is one step from Home.'
              : 'Being counted takes three answers — your practice, children, and what you won’t compromise on — kept under a code with no name on it, your age, and a way to reach you. No photos, no account. The rest of your map can wait.'}
          </p>
          {!hasMap && (
            <p className="mt-2 text-[0.85rem] leading-relaxed text-muted text-pretty">
              Nobody is introduced yet; if that changes here, this screen will say so, and the
              way to reach you goes to nobody else.
            </p>
          )}

          {/* The one no this product records — the same word, from the same
              list, as the door card on Home. docs/GAPS.md. */}
          {hesitating === 'closed' && (
            <button
              type="button"
              onClick={() => setHesitating('open')}
              className="mt-4 text-[0.82rem] font-medium text-muted underline-offset-4 hover:underline"
            >
              Not now
            </button>
          )}
          {hesitating === 'open' && (
            <div className="mt-4 rounded-card border border-line bg-white/60 p-4">
              <p className="text-[0.9rem] font-medium text-ink">That’s fine. Would you tell us why, in a word?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {hesitationOptions.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      onHesitate(h.id)
                      setHesitating('said')
                    }}
                    className="rounded-full border border-line bg-white/50 px-3.5 py-1.5 text-[0.85rem] font-medium text-ink-soft transition-all hover:border-forest/40 hover:bg-white"
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[0.78rem] leading-relaxed text-muted text-pretty">
                One word reaches us — why the door was hard to walk through — under a random code this phone
                made up for itself. Nothing else, and nothing about you.
              </p>
              <button
                type="button"
                onClick={() => setHesitating('closed')}
                className="mt-2 text-[0.8rem] font-medium text-muted underline-offset-4 hover:underline"
              >
                Skip
              </button>
            </div>
          )}
          {hesitating === 'said' && (
            <p className="mt-4 text-[0.85rem] text-muted text-pretty">Noted. The door stays open.</p>
          )}
        </div>
      </main>
    </div>
  )
}
