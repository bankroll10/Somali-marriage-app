import { afterEach, describe, expect, it, vi } from 'vitest'
import { askVouch, readVouch, sendVouch, vouchLink } from './vouch'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
afterEach(() => vi.unstubAllGlobals())

describe('a vouch, from her phone and theirs', () => {
  it('keeps only what any screen may show', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ vouched: true, relationship: 'brother', firstName: 'Ali' })))
    const v = await readVouch('ACDEFG')
    expect(v).toMatchObject({ relationship: 'brother', firstName: 'Ali' })
    expect(JSON.stringify(v)).not.toMatch(/sentence|phone/)
  })
  it('reads nobody-yet as null, not as a lie', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ vouched: false }, 404)))
    expect(await readVouch('ACDEFG')).toBeNull()
  })
  it('tells the family member when it has already been done, or when the link is dead', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'vouched' }, 409)))
    expect(await sendVouch('ACDEFG', { relationship: 'father', firstName: 'Cabdi', sentence: 'x' })).toBe('already')
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'no_map' }, 404)))
    expect(await sendVouch('ACDEFG', { relationship: 'father', firstName: 'Cabdi', sentence: 'x' })).toBe('no_map')
  })
  it('never sends anything it was not given', async () => {
    const spy = vi.fn(async () => json({ vouched: true, relationship: 'father', firstName: 'Cabdi' }))
    vi.stubGlobal('fetch', spy)
    await sendVouch('ACDEFG', { relationship: 'father', firstName: 'Cabdi', sentence: 'She is my daughter.' })
    const sent = JSON.parse((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(sent).toEqual({ code: 'ACDEFG', relationship: 'father', firstName: 'Cabdi', sentence: 'She is my daughter.' })
  })
  it('asks for a token with her code, and builds the link from the token — never the code', async () => {
    const spy = vi.fn(async () => json({ token: 'ACDEFGHJ' }))
    vi.stubGlobal('fetch', spy)
    const token = await askVouch('ACDEFG')
    expect(token).toBe('ACDEFGHJ')
    expect(JSON.parse((spy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ side: 'ask', code: 'ACDEFG' })
    const link = vouchLink(token!, 'https://getniyyah.netlify.app')
    expect(link).toBe('https://getniyyah.netlify.app/?vouch=ACDEFGHJ')
    expect(link).not.toContain('ACDEFG"')
  })
  it('refuses a token that is not the right shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ token: 'ACDEFG' })))
    expect(await askVouch('ACDEFG')).toBeNull()
  })
})
