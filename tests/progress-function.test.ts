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
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      if (v === null) return null
      return { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: v, metadata: {} }
    },
    // Conditional options work here too: the real store returns { modified }
    // from `set` exactly as it does from `setJSON`.
    set: async (key: string, value: string, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
      m.set(key, value)
      return { modified: true }
    },
    // Conditional writes behave like the real store's, so the hourly cap in
    // shared/limit.ts counts here the way it does in production.
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

const { default: handler } = await import('../netlify/functions/progress')

const ID = 'ACDEFG'
const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/progress', { method: 'POST', body: JSON.stringify(body) }))
const raw = (body: string) =>
  handler(new Request('http://x/.netlify/functions/progress', { method: 'POST', body }))
const forget = (id: string) => handler(new Request(`http://x/.netlify/functions/progress?id=${id}`, { method: 'DELETE' }))
const readout = (headers: Record<string, string> = FOUNDER) =>
  handler(new Request('http://x/.netlify/functions/progress', { headers }))
/** The founder's key, set for every test: a readout never answers without one (netlify/shared/founder.ts). */
const FOUNDER_KEY = 'test-founder-key'
const FOUNDER = { authorization: `Bearer ${FOUNDER_KEY}` }
beforeEach(() => vi.stubEnv('FOUNDER_KEY', FOUNDER_KEY))


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
    for (const via of ['words', 'eleven', 'couple', 'family', 'married', 'group']) {
      expect((await post({ id: 'HJKMNP', rungs: ['arrived'], via })).status, via).toBe(200)
    }
    expect((await post({ id: ID, rungs: ['arrived'], via: 'instagram' })).status).toBe(400)
    expect((await post({ id: ID, rungs: ['arrived'], via: 'ACDEFG' })).status).toBe(400)
    // The door went on 2026-09-24; its via went with it.
    expect((await post({ id: ID, rungs: ['arrived'], via: 'door' })).status).toBe(400)

    await post({ id: ID, rungs: ['arrived'], via: 'family' })
    await post({ id: ID, rungs: ['arrived', 'read'], via: 'words' })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).via).toBe('family')
  })

  it('keeps which side she is on, last told wins, and refuses anything else', async () => {
    expect((await post({ id: ID, rungs: ['arrived'], gender: 'man' })).status).toBe(200)
    expect(JSON.parse(stores.get('progress')!.get(ID)!).gender).toBe('man')
    // Chosen at Identity and correctable there, so a later word replaces it.
    await post({ id: ID, rungs: ['arrived'], gender: 'woman' })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).gender).toBe('woman')
    // And a report that says nothing keeps what was said.
    await post({ id: ID, rungs: ['arrived', 'situated'] })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).gender).toBe('woman')

    expect((await post({ id: 'HJKMNP', rungs: ['arrived'], gender: 'other' })).status).toBe(400)
    expect((await post({ id: 'HJKMNP', rungs: ['arrived'], gender: 'M' })).status).toBe(400)
    expect(stores.get('progress')!.has('HJKMNP')).toBe(false)
  })

  it('refuses a fact about the door — the door went, and so did its one word', async () => {
    expect((await post({ id: ID, rungs: ['arrived', 'mapped'], facts: { hesitated: 'contact' } })).status).toBe(400)
    expect((await post({ id: ID, rungs: ['arrived', 'counted'] })).status).toBe(400)
    expect(stores.get('progress')?.size ?? 0).toBe(0)
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

  it('counts who ever asked the guide, and of them who followed through — the guide’s one measurement', async () => {
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']) {
      await post({ id, rungs: ['arrived', 'followed-through'], facts: { asked: ['guide'] } })
    }
    await post({ id: 'ACDEFK', rungs: ['arrived'], facts: { asked: ['guide'] } })
    await post({ id: 'ACDEFM', rungs: ['arrived', 'followed-through'] })
    const body = await (await readout()).json()
    expect(body.facts.asked.guide).toBe(6)
    expect(body.facts.followedThroughBy.asked.guide).toEqual({ asked: 6, followedThrough: 5 })
    // Asked is a set: asking again is not a second ask, and an unknown thing asked is refused whole.
    await post({ id: 'ACDEFK', rungs: ['arrived'], facts: { asked: ['guide'] } })
    expect(JSON.parse(stores.get('progress')!.get('ACDEFK')!).facts.asked).toEqual(['guide'])
    expect((await post({ id: 'ACDEFN', rungs: ['arrived'], facts: { asked: ['auntie'] } })).status).toBe(400)
  })

  it('holds no country, even from an older client that still sends one', async () => {
    // The country was added for the pooled door and was a quasi-identifier
    // with nothing left to read it (2026-09-24). A report that carries one is
    // taken, and the country is not kept.
    expect((await post({ id: 'ACDEFK', rungs: ['arrived'], scene: 'london', country: 'uk' })).status).toBe(200)
    expect(JSON.parse(stores.get('progress')!.get('ACDEFK')!).country).toBeUndefined()
    expect('countries' in (await (await readout()).json())).toBe(false)
  })

  it('tells the kind of room apart — alumni, professional, mosque — and never the room', async () => {
    for (const via of ['alumni', 'professional', 'mosque', 'group']) {
      expect((await post({ id: `ACDEF${via[0].toUpperCase()}`, rungs: ['arrived'], via })).status).toBe(200)
    }
    expect((await post({ id: 'ACDEFX', rungs: ['arrived'], via: 'ssa-umn' })).status).toBe(400)
  })

  it('splits the ladder by side, floored — so the men’s funnel can be read once five men have arrived', async () => {
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']) await post({ id, rungs: ['arrived'], gender: 'man' })
    await post({ id: 'ACDEFK', rungs: ['arrived', 'mapped'], gender: 'man' })
    await post({ id: 'ACDEFM', rungs: ['arrived'], gender: 'woman' })
    await post({ id: 'ACDEFN', rungs: ['arrived'] })
    const body = await (await readout()).json()
    expect(body.rungs.arrived).toBe(8)
    expect(body.sides.man.arrived).toBe(6)
    // One man mapped is a person, not a number.
    expect(body.sides.man.mapped).toBeNull()
    expect(body.sides.woman.arrived).toBeNull()
    expect(body.sides.unsaid.arrived).toBeNull()
  })

  it('crosses side with the kind of link, floored — so men a group produced can be told from men already talking to someone', async () => {
    // A man who arrives through her eleven is already talking to someone; he is
    // not supply for anyone else. `sides` alone says seven men, `vias` alone
    // says six through a group, and neither can say whether they are the same
    // men (docs/REDTEAM.md).
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ', 'ACDEFK']) {
      await post({ id, rungs: ['arrived'], gender: 'man', via: 'group' })
    }
    for (const id of ['HJKMNQ', 'HJKMNR', 'HJKMNT', 'HJKMNW', 'HJKMNX']) {
      await post({ id, rungs: ['arrived'], gender: 'woman', via: 'family' })
    }
    await post({ id: 'QRTWXA', rungs: ['arrived', 'eleven'], gender: 'man', via: 'couple' })
    const body = await (await readout()).json()
    expect(body.sidesByVia.man.group.arrived).toBe(6)
    expect(body.sidesByVia.woman.family.arrived).toBe(5)
    // One man through her link is a person, not a number.
    expect(body.sidesByVia.man.couple.arrived).toBeNull()
    expect(body.sidesByVia.man.couple.eleven).toBeNull()
    // The splits that already existed are unchanged by the cross.
    expect(body.sides.man.arrived).toBe(7)
    expect(body.vias.group.arrived).toBe(6)
    // A side nobody named does not get a row of its own here.
    expect('unsaid' in body.sidesByVia).toBe(false)
    expect(JSON.stringify(body)).not.toMatch(/ACDEFG|HJKMNQ|QRTWXA/)
  })

  it('counts the map kept apart from the map built, so gap #3 is computable', async () => {
    // docs/GAPS.md #3 — "people will not put a map on a server" — is its own
    // failure. Five built a map and stopped; five kept it. Before the `kept`
    // rung the two were the same number (docs/ROADMAP.md).
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']) {
      await post({ id, rungs: ['arrived', 'mapped'] })
    }
    for (const id of ['HJKMNQ', 'HJKMNR', 'HJKMNT', 'HJKMNW', 'HJKMNX']) {
      await post({ id, rungs: ['arrived', 'mapped', 'kept'] })
    }
    const body = await (await readout()).json()
    expect(body.rungs.mapped).toBe(10)
    expect(body.rungs.kept).toBe(5)
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
    // One person through a source reads null, like any cell under five.
    expect(body.vias.words['followed-through']).toBeNull()
    expect(body.vias.couple.eleven).toBeNull()
    expect(body.vias.unsaid.arrived).toBeNull()
    // Sources, never senders.
    expect(JSON.stringify(body)).not.toMatch(/ACDEFG|HJKMNP|QRTWXY|from|sender/)
  })

  it('a link shared into a community group is its own source, and says nothing about which group', async () => {
    // The first forty are found through alumni and professional group chats
    // (docs/WEDGE.md). Their arrivals get a row of their own so the founder can
    // read that channel against one-to-one sends — and the row is a kind of
    // room, never a room: no group name, no id, nothing but `group`.
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']) {
      await post({ id, rungs: id === 'ACDEFG' ? ['arrived', 'read'] : ['arrived'], via: 'group' })
    }
    const body = await (await readout()).json()
    expect(body.vias.group.arrived).toBe(5)
    expect(body.vias.group.read).toBeNull()
    expect(JSON.stringify(body)).not.toMatch(/whatsapp|alumni|snabpi|chat/i)
    // Anything more specific than the kind of room is refused.
    expect((await post({ id: 'HJKMNQ', rungs: ['arrived'], via: 'group:ssa-umn' })).status).toBe(400)
  })

  it('keeps which questionnaires were begun as a union, and refuses anything not one of the four', async () => {
    await post({ id: ID, rungs: ['arrived'], facts: { began: ['read'] } })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).facts.began).toEqual(['read'])
    // A beginning cannot be un-begun: later reports add, never replace.
    await post({ id: ID, rungs: ['arrived', 'read'], facts: { began: ['map'] } })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).facts.began).toEqual(['map', 'read'])
    // Duplicates collapse, so the set can never become a count of openings.
    await post({ id: ID, rungs: ['arrived', 'read'], facts: { began: ['read', 'read', 'read'] } })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).facts.began).toEqual(['map', 'read'])

    expect((await post({ id: 'HJKMNP', rungs: ['arrived'], facts: { began: ['sessions'] } })).status).toBe(400)
    expect((await post({ id: 'HJKMNP', rungs: ['arrived'], facts: { began: 'read' } })).status).toBe(400)
    expect(stores.get('progress')!.has('HJKMNP')).toBe(false)
  })

  it('counts who began each questionnaire, so a completion rate exists against the rungs', async () => {
    // Six began a read; two of them finished it.
    const ids = ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ', 'ACDEFK']
    for (const id of ids) await post({ id, rungs: ['arrived'], facts: { began: ['read'] } })
    await post({ id: 'ACDEFG', rungs: ['arrived', 'read'], facts: { began: ['read'] } })
    await post({ id: 'HJKMNP', rungs: ['arrived', 'read'], facts: { began: ['read'] } })

    const body = await (await readout()).json()
    // Both halves are whole-population counts, so both stay numbers at founding
    // scale — 2 of 6 finished the read.
    expect(body.facts.began.read).toBe(6)
    expect(body.rungs.read).toBe(2)
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
  it('refuses when no key is configured, and says why out loud', async () => {
    const { resetWarnings } = await import('../netlify/shared/founder')
    resetWarnings()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('FOUNDER_KEY', '')
    await post({ id: ID, rungs: ['arrived'] })
    // Unset used to mean open; a misconfigured deploy published every readout
    // and the founder learned of it from this log line (docs/BOARD.md). Now
    // unset means closed, and the log line says how to open it.
    expect((await readout()).status).toBe(401)
    expect(warn.mock.calls.flat().join(' ')).toContain('FOUNDER_KEY is not set')
    // Once per cold start, not once per request: a guard that is off should be
    // visible in the log, not a wall of noise that gets filtered out.
    await readout()
    expect(warn.mock.calls.length).toBe(1)
    warn.mockRestore()
  })

  it('refuses the readout without the key, and with the wrong one', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    const bare = await readout({})
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
  const eleven = { open: 'money-home' }
  /** What an older client sends: the same, with how many of the eleven were in each state. */
  const olderEleven = { agree: 7, differ: 2, notTalked: 1, unknown: 1, open: 'money-home' }
  const grounds = { faith: 'steady', family: 'thin' }

  it('takes an older client’s eleven, and keeps only the one to open', async () => {
    expect((await post({ id: ID, rungs: ['arrived', 'eleven'], facts: { eleven: olderEleven } })).status).toBe(200)
    expect(JSON.parse(stores.get('progress')!.get(ID)!).facts.eleven).toEqual({ open: 'money-home' })
  })

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
      { eleven: { ...eleven, open: 'pets' } },
      { eleven: { ...eleven, sheet: 'hers' } },
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
        eleven: { open: 'live' },
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
    expect(body.facts.eleven).toEqual({ open: { 'money-home': 6 } })
    // Cross-tabs are floored cell by cell.
    expect(body.facts.marriedBy.through['money-home']).toEqual({ through: 6, married: 5 })
    expect(body.facts.marriedBy.through.live).toEqual({ through: null, married: null })
    expect(body.facts.marriedBy.open['money-home']).toEqual({ eleven: 6, married: 5 })
    expect(body.facts.marriedBy.readThin.public).toEqual({ read: 6, married: 5 })
  })

  it('reads the North Star by arrival month: of each month’s arrivals, how many have followed through since', async () => {
    // Followed-through per hundred arrived, this month against last, is two
    // rows of this. The count of arrivals by day it replaced could not say it.
    const store = memStore('progress')
    const rec = (arrived: string, through?: string) =>
      ({ first: { arrived, ...(through ? { 'followed-through': through } : {}) }, expiresAt: '2099-01-01' })
    await store.setJSON('ACDEFG', rec('2026-08-03', '2026-09-20'))
    await store.setJSON('HJKMNP', rec('2026-08-19'))
    await store.setJSON('QRTWXY', rec('2026-08-30'))
    await store.setJSON('ACDEFH', rec('2026-09-02', '2026-09-10'))
    // A record written before dates were days reads its month the same way.
    await store.setJSON('ACDEFJ', rec('2026-09-01T13:45:12.345Z'))
    const body = await (await readout()).json()
    expect(body.cohorts).toEqual({ '2026-08': { arrived: 3, followedThrough: 1 }, '2026-09': { arrived: 2, followedThrough: 1 } })
    expect('arrivedByDay' in body).toBe(false)
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

/**
 * A marriage does not expire.
 *
 * The record's year was refreshed on every report — and marrying is the thing
 * that ends the reporting. So the one outcome this product exists to cause
 * dropped out of every readout at day 366 and the historical count changed
 * retroactively, while the blob stayed on disk for ever because nothing
 * deleted it either. docs/HARD.md.
 */
describe('what the year does and does not take', () => {
  const stale = (extra: Record<string, unknown>) => ({
    first: { arrived: '2024-01-01', ...(extra.first as object) },
    expiresAt: '2025-01-01',
    ...extra,
  })

  it('keeps and counts a record that reached married, however old', async () => {
    await memStore('progress').setJSON('ACDEFG', stale({ first: { married: '2024-06-01' } }))
    const body = await (await readout()).json()
    expect(body.rungs.married).toBe(1)
    expect(stores.get('progress')!.has('ACDEFG')).toBe(true)
  })

  it('stops counting a record past its year, and sweeps it as it goes', async () => {
    await memStore('progress').setJSON('HJKMNP', stale({}))
    await post({ id: 'QRTWXY', rungs: ['arrived'] })

    const body = await (await readout()).json()
    // Only the live one.
    expect(body.rungs.arrived).toBe(1)
    // The year is real now: skipping without deleting left the store holding
    // exactly what the readout refuses to count.
    expect(stores.get('progress')!.has('HJKMNP')).toBe(false)
    expect(stores.get('progress')!.has('QRTWXY')).toBe(true)
  })
})
