import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyDemoParams } from './demo'

/**
 * `?fresh` and `?demo` are the founder's presentation switches. They used to
 * run on any phone, from any link: `joinniyyah.com/?fresh`, sent by someone
 * who wanted her work gone, cleared everything she had written — and left the
 * kept code behind, so the next save wrote the emptied map over her kept one
 * (docs/ABUSE.md, sabotage). Nothing stripped the switch, so a reload did it
 * again. On the live site they now act only on a phone with nothing to lose.
 */

function install(search: string, hostname = 'joinniyyah.com') {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  })
  const replaced: string[] = []
  vi.stubGlobal('window', {
    location: { search, pathname: '/', hash: '', hostname },
    history: { replaceState: (_s: unknown, _t: string, url: string) => void replaced.push(url) },
  })
  return { store, replaced }
}

const MAP = JSON.stringify({ answers: { practice: 'consistent' }, completed: true })

afterEach(() => vi.unstubAllGlobals())

describe('the presentation switches', () => {
  let env: ReturnType<typeof install>
  beforeEach(() => {
    env = install('?fresh')
  })

  it('a ?fresh link does not touch a phone that holds a map', () => {
    env.store.set('niyyah.intake.v1', MAP)
    applyDemoParams()
    expect(env.store.get('niyyah.intake.v1')).toBe(MAP)
  })

  it('a ?demo link does not overwrite a phone whose map is only kept', () => {
    env = install('?demo')
    env.store.set('niyyah.keep.code.v1', 'HJKM47QR')
    applyDemoParams()
    expect(env.store.get('niyyah.intake.v1')).toBeUndefined()
  })

  it('is taken out of the address bar, so a reload cannot repeat it', () => {
    env.store.set('niyyah.intake.v1', MAP)
    applyDemoParams()
    expect(env.replaced).toEqual(['/'])
  })

  it('still seeds a phone with nothing on it', () => {
    env = install('?demo')
    applyDemoParams()
    expect(env.store.get('niyyah.intake.v1')).toContain('"completed":true')
  })

  it('runs as it always did on the founder’s own machine, and stays in the bar', () => {
    env = install('?demo', 'localhost')
    env.store.set('niyyah.intake.v1', MAP)
    applyDemoParams()
    expect(env.store.get('niyyah.intake.v1')).not.toBe(MAP)
    expect(env.replaced).toEqual([])
  })
})
