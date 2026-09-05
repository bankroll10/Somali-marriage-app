import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The ladder store has two jobs: to accept nothing but rungs, and to never let
 * a rung already reached move or disappear. These drive the function against
 * an in-memory stand-in for Netlify Blobs.
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
    getMetadata: async (key: string) => (m.has(key) ? { etag: 'x', metadata: {} } : null),
    set: async (key: string, value: string) => void m.set(key, value),
    setJSON: async (key: string, value: unknown) => void m.set(key, JSON.stringify(value)),
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (name: string) => memStore(name) }))

const { default: handler } = await import('../netlify/functions/progress')

const ID = 'ACDEFG'
const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/progress', { method: 'POST', body: JSON.stringify(body) }))
const raw = (body: string) =>
  handler(new Request('http://x/.netlify/functions/progress', { method: 'POST', body }))
const readout = (headers: Record<string, string> = {}) =>
  handler(new Request('http://x/.netlify/functions/progress', { headers }))

beforeEach(() => stores.clear())
afterEach(() => vi.unstubAllEnvs())

describe('reporting a rung', () => {
  it('accepts the ladder and records when each was first reached', async () => {
    const res = await post({ id: ID, rungs: ['arrived', 'situated'], scene: 'toronto' })
    expect(res.status).toBe(200)
    const stored = JSON.parse(stores.get('progress')!.get(ID)!)
    expect(Object.keys(stored.first).sort()).toEqual(['arrived', 'situated'])
    expect(stored.scene).toBe('toronto')
  })

  it('never moves a timestamp already written', async () => {
    await post({ id: ID, rungs: ['arrived'] })
    const first = JSON.parse(stores.get('progress')!.get(ID)!).first.arrived
    await new Promise((r) => setTimeout(r, 5))
    await post({ id: ID, rungs: ['arrived', 'mapped'] })
    const after = JSON.parse(stores.get('progress')!.get(ID)!)
    expect(after.first.arrived).toBe(first)
    expect(after.first.mapped).toBeTruthy()
  })

  it('records a rung’s date as a day, never a moment', async () => {
    await post({ id: ID, rungs: ['arrived'] })
    const stored = JSON.parse(stores.get('progress')!.get(ID)!)
    expect(stored.first.arrived).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(stored.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('a rung once reported can never be taken back', async () => {
    await post({ id: ID, rungs: ['arrived', 'read'] })
    await post({ id: ID, rungs: ['arrived'] })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).first.read).toBeTruthy()
  })

  it('refuses anything that is not a rung on the ladder', async () => {
    for (const bad of ['sessions', 'minutes', 'messages', 'streak', 'swipes', 'READ']) {
      const res = await post({ id: ID, rungs: [bad] })
      expect(res.status, bad).toBe(400)
    }
    expect(stores.get('progress')?.size ?? 0).toBe(0)
  })

  it('keeps what kind of link brought her here, first told wins, and refuses anything else', async () => {
    for (const via of ['words', 'eleven', 'couple', 'door', 'family', 'married']) {
      expect((await post({ id: 'HJKMNP', rungs: ['arrived'], via })).status, via).toBe(200)
    }
    expect((await post({ id: ID, rungs: ['arrived'], via: 'instagram' })).status).toBe(400)
    expect((await post({ id: ID, rungs: ['arrived'], via: 'ACDEFG' })).status).toBe(400)

    await post({ id: ID, rungs: ['arrived'], via: 'door' })
    await post({ id: ID, rungs: ['arrived', 'read'], via: 'words' })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).via).toBe('door')
  })

  it('refuses a bad id, a bad scene, a missing list and an oversized body', async () => {
    expect((await post({ id: 'nope', rungs: ['arrived'] })).status).toBe(400)
    expect((await post({ id: ID, rungs: ['arrived'], scene: 'mars' })).status).toBe(400)
    expect((await post({ id: ID })).status).toBe(400)
    expect((await raw('x'.repeat(5000))).status).toBe(413)
    expect((await raw(JSON.stringify({ id: ID, rungs: ['arrived'], pad: 'x'.repeat(3000) }))).status).toBe(200)
    expect((await raw('{not json')).status).toBe(400)
  })
})

