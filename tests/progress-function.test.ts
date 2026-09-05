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
const forget = (id: string) => handler(new Request(`http://x/.netlify/functions/progress?id=${id}`, { method: 'DELETE' }))
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
    // A city under five reads null in every cell — a person is not a number here.
    expect(body.scenes.toronto.situated).toBeNull()
    expect(body.scenes.london.arrived).toBeNull()

    // No install id ever leaves, so nothing here can be traced to a device.
    const serialised = JSON.stringify(body)
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY']) expect(serialised).not.toContain(id)
  })

  it('floors a city of three to null, and leaves the whole-population count a number', async () => {
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY']) await post({ id, rungs: ['arrived', 'read'], scene: 'toronto' })
    const body = await (await readout()).json()
    expect(body.rungs.arrived).toBe(3)
    expect(body.rungs.read).toBe(3)
    expect(body.scenes.toronto.arrived).toBeNull()
    expect(body.scenes.toronto.read).toBeNull()
    expect('arrived' in body.scenes.toronto).toBe(true)
  })

  it('shows a city once five have reached a rung', async () => {
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']) await post({ id, rungs: ['arrived'], scene: 'toronto' })
    const body = await (await readout()).json()
    expect(body.scenes.toronto.arrived).toBe(5)
  })

  it('tells word of mouth from every other arrival, by source, with no edge between people', async () => {
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']) {
      await post({ id, rungs: id === 'ACDEFG' ? ['arrived', 'read', 'followed-through'] : ['arrived'], via: 'words' })
    }
    await post({ id: 'HJKMNQ', rungs: ['arrived', 'eleven'], via: 'couple' })
    await post({ id: 'HJKMNR', rungs: ['arrived'] })

    const body = await (await readout()).json()
    expect(body.vias.words.arrived).toBe(5)
    // One person through a door reads null, like any cell under five.
    expect(body.vias.words['followed-through']).toBeNull()
    expect(body.vias.couple.eleven).toBeNull()
    expect(body.vias.unsaid.arrived).toBeNull()
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

  it('POST writes, GET reads, DELETE forgets — nothing else answers', async () => {
    const res = await handler(new Request('http://x/.netlify/functions/progress', { method: 'PUT' }))
    expect(res.status).toBe(405)
  })
})

