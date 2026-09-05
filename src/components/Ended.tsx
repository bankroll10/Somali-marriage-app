import { useState } from 'react'
import type { EndedRecord, Identity } from '../types'
import { endedReasons, type EndedReason } from '../data/ended'
import { Logo } from './ui'

interface Props {
  identity: Identity
  from: 'talking' | 'deciding'
  saved: EndedRecord | null
  onSave: (reason?: string, which?: string) => void
  onDone: () => void
}

/**
 * It ended.
 *
 * The one screen in the product that opens because something went wrong, and
 * so the one that has to be most careful about what it asks. It says first
 * that ending is allowed and is progress, because in this community it is
 * often neither said nor felt. Skip is the first button. One tap, from a list
 * we wrote; a second row only for the three reasons that name a thing. There
 * is no box. Nothing here can carry his name, and the footer says so on its
 * face rather than in a policy.
 */
export default function Ended({ identity, from, saved, onSave, onDone }: Props) {
  const gender = identity.gender ?? 'woman'
  const reasons = endedReasons(gender)
  const [reason, setReason] = useState<EndedReason | null>((saved?.reason as EndedReason) ?? null)
  const [which, setWhich] = useState<string | null>(saved?.which ?? null)
  const chosen = reasons.find((r) => r.id === reason)
  const other = gender === 'man' ? 'her' : 'him'

  function pick(id: EndedReason) {
    const next = id === reason ? null : id
    setReason(next)
    setWhich(null)
    onSave(next ?? undefined, undefined)
  }

  function pickWhich(id: string) {
    const next = id === which ? null : id
    setWhich(next)
    onSave(reason ?? undefined, next ?? undefined)
  }

  const chip = (selected: boolean) =>
    `rounded-full border px-3.5 py-2 text-[0.88rem] font-medium transition-all ${
      selected ? 'border-forest bg-forest text-cream' : 'border-line bg-white/60 text-ink-soft hover:border-forest/40 hover:bg-white'
    }`

  return (
    <div className="min-h-dvh bg-cream pb-20">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
          <button onClick={onDone} className="text-[0.85rem] font-medium text-muted underline-offset-4 hover:underline">
            Skip
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        <section className="animate-rise mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
            {from === 'deciding' ? 'You were deciding' : 'You were getting to know someone'}
          </p>
          <h1 className="mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
            It ended. That is allowed, and it is progress.
          </h1>
          <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
            Most people here will end one or two of these before the one that holds. Nothing you did
            here is lost — your map, your reads, what you learned about what you need. Take a breath.
          </p>
        </section>

        <section className="mt-8 rounded-card border border-line bg-white/60 p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">If you want to say</p>
          <p className="mt-2.5 font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink text-balance">
            What decided it?
          </p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted text-pretty">
            One tap, or none. Knowing why courtships end here is the only way we can hand the next
            person the right conversation earlier.
          </p>
          <div role="group" aria-label="What decided it" className="mt-4 flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button key={r.id} type="button" aria-pressed={reason === r.id} onClick={() => pick(r.id)} className={chip(reason === r.id)}>
                {r.label}
              </button>
            ))}
          </div>

          {chosen?.which && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="text-[0.9rem] font-medium text-ink">Which one?</p>
              <div role="group" aria-label="Which one" className="mt-3 flex flex-wrap gap-2">
                {chosen.which.map((w) => (
                  <button key={w.id} type="button" aria-pressed={which === w.id} onClick={() => pickWhich(w.id)} className={chip(which === w.id)}>
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-5 text-[0.82rem] leading-relaxed text-muted text-pretty">
            Nothing about {other} is recorded — no name, no number, nothing you wrote. If Count me is
            on, this reaches us as one of ten words, and never reaches {other}.
          </p>
        </section>

        <div className="mt-8 text-center">
          <button
            onClick={onDone}
            className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-[0.95rem] font-medium text-cream transition hover:bg-forest-deep"
          >
            {reason ? 'Done' : 'Skip for now'}
          </button>
        </div>
      </main>
    </div>
  )
}