describe('the readout', () => {
  it('counts people per rung, splits by city, and returns no individual', async () => {
    await post({ id: 'ACDEFG', rungs: ['arrived', 'situated', 'read'], scene: 'toronto' })
    await post({ id: 'HJKMNP', rungs: ['arrived', 'situated'], scene: 'toronto' })
    await post({ id: 'QRTWXY', rungs: ['arrived'], scene: 'london' })

    const body = await (await readout()).json()
    expect(body.rungs.arrived).toBe(3)
    expect(body.rungs.situated).toBe(2)
    expect(body.rungs.read).toBe(1)
    expect(body.scenes.toronto.situated).toBe(2)
    expect(body.scenes.london.arrived).toBe(1)

    // No install id ever leaves, so nothing here can be traced to a device.
    const serialised = JSON.stringify(body)
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY']) expect(serialised).not.toContain(id)
  })

  it('tells word of mouth from every other arrival, by source, with no edge between people', async () => {
    await post({ id: 'ACDEFG', rungs: ['arrived', 'read', 'followed-through'], via: 'words' })
    await post({ id: 'HJKMNP', rungs: ['arrived'], via: 'words' })
    await post({ id: 'QRTWXY', rungs: ['arrived', 'eleven'], via: 'couple' })
    await post({ id: 'ACDEFH', rungs: ['arrived'] })

    const body = await (await readout()).json()
    expect(body.vias.words.arrived).toBe(2)
    expect(body.vias.words['followed-through']).toBe(1)
    expect(body.vias.couple.eleven).toBe(1)
    expect(body.vias.unsaid.arrived).toBe(1)
    // Sources, never senders.
    expect(JSON.stringify(body)).not.toMatch(/ACDEFG|HJKMNP|QRTWXY|from|sender/)
  })

  it('carries nothing a person wrote', async () => {
    await post({ id: ID, rungs: ['arrived', 'eleven', 'followed-through'], scene: 'london' })
    const serialised = JSON.stringify(await (await readout()).json())
    // States of the eleven appear in the tally only as the names of counts,
    // never as a value anyone holds.
    expect(serialised).not.toMatch(/:"(agree|differ|not-talked|unknown)"/)
  })

  it('POST is the only way in, and only GET reads', async () => {
    const res = await handler(new Request('http://x/.netlify/functions/progress', { method: 'DELETE' }))
    expect(res.status).toBe(405)
  })
})

describe('the founder key', () => {
  it('stays open when no key is configured', async () => {
    await post({ id: ID, rungs: ['arrived'] })
    expect((await readout()).status).toBe(200)
  })

  it('refuses the readout without the key, and with the wrong one', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    const bare = await readout()
    expect(bare.status).toBe(401)
    expect(bare.headers.get('www-authenticate')).toMatch(/^Bearer/)
    expect(bare.headers.get('cache-control')).toBe('no-store')
    expect(JSON.stringify(await bare.json())).not.toContain('sesame')
    expect((await readout({ authorization: 'Bearer open-sesam' })).status).toBe(401)
    expect((await readout({ authorization: 'Bearer open-sesame-x' })).status).toBe(401)
  })

  it('refuses Basic and a bare token — only Bearer', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await readout({ authorization: 'open-sesame' })).status).toBe(401)
    expect((await readout({ authorization: `Basic ${btoa('x:open-sesame')}` })).status).toBe(401)
  })

  it('admits the key', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    await post({ id: ID, rungs: ['arrived'] })
    const res = await readout({ authorization: 'Bearer open-sesame' })
    expect(res.status).toBe(200)
    expect((await res.json()).rungs.arrived).toBe(1)
  })

  it('reporting a rung never needs the key', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await post({ id: ID, rungs: ['arrived'] })).status).toBe(200)
  })
})

