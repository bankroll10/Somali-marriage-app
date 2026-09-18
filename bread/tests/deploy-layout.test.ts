import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Netlify bundles every file in netlify/functions as a function. Tests and
 * helpers live in tests/ and netlify/lib for that reason; this keeps it so.
 */
describe('deploy layout', () => {
  it('netlify/functions holds only handlers', () => {
    const offenders = readdirSync(join(process.cwd(), 'netlify/functions')).filter((n) => /(\.test\.|\.spec\.|\.md$|^_)/.test(n))
    expect(offenders).toEqual([])
  })
  it('every endpoint the app calls exists', () => {
    for (const fn of ['availability', 'checkout', 'stripe-webhook', 'order', 'cancel', 'admin']) {
      expect(existsSync(join(process.cwd(), `netlify/functions/${fn}.ts`)), fn).toBe(true)
    }
  })
})
