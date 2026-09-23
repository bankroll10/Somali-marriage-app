import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A `?map=` link asks before it replaces anything (docs/SECURITY.md, O2).
 *
 * It used to be applied on open: the phone's answers overwritten and the
 * link's code adopted as the phone's own, so anyone who could get her to tap
 * a link could read everything she wrote afterwards. The flow lives in
 * src/main.tsx, before React mounts, so these pin its shape; the Chromium walk
 * in docs/SECURITY.md is what showed it working.
 */

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
const keep = readFileSync(new URL('../src/lib/keep.ts', import.meta.url), 'utf8')

describe('the restore link', () => {
  it('never writes a fetched map into storage without asking', () => {
    expect(main).not.toMatch(/saveProgress\(/)
    expect(main).toMatch(/if \(mine\) adoptMap\(code, snapshot\)/)
    expect(main).toMatch(/import\('\.\/components\/ConfirmRestore\.tsx'\)/)
  })

  it('fetching a map does not make its code this phone’s own', () => {
    const detail = keep.slice(keep.indexOf('export async function restoreDetail'), keep.indexOf('export function adoptMap'))
    expect(detail).not.toMatch(/rememberCode\(/)
  })

  it('her own link on her own phone brings nothing back — the phone is newer', () => {
    expect(main).toMatch(/entry\.code === rememberedCode\(\)\) return \{ entry: null \}/)
  })

  it('strips the code from the bar before any round trip', () => {
    const strip = main.indexOf("window.history.replaceState({}, '', window.location.pathname)")
    const fetch = main.indexOf('await restoreMap(')
    expect(strip).toBeGreaterThan(-1)
    expect(fetch).toBeGreaterThan(strip)
  })
})
