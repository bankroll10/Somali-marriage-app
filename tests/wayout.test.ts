import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every screen has a way out, and every way out goes where its label says.
 *
 * `docs/PROTOCOL.md` counts two of these as bugs rather than preferences: "a
 * tap that does nothing, or does the wrong thing", and "a back button that
 * lands somewhere other than where they came from". The four link-entry
 * screens — the ones reached from someone else's phone, which is why nobody
 * walked them — broke both (docs/PLACE.md).
 *
 * Read from the source, because this repository has no jsdom and no component
 * tests. Crude on purpose: a count per file, so a new phase that forgets its
 * exit shows up as a number that stopped matching.
 */

const SRC = join(import.meta.dirname, '..', 'src')
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')

describe('the screens a stranger arrives on', () => {
  it('send someone back to their own space, not to the marketing page', () => {
    // `backHome` is `hasHome ? 'home' : 'welcome'`, so it is right for the
    // relative who has never been here *and* for the woman who opened her own
    // link. Hard-coding 'welcome' was only ever right for the first of them,
    // under a button that reads "Back to your space".
    const app = read('App.tsx')
    expect(app).toMatch(/onHome=\{backHome\}/)
    expect(app).toMatch(/onDone=\{backHome\}/)

    // Identity's Back is the one legitimate hard-coding: it is the front door,
    // and nobody standing on it has a Home yet.
    const hard = [...app.matchAll(/setScreen\('welcome'\)/g)]
    expect(hard).toHaveLength(1)
    expect(app).toMatch(/<Identity[\s\S]{0,400}onBack=\{\(\) => n\.setScreen\('welcome'\)\}/)
  })

  it('offer a way out of every phase, including the ones that ask for something', () => {
    // Couple: dead · yours-intro · his-intro · answered-already · joint.
    // Vouch: form · done · already · dead. Every branch that renders an <h1>
    // also renders an exit, so none of them is terminal.
    const couple = read('components/Couple.tsx')
    const vouch = read('components/Vouch.tsx')

    // The prop, the destructure, and one call per phase that can strand you.
    expect([...couple.matchAll(/onHome/g)]).toHaveLength(6)
    expect([...vouch.matchAll(/onDone/g)]).toHaveLength(6)

    // The two that had no control at all: his intro, beside Start, and the
    // answered-already branch that came back without a joint sheet.
    expect(couple).toMatch(/Start\b[\s\S]{0,600}onClick=\{onHome\}/)
    expect(couple).toMatch(/Nothing more to do here[\s\S]{0,300}onClick=\{onHome\}/)

    // The vouch form: the exit sits after the disclosure, not before the ask.
    expect(vouch).toMatch(/seen only by the founder[\s\S]{0,600}onClick=\{onDone\}/)
  })

  it('let go of the guide in one tap', () => {
    // A left chevron in a header position is Back on every other screen. Here
    // it switched voice — the third control doing so, while the one thing the
    // screen did not offer was a way out.
    const coach = read('components/Coach.tsx')
    expect(coach).toMatch(/<BackButton onClick=\{onBack\} \/>/)
    expect(coach).not.toMatch(/label="Switch guide"/)

    // Switching keeps the two controls it already had: the header pill and the
    // inline link under the routing note.
    expect([...coach.matchAll(/setMode\(null\)/g)].length).toBeGreaterThanOrEqual(2)
  })
})
