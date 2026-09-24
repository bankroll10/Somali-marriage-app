// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '../../src/components/ErrorBoundary'
import { resetCrashReport } from '../../src/lib/crash'
import { Phone, onPhone } from '../support/device'
import { mount } from '../support/render'
import { blobs, serve, type Served } from '../support/server'
import { day } from '../../netlify/shared/day'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * A crash on a phone reaches the founder as a count, and as nothing else
 * (src/lib/crash.ts, docs/OPS.md). Rendered: a screen that throws, inside the
 * real ErrorBoundary, over the real /health.
 */

function Broken({ why }: { why: string }): never {
  throw new Error(why)
}

let server: Served
let sent: string[]
beforeEach(() => {
  blobs.reset()
  server = serve()
  resetCrashReport()
  onPhone(new Phone('hers'))
  // Capture what the phone sends, on the way through.
  sent = []
  const through = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('/health')) sent.push(String(init?.body ?? ''))
    return through(input, init)
  }) as typeof fetch
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('a crash on a phone', () => {
  it('sends that it happened — once a page, and not one word of why', async () => {
    const m = await mount(
      <ErrorBoundary>
        <Broken why="Hodan’s answers were undefined at Home.tsx:12" />
      </ErrorBoundary>,
    )
    await m.until(() => sent.length > 0, 'the crash is sent')
    expect(m.text()).toMatch(/./)
    expect(sent).toEqual([JSON.stringify({ event: 'crash' })])
    await m.until(() => blobs.read('ops', `day/${day()}/client.crash`) === 1, 'counted')
    m.unmount()

    // A second crash on the same page load says nothing more.
    const again = await mount(
      <ErrorBoundary>
        <Broken why="again" />
      </ErrorBoundary>,
    )
    await again.settle()
    expect(sent).toHaveLength(1)
    again.unmount()
    expect(server.requests.filter((r) => r.includes('/health'))).toHaveLength(1)
  })

  it('says a screen never arrived, when that is what happened', async () => {
    const m = await mount(
      <ErrorBoundary>
        <Broken why="Failed to fetch dynamically imported module: https://niyyah.test/assets/Home-abc.js" />
      </ErrorBoundary>,
    )
    await m.until(() => sent.length > 0, 'the crash is sent')
    expect(sent).toEqual([JSON.stringify({ event: 'chunk' })])
    m.unmount()
  })
})
