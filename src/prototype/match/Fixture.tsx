import type { ReactNode } from 'react'
import type { Fixture as FixtureResult } from './suggest'

/**
 * Where fixed text stands in for something a product might one day write.
 *
 * Every fixture in the prototype is drawn through this component, and nowhere
 * else, so a test can hold that none appears without its label
 * (tests/prototype/copy.test.ts). No model is called; the text is fixed, written
 * by hand for one sample scenario each.
 */
export function FixtureChip() {
  return (
    <span className="inline-flex items-center rounded-full border border-gold/60 bg-gold/10 px-2.5 py-0.5 text-[0.72rem] font-medium uppercase tracking-wide text-gold-ink">
      Prototype fixture
    </span>
  )
}

export function FixtureBlock({ title, id, result, children }: { title: string; id: string; result: FixtureResult; children: (text: Extract<FixtureResult, { available: true }>) => ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-dashed border-gold/60 bg-gold/[0.06] px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={id} className="font-display text-[1.05rem] font-medium text-ink">
          {title}
        </h3>
        <FixtureChip />
      </div>
      {result.available ? (
        <>
          <p className="mt-2 text-[0.82rem] leading-snug text-muted text-pretty">
            Fixed text written by hand for the sample scenario “{result.scenario === 'three' ? 'Three suggestions' : result.scenario === 'one' ? 'One suggestion' : 'No suggestions'}”. It stands in for what an AI model might write. No model was called.
          </p>
          <div className="mt-3">{children(result)}</div>
        </>
      ) : (
        <p className="mt-2 text-[0.9rem] leading-snug text-ink-soft text-pretty">
          {result.reason === 'edited'
            ? 'Unavailable. This fixed text was written for a sample scenario, and your answers no longer match it. A product would write a new one; here no model is called, so there is none.'
            : result.reason === 'no-scenario'
              ? 'Unavailable. Fixed text exists only for the sample scenarios, and you started with your own answers. Nothing is written for them, and no model is called.'
              : 'Unavailable. No fixed text was written for this person in this scenario.'}
        </p>
      )}
    </section>
  )
}
