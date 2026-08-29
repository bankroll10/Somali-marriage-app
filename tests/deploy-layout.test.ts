import { readdirSync, existsSync, readFileSync } from 'node:fs'
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

  it('the form registry declares every field the app actually sends', () => {
    // Netlify silently drops fields public/__forms.html does not declare: no
    // error in the app, no column in the dashboard, no way to tell from either
    // side. That file IS the form's schema, so it has to move whenever the
    // payload does — and this reads the payload from the source rather than
    // repeating it, so the two cannot drift apart unnoticed.
    const source = readFileSync(join(process.cwd(), 'src/lib/waitlist.ts'), 'utf8')
    const registry = readFileSync(join(process.cwd(), 'public/__forms.html'), 'utf8')

    const sent = [...source.matchAll(/body\.set\(\s*'([^']+)'/g)]
      .map((m) => m[1])
      .filter((f) => f !== 'form-name')

    expect(sent.length, 'no body.set() calls found — did waitlist.ts change shape?')
      .toBeGreaterThan(0)
    for (const field of sent) {
      expect(registry, `public/__forms.html is missing name="${field}"`).toContain(
        `name="${field}"`,
      )
    }
  })

  it('the gate is still where netlify.toml expects it', () => {
    // A guard that passes because the file was deleted would be worse than none.
    expect(existsSync(join(process.cwd(), 'netlify/edge-functions/gate.ts'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'netlify/functions/guide.ts'))).toBe(true)
  })
})
