import { afterEach, describe, expect, it, vi } from 'vitest'
import gate from './gate.ts'

const PASSWORD = 'open-sesame'

function withPassword(value: string | undefined) {
  vi.stubGlobal('Netlify', { env: { get: () => value } })
}

function req(auth?: string): Request {
  return new Request('https://niyyah.example/', {
    headers: auth ? { authorization: auth } : {},
  })
}

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`

afterEach(() => vi.unstubAllGlobals())

describe('the founding-preview gate', () => {
  it('lets everyone through when no password is configured', async () => {
    // A missing variable must never lock the owner out of their own site.
    withPassword(undefined)
    expect(await gate(req())).toBeUndefined()
  })

  it('challenges a request with no credentials', async () => {
    withPassword(PASSWORD)
    const res = await gate(req())
    expect(res?.status).toBe(401)
    expect(res?.headers.get('WWW-Authenticate')).toMatch(/^Basic realm=/)
  })

  it('never lets a challenge or the app sit in a shared cache', async () => {
    withPassword(PASSWORD)
    expect((await gate(req()))?.headers.get('Cache-Control')).toBe('no-store')
  })

  it('admits the correct password', async () => {
    withPassword(PASSWORD)
    expect(await gate(req(basic('anyone', PASSWORD)))).toBeUndefined()
  })

  it('ignores the username — only the password decides', async () => {
    withPassword(PASSWORD)
    expect(await gate(req(basic('', PASSWORD)))).toBeUndefined()
    expect(await gate(req(basic('hooyo', PASSWORD)))).toBeUndefined()
  })

  it('accepts a password containing a colon', async () => {
    // "user:pass:word" must split on the FIRST colon, not the last.
    withPassword('pass:word')
    expect(await gate(req(basic('u', 'pass:word')))).toBeUndefined()
  })

  it('rejects a wrong password', async () => {
    withPassword(PASSWORD)
    expect((await gate(req(basic('u', 'wrong'))))?.status).toBe(401)
  })

  it('rejects a password that is only a prefix of the real one', async () => {
    withPassword(PASSWORD)
    expect((await gate(req(basic('u', 'open'))))?.status).toBe(401)
  })

  it('rejects a password that merely starts with the real one', async () => {
    withPassword(PASSWORD)
    expect((await gate(req(basic('u', PASSWORD + 'x'))))?.status).toBe(401)
  })

  it('rejects an empty password when one is required', async () => {
    withPassword(PASSWORD)
    expect((await gate(req(basic('u', ''))))?.status).toBe(401)
  })

  it('rejects a non-Basic scheme', async () => {
    withPassword(PASSWORD)
    expect((await gate(req(`Bearer ${PASSWORD}`)))?.status).toBe(401)
  })

  it('accepts the scheme case-insensitively, as the RFC requires', async () => {
    withPassword(PASSWORD)
    expect(await gate(req(`basic ${btoa(`u:${PASSWORD}`)}`))).toBeUndefined()
  })

  it('survives malformed input instead of throwing at the edge', async () => {
    withPassword(PASSWORD)
    for (const bad of ['Basic', 'Basic !!!not-base64!!!', 'Basic ' + btoa('nocolon'), '']) {
      const res = await gate(req(bad))
      expect(res?.status, `should challenge: ${bad || '(empty)'}`).toBe(401)
    }
  })

  it('never leaks the password in the challenge body', async () => {
    withPassword(PASSWORD)
    const res = await gate(req())
    expect(await res!.text()).not.toContain(PASSWORD)
  })
})
