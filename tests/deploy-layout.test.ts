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

  it('netlify/functions holds exactly the handlers, and shared code stays out of it', () => {
    // Every top-level file in the functions directory becomes a deployed
    // function with its own URL. A helper module dropped in here by mistake
    // would deploy as an endpoint that answers nothing — or worse, one that
    // answers. Shared code lives in netlify/shared, which Netlify never scans.
    const functions = readdirSync(join(process.cwd(), 'netlify/functions')).sort()
    expect(functions).toEqual(['cohort.ts', 'couple.ts', 'export.ts', 'guide.ts', 'health.ts', 'keep.ts', 'pool.ts', 'progress.ts', 'safety.ts', 'sweep.ts', 'vouch.ts'])
    expect(existsSync(join(process.cwd(), 'netlify/shared/founder.ts'))).toBe(true)
  })

  it('the hostname is a setting, and index.html carries none of its own', () => {
    // The host belongs to Netlify, not to us, and it is baked into every link
    // ever sent to another person. It has to be one variable, and the two
    // files that resolve it have to agree — see src/lib/site.ts.
    const site = readFileSync(join(process.cwd(), 'src/lib/site.ts'), 'utf8')
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')
    const host = site.match(/DEFAULT_SITE_HOST = '([^']+)'/)?.[1]
    expect(host, 'src/lib/site.ts must export a DEFAULT_SITE_HOST literal').toBeTruthy()
    expect(config).toContain(`const DEFAULT_SITE_HOST = '${host}'`)

    // The build writes the host into the social-card tags; the file itself
    // names no host, so a domain change never means editing HTML.
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(html).not.toContain(host!)
    expect(html).toContain('%SITE_HOST%')
  })

  it('the browser contacts nobody but us — the fonts are ours', () => {
    // Google Fonts was the only third-party origin the app ever touched, which
    // meant Google saw the IP of everyone who opened a Somali marriage app.
    // See the note at the top of src/index.css.
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8')
    // Comments may name Google — the one at the top of index.css explains why
    // it is gone. What must not appear is a reference the browser would follow.
    const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    for (const source of [html, css]) {
      expect(code(source)).not.toContain('fonts.googleapis.com')
      expect(code(source)).not.toContain('fonts.gstatic.com')
    }

    // Every @font-face points at a file that is actually in the repository.
    const faces = [...css.matchAll(/url\('([^']+\.woff2)'\)/g)].map((m) => m[1])
    expect(faces.length, 'src/index.css must declare the self-hosted faces').toBeGreaterThan(0)
    for (const rel of faces) {
      expect(existsSync(join(process.cwd(), 'src', rel.replace(/^\.\//, ''))), `missing font: ${rel}`).toBe(true)
    }
    // The licence travels with the files, as the OFL requires.
    expect(existsSync(join(process.cwd(), 'src/assets/fonts/LICENSE.md'))).toBe(true)
  })

  it('the tests run before main deploys, on a node that matches the deploy', () => {
    // main auto-deploys on merge, so the gate has to be in the repository
    // rather than in whoever remembered to look. See docs/CONTROL.md.
    const workflow = join(process.cwd(), '.github/workflows/verify.yml')
    expect(existsSync(workflow), 'the verify workflow must exist').toBe(true)
    const yml = readFileSync(workflow, 'utf8')
    expect(yml).toContain('npm run verify')
    expect(yml).toMatch(/pull_request/)
    expect(yml).toMatch(/branches: \[main\]/)

    // A CI node older than the deploy node would pass here and fail there.
    const toml = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf8')
    const deployNode = toml.match(/NODE_VERSION = "(\d+)"/)?.[1]
    expect(deployNode, 'netlify.toml must pin NODE_VERSION').toBeTruthy()
    expect(yml).toContain(`node-version: '${deployNode}'`)
  })

  it('after a push to main, something asks the live site whether it landed', () => {
    // A failed Netlify build leaves the last good deploy live and says so only
    // in Netlify's dashboard (docs/OPS.md). The build writes the commit to
    // /version.json; the workflow waits for the site to say this one.
    const yml = readFileSync(join(process.cwd(), '.github/workflows/deployed.yml'), 'utf8')
    expect(yml).toMatch(/branches: \[main\]/)
    expect(yml).toContain('version.json')
    expect(yml).toContain('github.sha')
    expect(readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')).toMatch(/fileName: 'version\.json'[\s\S]*COMMIT_REF/)
  })

  it('the gate is still where netlify.toml expects it', () => {
    // A guard that passes because the file was deleted would be worse than none.
    expect(existsSync(join(process.cwd(), 'netlify/edge-functions/gate.ts'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'netlify/functions/guide.ts'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'netlify/functions/couple.ts'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'netlify/functions/vouch.ts'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'netlify/functions/progress.ts'))).toBe(true)
  })

  it('the site can be found, and says so in one voice', () => {
    // For six days the domain answered a search with "No information is
    // available for this page": robots.txt disallowed everything, so the
    // crawler never read the noindex header meant to hide it, so the URL
    // stayed listed with nothing under it. The two settings cancelled and the
    // result looked like a broken site at exactly the moment the first links
    // were about to be handed to strangers (docs/BOARD.md, the search pass).
    //
    // Both are gone. This holds them gone, because the way back is a
    // one-line "just while we test" that nobody remembers to remove.
    // Comments stripped first: netlify.toml explains at length why the header
    // is absent, and naming the thing you removed must not read as setting it.
    const config = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n')
    expect(config, 'netlify.toml must not send noindex — see docs/DEPLOY.md').not.toMatch(/X-Robots-Tag/i)
    expect(config).not.toMatch(/noindex/i)

    // A file here would shadow the generated one and could disagree with it.
    expect(
      existsSync(join(process.cwd(), 'public/robots.txt')),
      'robots.txt is written by vite.config.ts so it carries the same host as every link',
    ).toBe(false)

    const vite = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')
    for (const name of ['robots.txt', 'sitemap.xml']) {
      expect(vite, `vite.config.ts must emit ${name}`).toContain(`fileName: '${name}'`)
    }

    // Every path serves index.html, so without this each ?read, ?eleven and
    // ?via= link posted into a group chat is a separate thin result.
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('<link rel="canonical" href="https://%SITE_HOST%/" />')
  })
})
