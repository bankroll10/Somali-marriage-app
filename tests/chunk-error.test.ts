import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from '../src/lib/chunkError'

describe('a screen that never reached the phone', () => {
  it('is recognised in every engine’s own words', () => {
    // Chromium, Firefox, Safari, and Vite's preload helper.
    for (const message of [
      'Failed to fetch dynamically imported module: https://joinniyyah.com/assets/Door-abc.js',
      'error loading dynamically imported module: https://joinniyyah.com/assets/Door-abc.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/Door-abc.css',
    ]) {
      expect(isChunkLoadError(new TypeError(message)), message).toBe(true)
    }
  })

  it('is not mistaken for a render error — those still get the full recovery screen', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'answers')"))).toBe(false)
    expect(isChunkLoadError(new Error('Minified React error #31'))).toBe(false)
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })

  // docs/SECURITY.md, T18: a dropped signal used to land on a screen whose second
  // button erased every key on the phone, the kept-map code included.
  it('is never offered a button that erases her data', () => {
    const boundary = readFileSync('src/components/ErrorBoundary.tsx', 'utf8')
    const chunkBranch = boundary.slice(boundary.indexOf('if (isChunkLoadError('), boundary.indexOf('return (\n      <div role="alert"', boundary.indexOf('if (isChunkLoadError(') + 40))
    expect(chunkBranch).toContain('window.location.reload()')
    expect(chunkBranch).not.toContain('clearEverything')
    expect(chunkBranch).toContain('role="alert"')
  })
})
