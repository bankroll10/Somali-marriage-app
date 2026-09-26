// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import Ended from '../../src/components/Ended'
import { mount, type Mounted } from '../support/render'

/**
 * Autonomy, red-teamed (docs/DECISIONS.md Part 16).
 *
 * The moment a courtship ends is the one research names as the most dangerous
 * with a controlling partner (docs/RESEARCH.md row 16). The screen that opens
 * then carries the line and the number, said as an "if", to everyone — and it
 * still decides nothing for her.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

describe('the ended screen does not leave her alone with it', () => {
  it('offers one person and the emergency number, from either stage, and never a verdict', async () => {
    for (const from of ['talking', 'deciding'] as const) {
      screen = await mount(<Ended identity={{ firstName: 'Hodan', gender: 'woman', adult: true }} from={from} saved={null} onSave={() => {}} onDone={() => {}} />)
      const text = screen.text()
      expect(text, from).toMatch(/If ending it did not feel safe/)
      expect(text, from).toMatch(/Tell one person who knows you today/)
      expect(text, from).toMatch(/If you are in danger now, call/)
      expect(text, from).not.toMatch(/\bleave him\b|\byou should\b|\bgood riddance\b|\bwell done\b/i)
      screen.unmount()
      screen = undefined
    }
  })

  it('says it to a man too, about her', async () => {
    screen = await mount(<Ended identity={{ firstName: 'Ayaan', gender: 'man', adult: true }} from="talking" saved={null} onSave={() => {}} onDone={() => {}} />)
    expect(screen.text()).toMatch(/if she has not accepted it, or you are careful what you say to her/)
  })
})
