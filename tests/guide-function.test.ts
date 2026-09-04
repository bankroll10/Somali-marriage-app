import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The guide's health check makes a live Anthropic call. Open, it is the
 * cheapest way anyone could run up the bill; behind the founder key it is a
 * diagnostic the founder can open from a phone. The SDK is mocked so nothing
 * here ever reaches the network.
 */

const create = vi.fn(async () => ({ stop_reason: 'end_turn' }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

const { default: handler } = await import('../netlify/functions/guide')
const health = (headers: Record<string, string> = {}) =>
  handler(new Request('http://x/.netlify/functions/guide', { headers }), {} as never)

afterEach(() => {
  vi.unstubAllEnvs()
  create.mockClear()
})

describe('the health check', () => {
  it('needs the founder key once one is set, and makes no call without it', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    expect((await health()).status).toBe(401)
    expect((await health({ authorization: 'Bearer nope' })).status).toBe(401)
    expect(create).not.toHaveBeenCalled()

    const ok = await health({ authorization: 'Bearer open-sesame' })
    expect(ok.status).toBe(200)
    const body = await ok.json()
    expect(body.keyPresent).toBe(true)
    expect(body.call).toBe('ok')
    expect(JSON.stringify(body)).not.toContain('sk-ant-test')
  })

  it('with no founder key configured it still answers, and with no API key it says the guide is off', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const res = await health()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.keyPresent).toBe(false)
    expect(body.call).toBeUndefined()
    expect(create).not.toHaveBeenCalled()
  })
})