describe('the facts', () => {
  const read = { band: 'mixed', thin: 'public' }
  const eleven = { agree: 7, differ: 2, notTalked: 1, unknown: 1, open: 'money-home' }
  const grounds = { faith: 'steady', family: 'thin' }

  it('accepts facts from the closed lists and stores them', async () => {
    const res = await post({ id: ID, rungs: ['arrived', 'read', 'eleven'], facts: { grounds, read, eleven, through: ['beforeYes:money-home', 'read:early'], ending: { who: 'brought', used: ['map'] } } })
    expect(res.status).toBe(200)
    const stored = JSON.parse(stores.get('progress')!.get(ID)!)
    expect(stored.facts).toEqual({ grounds, read, eleven, through: ['beforeYes:money-home', 'read:early'], ending: { who: 'brought', used: ['map'] } })
  })

  it('refuses any fact outside the lists — and stores nothing from that report', async () => {
    const bad: unknown[] = [
      { grounds: { money: 'thin' } },
      { grounds: { faith: 'great' } },
      { read: { band: 'great', thin: 'public' } },
      { read: { band: 'mixed', thin: 'early' } },
      { eleven: { ...eleven, agree: 8 } },
      { eleven: { ...eleven, open: 'pets' } },
      { through: ['guide:should I tell my mother'] },
      { through: ['read:money-home'] },
      { through: ['beforeYes'] },
      { ending: { who: 'tinder' } },
      { ending: { advice: 'ask about money early' } },
      { ending: { used: ['swipes'] } },
      { sessions: 4 },
      'mixed',
    ]
    for (const facts of bad) {
      const res = await post({ id: ID, rungs: ['arrived'], facts })
      expect(res.status, JSON.stringify(facts)).toBe(400)
      expect((await res.json()).error).toBe('bad_facts')
    }
    expect(stores.get('progress')?.size ?? 0).toBe(0)
  })

  it('keeps the first grounds, read and eleven it was told, unions conversations, and lets the ending be revised', async () => {
    await post({ id: ID, rungs: ['arrived'], facts: { grounds, read, eleven, through: ['read:public'], ending: { who: 'brought' } } })
    await post({
      id: ID,
      rungs: ['arrived'],
      facts: {
        grounds: { faith: 'strong' },
        read: { band: 'strong', thin: 'intent' },
        eleven: { ...eleven, agree: 8, differ: 1 },
        through: ['beforeYes:money-home'],
        ending: { who: 'family', mattered: 'eleven' },
      },
    })
    const f = JSON.parse(stores.get('progress')!.get(ID)!).facts
    expect(f.grounds).toEqual(grounds)
    expect(f.read).toEqual(read)
    expect(f.eleven).toEqual(eleven)
    expect(f.through).toEqual(['beforeYes:money-home', 'read:public'])
    expect(f.ending).toEqual({ who: 'family', mattered: 'eleven' })
  })

  it('tallies facts as distributions and never as a record', async () => {
    await post({ id: 'ACDEFG', rungs: ['arrived', 'read'], facts: { grounds, read, ending: { who: 'brought', mattered: 'shown', used: ['read', 'map'] } } })
    await post({ id: 'HJKMNP', rungs: ['arrived', 'read'], facts: { grounds: { family: 'strong' }, read: { band: 'thin', thin: 'public' } } })
    const body = await (await readout()).json()
    expect(body.facts.grounds.family).toEqual({ thin: 1, strong: 1 })
    expect(body.facts.read.band).toEqual({ mixed: 1, thin: 1 })
    expect(body.facts.read.thin).toEqual({ public: 2 })
    expect(body.facts.ending.who).toEqual({ brought: 1 })
    expect(body.facts.ending.used).toEqual({ read: 1, map: 1 })
    const serialised = JSON.stringify(body)
    expect(serialised).not.toMatch(/ACDEFG|HJKMNP|advice|answers/)
  })

  it('crosses what she confirmed she said with whether she married', async () => {
    await post({ id: 'ACDEFG', rungs: ['arrived', 'followed-through', 'married'], facts: { eleven, through: ['beforeYes:money-home'], read } })
    await post({ id: 'HJKMNP', rungs: ['arrived', 'followed-through'], facts: { eleven, through: ['beforeYes:money-home', 'couple:live'], read } })
    const body = await (await readout()).json()
    expect(body.facts.through).toEqual({ 'beforeYes:money-home': 2, 'couple:live': 1 })
    expect(body.facts.throughByTopic).toEqual({ 'money-home': 2, live: 1 })
    expect(body.facts.marriedBy.through['money-home']).toEqual({ through: 2, married: 1 })
    expect(body.facts.marriedBy.through.live).toEqual({ through: 1, married: 0 })
    expect(body.facts.marriedBy.open['money-home']).toEqual({ eleven: 2, married: 1 })
    expect(body.facts.marriedBy.readThin.public).toEqual({ read: 2, married: 1 })
    expect(body.facts.eleven.differ).toEqual({ '2': 2 })
  })

  it('buckets an older record’s moment into its day', async () => {
    await memStore('progress').setJSON('QRTWXY', { first: { arrived: '2026-09-01T13:45:12.345Z' }, expiresAt: '2027-09-01T00:00:00.000Z' })
    await post({ id: ID, rungs: ['arrived'] })
    const body = await (await readout()).json()
    expect(body.arrivedByDay['2026-09-01']).toBe(1)
    expect(Object.keys(body.arrivedByDay).every((k) => k.length === 10)).toBe(true)
  })

  it('tallies records written before facts existed', async () => {
    await post({ id: ID, rungs: ['arrived', 'read'] })
    const body = await (await readout()).json()
    expect(body.rungs.read).toBe(1)
    expect(body.facts.read.band).toEqual({})
  })
})
