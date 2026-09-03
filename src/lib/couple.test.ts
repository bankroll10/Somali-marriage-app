import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerCouple, coupleLink, coupleReading, createCouple, readCouple, type Joint } from './couple'
import { beforeYesTopics } from '../data/beforeYes'

const IDS = beforeYesTopics('woman').map((t) => t.id)
const all = (kind: Joint) => Object.fromEntries(IDS.map((id) => [id, kind])) as Record<string, Joint>
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.unstubAllGlobals())

describe('reading the joint', () => {
  const banned = [
    'good man', 'bad man', 'a player', 'red flag', 'he loves you', "he doesn't love you",
    'leave him', 'dump him', 'end it', 'walk away', 'you deserve better',
    'you should marry', 'do not marry', "don't marry", 'call it off', 'not right for you', 'dealbreaker',
  ]
  const cases = [all('both-agree'), all('both-not-talked'), { ...all('both-agree'), live: 'one-thinks-talked' as Joint }, { ...all('both-agree'), qabiil: 'differ-somewhere' as Joint, 'money-home': 'unknown-somewhere' as Joint }]

  it('never judges anyone, and never puts a digit in front of her', () => {
    for (const j of cases) {
      const r = coupleReading(j)
      const text = [r.headline, ...r.lines.map((l) => l.line), r.open?.script.words ?? ''].join(' ').toLowerCase()
      for (const b of banned) expect(text).not.toContain(b)
      expect(text).not.toMatch(/\d/)
    }
  })

  it('never says which of them said what', () => {
    const r = coupleReading({ ...all('both-agree'), live: 'one-thinks-talked' })
    const line = r.lines.find((l) => l.id === 'live')!.line
    expect(line).toMatch(/One of you/)
    expect(line).not.toMatch(/\b(he|she|you said|they said)\b/i)
  })

  it('opens the mismatch that matters most, weighed by the topic', () => {
    const r = coupleReading({ ...all('both-agree'), 'aroos-mahr': 'one-thinks-talked', live: 'both-not-talked' })
    // one-thinks-talked on the wedding (1 × .6) beats unopened where-you'd-live (.6 × .95)
    expect(r.open?.id).toBe('aroos-mahr')
    const r2 = coupleReading({ ...all('both-agree'), 'aroos-mahr': 'both-not-talked', live: 'both-not-talked' })
    expect(r2.open?.id).toBe('live')
  })

  it('puts the most urgent lines first', () => {
    const r = coupleReading({ ...all('both-agree'), qabiil: 'one-thinks-talked', work: 'both-not-talked' })
    expect(r.lines[0].id).toBe('qabiil')
    expect(r.lines[1].id).toBe('work')
  })

  it('still ends in words when everything is agreed', () => {
    const r = coupleReading(all('both-agree'))
    expect(r.headline).toMatch(/all eleven/)
    expect(r.open?.script.words).toMatch(/go back over/i)
  })
})

describe('the handshake, from her phone', () => {
  it('creates and returns the code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'ACDEFG' })))
    expect(await createCouple(Object.fromEntries(IDS.map((id) => [id, 'agree'])), 'woman')).toBe('ACDEFG')
  })
  it('reads open, joint, and dead links', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ status: 'open', answerFor: 'man' })))
    expect(await readCouple('ACDEFG')).toEqual({ status: 'open', answerFor: 'man' })
    vi.stubGlobal('fetch', vi.fn(async () => json({ status: 'joint', joint: all('both-agree') })))
    expect((await readCouple('ACDEFG'))?.status).toBe('joint')
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'not_found' }, 404)))
    expect(await readCouple('ACDEFG')).toBeNull()
  })
  it('tells him when it has already been answered', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'answered' }, 409)))
    expect(await answerCouple('ACDEFG', Object.fromEntries(IDS.map((id) => [id, 'agree'])))).toBe('answered')
  })
  it('builds the link he opens', () => {
    expect(coupleLink('ACDEFG', 'https://getniyyah.netlify.app')).toBe('https://getniyyah.netlify.app/?couple=ACDEFG')
  })
})
