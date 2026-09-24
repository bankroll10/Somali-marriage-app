import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The abuse cases in docs/ABUSE.md that a server can answer, each written
 * against the code before it was fixed and watched fail.
 */

const stores = new Map<string, Map<string, string>>()
function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, string>()
  stores.set(name, m)
  return {
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: 'x' })),
      directories: [],
    }),
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    getMetadata: async (key: string) => (m.has(key) ? { etag: m.get(key)!, metadata: {} } : null),
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      if (v === null) return null
      return { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: v, metadata: {} }
    },
    set: async (key: string, value: string) => {
      m.set(key, value)
      return { modified: true }
    },
    setJSON: async (key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
      m.set(key, JSON.stringify(value))
      return { modified: true }
    },
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))

const { default: safety } = await import('../netlify/functions/safety')
const { default: couple } = await import('../netlify/functions/couple')
const { default: keep } = await import('../netlify/functions/keep')
const { default: cohort } = await import('../netlify/functions/cohort')
const { sweepExpired } = await import('../netlify/functions/sweep')
type Swept = Parameters<typeof sweepExpired>[0]
/** The sweep takes the stores the way netlify/functions/sweep.ts's handler gets them. */
const sweepAll = (now?: number) =>
  sweepExpired(...(['maps', 'vouches', 'couples', 'progress'].map((n) => memStore(n) as unknown as Swept) as [Swept, Swept, Swept, Swept]), now)

const store = (name: string) => {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)!
}
const PAIR = 'HJKM47QR'
const MAP = 'ACDEFG34'
const sheet = (expiresAt = '2099-01-01', second?: Record<string, string>) =>
  JSON.stringify({ v: 1, creator: 'man', first: { money: 'agree' }, ...(second ? { second } : {}), createdAt: '2026-01-01', expiresAt })

const report = (code = PAIR) =>
  safety(new Request('http://x/.netlify/functions/safety', { method: 'POST', body: JSON.stringify({ code, side: 'woman', reason: 'threats' }) }))
const coupleDelete = (code = PAIR) => couple(new Request(`http://x/.netlify/functions/couple?code=${code}`, { method: 'DELETE' }))
const coupleGet = (code = PAIR) => couple(new Request(`http://x/.netlify/functions/couple?code=${code}`))

beforeEach(() => {
  stores.clear()
  store('couples').set(PAIR, sheet())
})

describe('a report outlives the sheet it is about', () => {
  // The reported man holds the couple code too. Deleting the sheet was one
  // request, and every report after it was a 404 — shown to her as "Didn't
  // send — try again".
  it('after the other side deletes the sheet', async () => {
    expect((await coupleDelete()).status).toBe(200)
    expect((await report()).status).toBe(200)
  })

  it('after a forget-me cascade takes the sheet with the map', async () => {
    store('maps').set(MAP, JSON.stringify({ snapshot: { couple: { code: PAIR } }, createdAt: '2026-01-01', expiresAt: '2099-01-01' }))
    expect((await keep(new Request(`http://x/.netlify/functions/keep?code=${MAP}`, { method: 'DELETE' }))).status).toBe(200)
    expect((await report()).status).toBe(200)
  })

  it('after the sheet runs out its ninety days and is swept', async () => {
    // Ran out two days ago; the window runs ninety days from then.
    store('couples').set(PAIR, sheet(new Date(Date.now() - 2 * 86_400_000).toISOString()))
    await sweepAll()
    expect(store('couples').has(PAIR)).toBe(false)
    expect((await report()).status).toBe(200)
  })

  it('what is left behind is a date and nothing else, and reads as gone', async () => {
    await coupleDelete()
    const left = [...store('couples').entries()]
    expect(left).toHaveLength(1)
    expect(Object.keys(JSON.parse(left[0][1]))).toEqual(['expiresAt'])
    expect((await coupleGet()).status).toBe(404)
  })

  it('and ends: past its own window the sweep takes it, and a report is refused', async () => {
    await coupleDelete()
    await sweepAll(Date.now() + 91 * 86_400_000)
    expect(store('couples').size).toBe(0)
    expect((await report()).status).toBe(404)
  })

  it('a code that never named a sheet leaves nothing behind when a snapshot claims it', async () => {
    store('maps').set(MAP, JSON.stringify({ snapshot: { couple: { code: 'WXYQRT78' } }, createdAt: '2026-01-01', expiresAt: '2099-01-01' }))
    await keep(new Request(`http://x/.netlify/functions/keep?code=${MAP}`, { method: 'DELETE' }))
    expect((await report('WXYQRT78')).status).toBe(404)
  })
})

describe('a report is filed as the side that files it', () => {
  // The answered-already screen never learned which side it was answering
  // for, so every report from it said "man" — a woman who answered a man's
  // eleven reported herself.
  it('the joint names the side that answered', async () => {
    store('couples').set(PAIR, sheet('2099-01-01', { money: 'agree' }))
    const body = await (await coupleGet()).json()
    expect(body.status).toBe('joint')
    expect(body.answerFor).toBe('woman')
  })
})

describe('an urgent report does not wait for Monday', () => {
  // The only alert was a job that ran on Mondays. "Threatened me" filed on a
  // Tuesday was read six days later at best (docs/ABUSE.md). The rule now
  // lives in /health, where it is tested as behaviour (tests/ops.test.ts:
  // urgent fails the daily run, anything open fails Monday's); what is left
  // here is that the job still runs through the 09:00 hour every day, and
  // fails on the cadence /health gives each check.
  const watch = readFileSync(new URL('../.github/workflows/watch.yml', import.meta.url), 'utf8')

  it('runs through 09:00 every day, and fails each check on its own cadence', () => {
    expect(watch).toMatch(/cron: '0 \*\/3 \* \* \*'/)
    expect(watch).toMatch(/\.cadence == "daily" and \$daily/)
    expect(watch).toMatch(/\.cadence == "weekly" and \$weekly/)
    expect(watch).toMatch(/"\$hour" = "09" \] && \[ "\$dow" = "1"/)
  })
})

