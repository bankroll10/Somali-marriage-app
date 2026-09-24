// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import ConfirmRestore from '../src/components/ConfirmRestore'
import type { PersistedState } from '../src/lib/storage'
import { mount } from './support/render'

/**
 * A `?map=` link asks before it replaces anything (docs/SECURITY.md, O2).
 *
 * It used to be applied on open: the phone's answers overwritten and the
 * link's code adopted as the phone's own, so anyone who could get her to tap
 * a link could read everything she wrote afterwards. That fetching never
 * adopts the code is src/lib/keep.test.ts's; this file holds the two ends.
 */

describe('the restore link', () => {
  it('asks before it writes, strips the code first, and does nothing with her own', () => {
    // The flow runs in src/main.tsx before React mounts, where no rendered
    // test reaches, so its shape is read from the source.
    const main = readFileSync(join(import.meta.dirname, '..', 'src', 'main.tsx'), 'utf8')
    expect(main).not.toMatch(/saveProgress\(/)
    expect(main).toMatch(/if \(mine\) adoptMap\(code, snapshot\)/)
    expect(main).toMatch(/entry\.code === rememberedCode\(\)\) return \{ entry: null \}/)
    expect(main).toMatch(/ownCode=\{rememberedCode\(\)\}/)
    const strip = main.indexOf("window.history.replaceState({}, '', window.location.pathname)")
    expect(strip).toBeGreaterThan(-1)
    expect(main.indexOf('await restoreMap(')).toBeGreaterThan(strip)
  })

  it('says a different code is someone else’s map, whatever name the sender wrote', async () => {
    // An ex keeps a map with her name and city in it (docs/ABUSE.md). The
    // phone's own code is the one fact he cannot set.
    const incoming = { identity: { firstName: 'Hodan' }, answers: {} } as unknown as PersistedState
    const theirs = await mount(<ConfirmRestore code="ACDEFGHJ" incoming={incoming} current={null} ownCode="KMNPQRST" onDone={() => {}} />)
    expect(theirs.text()).toMatch(/this one is someone else’s, whatever name it shows/)
    theirs.unmount()
    const mine = await mount(<ConfirmRestore code="ACDEFGHJ" incoming={incoming} current={null} ownCode="ACDEFGHJ" onDone={() => {}} />)
    expect(mine.text()).not.toMatch(/someone else’s, whatever name/)
    mine.unmount()
  })
})
