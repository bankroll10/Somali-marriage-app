import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Netlify treats *every* file in its functions and edge-functions directories
 * as something to deploy. There is no ignore list and nothing in the code says
 * so, which is why a `gate.test.ts` sitting next to `gate.ts` — the normal,
 * correct layout anywhere else — failed a deploy: Netlify tried to bundle the
 * test as an edge function and choked on its Vitest imports.
 *
 * Nothing in `npm run build` can catch that. `tsc -b && vite build` never
 * bundles edge functions; that happens only during a Netlify deploy, minutes
 * later, on a screen nobody is watching. So the rule is asserted here instead,
 * where it costs a second.
 */

const DEPLOY_DIRS = ['netlify/functions', 'netlify/edge-functions']

/** Anything Netlify would try to deploy but that isn't a real handler. */
const NOT_DEPLOYABLE = /(\.test\.|\.spec\.|^__tests__$|^__mocks__$|\.md$)/

describe('Netlify deploy directories hold only deployable code', () => {
  for (const dir of DEPLOY_DIRS) {
    it(`${dir} contains no test or support files`, () => {
      const path = join(process.cwd(), dir)
      if (!existsSync(path)) return

      const offenders = readdirSync(path).filter((name) => NOT_DEPLOYABLE.test(name))

      expect(
        offenders,
        `${dir} may only contain deployable handlers — Netlify bundles every ` +
          `file it finds there. Move these to tests/: ${offenders.join(', ')}`,
      ).toEqual([])
    })
  }

  it('the gate is still where netlify.toml expects it', () => {
    // A guard that passes because the file was deleted would be worse than none.
    expect(existsSync(join(process.cwd(), 'netlify/edge-functions/gate.ts'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'netlify/functions/guide.ts'))).toBe(true)
  })
})
