import { afterEach, describe, expect, it, vi } from 'vitest'
import { askCoach, guideSystemPrompt } from './coach'
import type { CoachContext } from '../data/coach'
import type { CoachMessage } from '../types'

const ctx: CoachContext = {
  identity: { firstName: 'Amina', gender: 'woman', age: 27, scene: 'twin-cities' },
  answers: {
    timeline: '1-2',
    practice: 'consistent',
    'faith-role': 4,
    dealbreakers: ['honesty', 'respect'],
    attachment: 'secure',
    'hardest-part': 'serious',
  },
  social: { matchedNames: ['Yusuf'], pendingNames: ['Omar'], passedIds: [] },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('askCoach — the local voice is the one that ships today', () => {
  it('answers from the local matcher when no live guide is reachable', async () => {
    // No ANTHROPIC_API_KEY in production means a 503; here the relative URL
    // simply cannot be fetched. Both must land on the same fallback.
    const reply = await askCoach('is he actually serious about me?', ctx, 'auntie')
    expect(reply.text.length).toBeGreaterThan(0)
  })

  it('falls back when the function returns 503 (the dormant case)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'guide_not_configured' }), { status: 503 })),
    )
    const reply = await askCoach('he went quiet on me', ctx, 'auntie')
    expect(reply.text.length).toBeGreaterThan(0)
  })

  it('falls back when the network throws outright', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const reply = await askCoach('he went quiet on me', ctx, 'auntie')
    expect(reply.text.length).toBeGreaterThan(0)
  })

  it('falls back on a 200 with an empty body rather than showing nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ text: '   ' }), { status: 200 })),
    )
    const reply = await askCoach('he went quiet on me', ctx, 'auntie')
    expect(reply.text.trim().length).toBeGreaterThan(0)
  })

  it('uses the live answer when one comes back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ text: 'A live answer.' }), { status: 200 })),
    )
    const reply = await askCoach('he went quiet on me', ctx, 'auntie')
    expect(reply.text).toBe('A live answer.')
  })

  it('sends the thread history so the guide can remember', async () => {
    const spy = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ text: 'ok' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', spy)
    const history: CoachMessage[] = [
      { id: '1', role: 'user', text: 'he texts at 1am' },
      { id: '2', role: 'coach', text: 'that is not intention' },
    ]
    await askCoach('so what do I say?', ctx, 'auntie', history)

    const body = JSON.parse(spy.mock.calls[0][1].body as string)
    expect(body.history).toHaveLength(2)
    expect(body.history[0]).toEqual({ role: 'user', text: 'he texts at 1am' })
    expect(body.message).toBe('so what do I say?')
    expect(body.system).toContain('Niyyah')
  })

  it('never dead-ends — every reply offers somewhere to go', async () => {
    const reply = await askCoach('what do I even say to him', ctx, 'auntie')
    expect(Array.isArray(reply.followUps)).toBe(true)
  })
})

describe('guideSystemPrompt', () => {
  it('carries the member’s real map, not a generic persona', () => {
    const p = guideSystemPrompt('auntie', ctx)
    expect(p).toContain('Amina')
    expect(p).toContain('twin-cities')
    expect(p).toContain('honesty, respect')
  })

  it('names live app state so the guide is not guessing', () => {
    const p = guideSystemPrompt('matchmaker', ctx)
    expect(p).toContain('Yusuf')
    expect(p).toContain('Omar')
  })

  it('keeps the grounding rules that make it safe to ship', () => {
    const p = guideSystemPrompt('islamic', ctx)
    expect(p).toMatch(/never invent people/i)
    expect(p).toMatch(/scholar/i)
    expect(p).toMatch(/never diagnose/i)
  })

  it('speaks in the voice of the mode it was asked for', () => {
    expect(guideSystemPrompt('auntie', ctx)).not.toBe(guideSystemPrompt('brother', ctx))
  })
})
