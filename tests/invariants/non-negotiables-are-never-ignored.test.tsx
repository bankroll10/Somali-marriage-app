// @vitest-environment happy-dom
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { allQuestions } from '../../src/data/intake'
import { candidatesFor, type Candidate } from '../../src/data/candidates'
import { alignment } from '../../src/lib/matching'
import { buildReflection } from '../../src/lib/reflection'
import SampleIntroduction from '../../src/components/SampleIntroduction'
import { blocked } from '../../netlify/shared/gate'
import { eligible } from '../../netlify/functions/pool'
import { gender, intake } from '../support/arbitrary'
import { mount } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — what she said she will not compromise on is never silently
 * ignored (docs/TESTING.md, docs/ALIGNMENT.md).
 *
 * Every non-negotiable is one of two things: a gate, checked the same way on
 * her phone and on the server, that keeps a plain contradiction from ever
 * being introduced; or a question, handed to her as the first thing to ask.
 * The failure this guards is quiet: an option added to the intake that
 * neither gates nor asks would be stored, shown back on her Profile, and
 * acted on nowhere — and every example-based test would still pass.
 */

const dealbreakers = allQuestions.find((q) => q.id === 'dealbreakers')!.options!.map((o) => o.id)

const PRACTICE = ['devout', 'consistent', 'returning', 'cultural'] as const
const CHILDREN = ['want', 'open', 'unsure', 'no'] as const

const base: Candidate = {
  id: 'x', name: 'X', age: 30, gender: 'man', scene: 'twin-cities', occupation: '', practice: 'consistent', faithRole: 4,
  timeline: '1-2', familyRole: 'guided', children: 'want', household: 'near-family', work: 'both', moneyHome: 'some',
  values: [], bio: '', prompts: [],
}

/** Someone on the other side, as far as the two checkable gates can see him. */
const other = fc.record({
  practice: fc.constantFrom(...PRACTICE),
  children: fc.constantFrom(...CHILDREN),
  nn: fc.subarray(dealbreakers),
  age: fc.integer({ min: 18, max: 60 }),
})

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => vi.unstubAllGlobals())

describe('every non-negotiable is handled', () => {
  it.each(dealbreakers)('%s is a gate some answer trips, or a question she is handed', (id) => {
    const gates = PRACTICE.some((practice) =>
      CHILDREN.some((his) => CHILDREN.some((hers) => blocked([id], { children: hers }, { practice, children: his }) !== null)),
    )
    const asks = alignment({ dealbreakers: [id] }, base).ask.startsWith('You said')
    expect(gates || asks, `${id} neither gates nor asks — it would be stored and ignored`).toBe(true)
  })
})

describe('the gate is the same gate everywhere', () => {
  it('her phone and the server agree on every pair', () => {
    fc.assert(
      fc.property(intake, other, (hers, him) => {
        const nn = Array.isArray(hers.dealbreakers) ? (hers.dealbreakers as string[]) : []
        const client = alignment(hers as never, { ...base, practice: him.practice, children: him.children }).blocked !== null
        const server = blocked(nn, hers, him) !== null
        expect(client).toBe(server)
      }),
      { numRuns: 500 },
    )
  })

  it('a pair either side has blocked is never counted as introducible', () => {
    fc.assert(
      fc.property(other, other, (w, m) => {
        const either = blocked(w.nn, w, m) !== null || blocked(m.nn, m, w) !== null
        if (either) expect(eligible(w as never, m as never)).toBe(false)
      }),
      { numRuns: 500 },
    )
  })

  it('every one she chose is on the list her Profile shows her — none dropped', () => {
    fc.assert(
      fc.property(fc.subarray(dealbreakers), (chosen) => {
        expect(buildReflection({ dealbreakers: chosen }).nonNegotiables).toHaveLength(chosen.length)
      }),
    )
  })
})

describe('the sample she is shown never contradicts her', () => {
  it('whatever she answered, the person on screen passes her gates — or nobody is shown', async () => {
    let seen = 0
    await fc.assert(
      fc.asyncProperty(intake, gender, async (answers, g) => {
        const pool = candidatesFor(g)
        const m = await mount(
          <SampleIntroduction
            identity={{ gender: g, scene: 'twin-cities' }}
            answers={answers as never}
            waitlist={null}
            onJoinWaitlist={() => {}}
            onAnswer={() => {}}
            onBack={() => {}}
          />,
        )
        const shown = pool.find((c) => m.container.querySelector('h2')?.textContent?.startsWith(`${c.name},`))
        if (shown) {
          seen += 1
          expect(alignment(answers as never, shown).blocked).toBeNull()
        }
        else expect(pool.every((c) => alignment(answers as never, c).blocked !== null)).toBe(true)
        m.unmount()
      }),
      { numRuns: 25 },
    )
    // Not vacuous: a person was on screen for most of them.
    expect(seen).toBeGreaterThan(10)
  })
})