describe('forgetting an install', () => {
  it('leaves the readout, not just the store — a true un-count', async () => {
    await post({ id: ID, rungs: ['arrived', 'read'], facts: { read: { band: 'mixed', thin: 'public' } } })
    await post({ id: 'HJKMNP', rungs: ['arrived'] })
    expect((await (await readout()).json()).rungs.arrived).toBe(2)
    const res = await forget(ID)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ forgotten: true })
    const body = await (await readout()).json()
    expect(body.rungs.arrived).toBe(1)
    expect(body.rungs.read).toBeUndefined()
    expect(body.facts.read.band).toEqual({})
  })

  it('a second time is a quiet 404, and a bad id is refused', async () => {
    await post({ id: ID, rungs: ['arrived'] })
    await forget(ID)
    expect((await forget(ID)).status).toBe(404)
    expect((await forget('nope')).status).toBe(400)
  })

  it('never needs the founder key — it is hers', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    await post({ id: ID, rungs: ['arrived'] })
    expect((await forget(ID)).status).toBe(200)
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
    // Six people confirmed the money conversation; five went on to marry. One
    // also confirmed the living conversation — a lone cell, so it reads null.
    const ids = ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ', 'HJKMNQ']
    for (const [i, id] of ids.entries()) {
      await post({
        id,
        rungs: i < 5 ? ['arrived', 'followed-through', 'married'] : ['arrived', 'followed-through'],
        facts: { eleven, through: i === 5 ? ['beforeYes:money-home', 'couple:live'] : ['beforeYes:money-home'], read },
      })
    }
    const body = await (await readout()).json()
    // Whole-population counts are never floored.
    expect(body.facts.through).toEqual({ 'beforeYes:money-home': 6, 'couple:live': 1 })
    expect(body.facts.throughByTopic).toEqual({ 'money-home': 6, live: 1 })
    expect(body.facts.eleven.differ).toEqual({ '2': 6 })
    // Cross-tabs are floored cell by cell.
    expect(body.facts.marriedBy.through['money-home']).toEqual({ through: 6, married: 5 })
    expect(body.facts.marriedBy.through.live).toEqual({ through: null, married: null })
    expect(body.facts.marriedBy.open['money-home']).toEqual({ eleven: 6, married: 5 })
    expect(body.facts.marriedBy.readThin.public).toEqual({ read: 6, married: 5 })
  })

  it('buckets an older record’s moment into its day', async () => {
    await memStore('progress').setJSON('QRTWXY', { first: { arrived: '2026-09-01T13:45:12.345Z' }, expiresAt: '2027-09-01T00:00:00.000Z' })
    await post({ id: ID, rungs: ['arrived'] })
    const body = await (await readout()).json()
    expect(body.arrivedByDay['2026-09-01']).toBe(1)
    expect(Object.keys(body.arrivedByDay).every((k) => k.length === 10)).toBe(true)
  })

  it('accepts an ended list from the closed lists, replaces it whole, and bounds it at eight', async () => {
    const one = [{ stage: 'talking', reason: 'his-read', which: 'public' }]
    expect((await post({ id: ID, rungs: ['arrived'], facts: { ended: one } })).status).toBe(200)
    const two = [...one, { stage: 'deciding', reason: 'my-family' }]
    await post({ id: ID, rungs: ['arrived'], facts: { ended: two } })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).facts.ended).toEqual(two)
    // Replaced whole: a reason she takes back leaves here too.
    await post({ id: ID, rungs: ['arrived'], facts: { ended: [] } })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).facts.ended).toEqual([])
    const nine = Array.from({ length: 9 }, () => ({ stage: 'talking', reason: 'other' }))
    expect((await post({ id: ID, rungs: ['arrived'], facts: { ended: nine } })).status).toBe(400)
  })

  it('refuses a which on a reason that takes none, and a which off its list', async () => {
    const bad = [
      [{ stage: 'talking', reason: 'he-stopped', which: 'public' }],
      [{ stage: 'talking', reason: 'his-read', which: 'early' }],
      [{ stage: 'talking', reason: 'non-negotiable', which: 'money-home' }],
      [{ stage: 'talking', reason: 'eleven', which: 'faith-nn' }],
      [{ stage: 'married', reason: 'other' }],
      [{ stage: 'talking', reason: 'he was rude' }],
      [{ stage: 'talking', reason: 'other', note: 'free text' }],
    ]
    for (const ended of bad) {
      const res = await post({ id: ID, rungs: ['arrived'], facts: { ended } })
      expect(res.status, JSON.stringify(ended)).toBe(400)
    }
    expect(stores.get('progress')?.size ?? 0).toBe(0)
  })

  it('tallies ended by reason, stage and which, and crosses reason with married', async () => {
    // Six people ended one over a non-negotiable; five went on to marry.
    const ids = ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ', 'HJKMNQ']
    for (const [i, id] of ids.entries()) {
      await post({
        id,
        rungs: i < 5 ? ['arrived', 'married'] : ['arrived'],
        facts: {
          ended: [
            { stage: 'talking', reason: 'non-negotiable', which: 'faith-nn' },
            ...(i === 0 ? [{ stage: 'deciding', reason: 'his-family' }] : []),
          ],
        },
      })
    }
    const body = await (await readout()).json()
    expect(body.facts.ended.reason).toEqual({ 'non-negotiable': 6, 'his-family': 1 })
    expect(body.facts.ended.stage).toEqual({ talking: 6, deciding: 1 })
    expect(body.facts.ended.which['non-negotiable']).toEqual({ 'faith-nn': 6 })
    expect(body.facts.marriedBy.ended['non-negotiable']).toEqual({ ended: 6, married: 5 })
    expect(body.facts.marriedBy.ended['his-family']).toEqual({ ended: null, married: null })
  })

  it('tallies records written before facts existed', async () => {
    await post({ id: ID, rungs: ['arrived', 'read'] })
    const body = await (await readout()).json()
    expect(body.rungs.read).toBe(1)
    expect(body.facts.read.band).toEqual({})
  })
})
