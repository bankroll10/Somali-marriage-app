import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateReflection } from '../src/lib/reflection'
import type { Answers } from '../src/types'

/**
 * The Cinderella rule, asserted where it costs a second.
 *
 * Assume the AI hype is gone tomorrow, the dating-app fashions have moved on,
 * and no platform is handing out reach. What is left has to be the thing this
 * product was always for: Somali singles who want a compatible partner and a
 * marriage that lasts, reached without losing dignity, faith, time or peace.
 * Nothing in that sentence depends on a model.
 *
 * So the rule, in full — docs/DURABLE.md:
 *
 *   A model may add a layer on top of something the product already does
 *   completely without it. It may never be the thing that produces the map,
 *   the read, the eleven, the match or the door. With no key set, a member
 *   loses a better sentence — never an instrument.
 *
 * That is true today by construction, and nothing in `npm run build` would
 * notice the day it stopped being true. One import in the wrong file would do
 * it, and the failure would appear months later as an outage in the core of
 * the product on a screen nobody is watching. Hence these.
 */

const ROOTS = ['src', 'netlify']

/** The two files allowed to speak to a live model. Everything else is ours. */
const MAY_CALL_A_MODEL = ['netlify/functions/guide.ts', 'src/lib/coach.ts']

/**
 * The instruments. Each is a question about a marriage rather than a mechanic
 * of an app, and each must run with the network off entirely.
 */
const INSTRUMENTS = [
  'src/lib/read.ts',
  'src/lib/beforeYes.ts',
  'src/lib/reflection.ts',
  'src/lib/rungs.ts',
  'src/lib/facts.ts',
  'src/lib/words.ts',
]

/** Live-model code, as opposed to prose that mentions one. */
const LIVE_MODEL: [RegExp, string][] = [
  [/ANTHROPIC_API_KEY/, 'reads the model key'],
  [/api\.anthropic\.com/, 'calls the model host'],
  [/x-api-key/i, 'sends a model key'],
  [/anthropic-version/, 'speaks the model protocol'],
  [/claude-[a-z]+-\d/, 'pins a model id'],
]

/**
 * Comments may discuss the model freely — Trust.tsx names Anthropic to a
 * member on purpose, and that disclosure is the honest thing. What must not
 * spread is code. Only whole-line `//` comments are stripped, so a URL sitting
 * inside a string is never mistaken for one.
 */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sources(full, out)
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

const repoPath = (file: string) => relative(process.cwd(), file).split('\\').join('/')
const read = (file: string) => code(readFileSync(join(process.cwd(), file), 'utf8'))

/** The seeded demo member — the same answers as src/lib/reflection.test.ts. */
const answers: Answers = {
  timeline: '1-2',
  'why-now': 'ready',
  practice: 'consistent',
  'faith-role': 4,
  'family-role': 'guided',
  children: 'want',
  'value-most': ['kindness', 'deen-char', 'emotional'],
  dealbreakers: ['honesty', 'faith-nn', 'respect'],
  conflict: 'space',
  healing: 'healing',
  attachment: 'secure',
  pattern: 'walls',
  'working-on': 'ask for help instead of carrying everything alone',
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('the product survives its suppliers', () => {
  it('the live model lives in two files, and nowhere else', () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of sources(join(process.cwd(), root))) {
        const path = repoPath(file)
        if (MAY_CALL_A_MODEL.includes(path)) continue
        const body = code(readFileSync(file, 'utf8'))
        for (const [pattern, what] of LIVE_MODEL) {
          if (pattern.test(body)) offenders.push(`${path} — ${what}`)
        }
      }
    }
    expect(
      offenders,
      'A model may add to what this product already does; it may never be what ' +
        'produces it. Live-model code belongs in netlify/functions/guide.ts and ' +
        'src/lib/coach.ts, which have a complete local voice behind them. See ' +
        `docs/DURABLE.md. Found: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('every instrument is pure — the read, the eleven, the map, the ladder, the words', () => {
    for (const file of INSTRUMENTS) {
      const body = read(file)
      expect(body, `${file} must not reach the network — an instrument that needs a server is not an instrument`)
        .not.toMatch(/\bfetch\s*\(/)
      for (const [pattern] of LIVE_MODEL) {
        expect(pattern.test(body), `${file} must not depend on a model`).toBe(false)
      }
    }
  })

  it('the map builds with no network at all', async () => {
    // The map is the durable asset: it is what gets matched, and it is computed
    // on her own device from a question set that is ours. docs/PRODUCT.md once
    // planned to put a model behind it; docs/DURABLE.md declines, and this is
    // the assertion that keeps it declined.
    vi.stubGlobal('fetch', () => {
      throw new Error('the map must never need the network')
    })
    vi.useFakeTimers()
    const pending = generateReflection(answers)
    await vi.advanceTimersByTimeAsync(2000)
    const reflection = await pending

    // A whole map, from her answers alone: the seven grounds read, the summary
    // written, the non-negotiables carried through.
    expect(reflection.dimensions.length).toBeGreaterThan(0)
    expect(reflection.headline).toBeTruthy()
    expect(reflection.summary).toBeTruthy()
    expect(reflection.nonNegotiables).toHaveLength(3)
  })

  it('every link carries an address we own', () => {
    // Links do not come back to be corrected. Whatever address they carry is
    // the address they carry for ever, so it has to be one that DNS can move —
    // never a subdomain a supplier can reclaim, rename, or take with them.
    // docs/CONTROL.md ranks this first of every dependency; docs/OWNED.md is
    // why it is the difference between renting and owning.
    const site = readFileSync(join(process.cwd(), 'src/lib/site.ts'), 'utf8')
    const host = site.match(/DEFAULT_SITE_HOST = '([^']+)'/)?.[1]
    expect(host, 'src/lib/site.ts must export a DEFAULT_SITE_HOST literal').toBeTruthy()

    const LANDLORDS = /\.(netlify\.app|vercel\.app|github\.io|pages\.dev|herokuapp\.com|web\.app|firebaseapp\.com|onrender\.com)$/
    expect(
      LANDLORDS.test(host!),
      `the default address is ${host}, which belongs to a platform rather than ` +
        'to us. Every link ever sent would die with that account and there is ' +
        'no DNS to repoint. Use a domain we own — see docs/OWNED.md',
    ).toBe(false)

    // And the address a member writes to should live on the same owned domain,
    // not on a free consumer mail account.
    const email = site.match(/VITE_CONTACT_EMAIL \|\| '([^']+)'/)?.[1]
    expect(email, 'src/lib/site.ts must default CONTACT_EMAIL').toBeTruthy()
    expect(email!.split('@')[1], 'the contact address belongs on the domain we own').toBe(host)
  })

  it('sharing is the platform’s own sheet, not a vendor’s SDK', () => {
    // Distribution that depends on one platform's reach is rented. The share
    // sheet is a browser API: it works with whatever apps the person has, and
    // it will outlive every one of them.
    const share = read('src/lib/share.ts')
    expect(share).toContain('navigator.share')
    expect(share, 'sharing must name no third-party host — see docs/CONTROL.md').not.toMatch(
      /https?:\/\/(?!localhost)/,
    )
  })
})