describe('changing a code someone has seen', () => {
  // Possession is the authority (docs/HARD.md), so a code seen over her
  // shoulder, or taken from her phone, let its holder read her map, overwrite
  // it, vouch as her father, and put his own number on her door entry — so an
  // introduction would reach him. The only remedy was forget me, which cost her
  // everything (docs/THREAT.md, T8).
  const rotate = (code = MAP) => keep(new Request(`http://x/.netlify/functions/keep?code=${code}`, { method: 'PUT' }))
  const TOKEN = 'QRTWXY3478'
  const MEMBER = `us/twin-cities/woman/city/serious/${MAP}`

  beforeEach(() => {
    store('maps').set(MAP, JSON.stringify({ v: 1, snapshot: { identity: { firstName: 'Hodan' } }, createdAt: '2026-09-01', expiresAt: '2099-01-01' }))
    store('vouches').set(MAP, JSON.stringify({ v: 1, relationship: 'father', firstName: 'Abdi', sentence: 's', at: '2026-09-02' }))
    store('vouches').set(`asked/${MAP}`, TOKEN)
    store('vouches').set(`token/${TOKEN}`, MAP)
    store('cohort').set(MEMBER, JSON.stringify({ v: 1, at: '2026-09-03', ledger: [] }))
    store('cohort').set(`index/${MAP}`, MEMBER)
    store('contacts').set(MAP, JSON.stringify({ v: 1, contact: 'h@example.com', scene: 'twin-cities', country: 'us', at: '2026-09-03' }))
  })

  it('hands back a new code, and the old one opens nothing', async () => {
    const res = await rotate()
    expect(res.status).toBe(200)
    const { code } = await res.json()
    expect(code).toMatch(/^[A-Z0-9]{8}$/)
    expect(code).not.toBe(MAP)
    // It opens nothing, and says why: moved (docs/INTEGRITY.md) — never where to.
    const old = await keep(new Request(`http://x/.netlify/functions/keep?code=${MAP}`))
    expect(old.status).toBe(410)
    expect(await old.json()).toEqual({ error: 'moved' })
    expect(JSON.parse(store('maps').get(code)!).snapshot.identity.firstName).toBe('Hodan')
  })

  it('carries the vouch, the door and the way to reach her across, and leaves nothing under the old code', async () => {
    const { code } = await (await rotate()).json()
    expect(JSON.parse(store('vouches').get(code)!).firstName).toBe('Abdi')
    expect(store('vouches').get(`asked/${code}`)).toBe(TOKEN)
    expect(store('vouches').get(`token/${TOKEN}`)).toBe(code)
    const member = store('cohort').get(`index/${code}`)!
    expect(member).toBe(`us/twin-cities/woman/city/serious/${code}`)
    expect(JSON.parse(store('cohort').get(member)!).at).toBe('2026-09-03')
    expect(JSON.parse(store('contacts').get(code)!).contact).toBe('h@example.com')
    for (const s of ['maps', 'vouches', 'cohort', 'contacts'])
      // The tombstone that closes the old code is not hers: a reason and a date.
      expect([...store(s).keys()].filter((k) => k.includes(MAP) && k !== `ended/${MAP}`), s).toEqual([])
  })

  it('a code with nothing under it is a 404, and a bad one a 400', async () => {
    expect((await rotate('WXYQRT78')).status).toBe(404)
    expect((await rotate('nope')).status).toBe(400)
  })
})

describe('one city cannot be filled in an hour', () => {
  // The door says "we never pretend a city is full", and the only bound on a
  // bot minting maps and joining them was the site-wide 200 an hour — enough
  // to show one city a false 40/40 before anyone looked (docs/THREAT.md T7).
  const join = (code: string, scene = 'twin-cities') =>
    cohort(new Request('http://x/.netlify/functions/cohort', { method: 'POST', body: JSON.stringify({ code, scene, gender: 'woman' }) }))

  it('refuses a city past its own hourly cap, and leaves every other city open', async () => {
    vi.stubEnv('DOOR_CITY_HOURLY_CAP', '2')
    const codes = ['ACDEFG34', 'HJKM47QR', 'WXYQRT78', 'CDEFGH34']
    for (const c of codes) store('maps').set(c, JSON.stringify({ snapshot: {}, createdAt: 'd', expiresAt: '2099-01-01' }))
    expect((await join(codes[0])).status).toBe(200)
    expect((await join(codes[1])).status).toBe(200)
    expect((await join(codes[2])).status).toBe(503)
    expect((await join(codes[3], 'london')).status).toBe(200)
    vi.unstubAllEnvs()
  })
})

describe('the waitlist form cannot be filled by a bot', () => {
  // No honeypot meant a bot filling every field could crowd the free tier's
  // submission quota, silently (docs/THREAT.md T5).
  it('declares a field no person sees, and the app never sends it', () => {
    const forms = readFileSync(new URL('../public/__forms.html', import.meta.url), 'utf8')
    const waitlist = readFileSync(new URL('../src/lib/waitlist.ts', import.meta.url), 'utf8')
    expect(forms).toMatch(/data-netlify-honeypot="bot-field"/)
    expect(forms).toMatch(/<input type="text" name="bot-field" \/>/)
    expect(waitlist).not.toMatch(/bot-field/)
  })
})
