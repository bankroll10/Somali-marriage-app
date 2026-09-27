import couple from '../../netlify/functions/couple'
import exportFn from '../../netlify/functions/export'
import guide from '../../netlify/functions/guide'
import health from '../../netlify/functions/health'
import introduce from '../../netlify/functions/introduce'
import keep from '../../netlify/functions/keep'
import progress from '../../netlify/functions/progress'
import safety from '../../netlify/functions/safety'
import sweep from '../../netlify/functions/sweep'
import { blobs } from './blobs'

/**
 * Netlify, in a box (docs/TESTING.md).
 *
 * The client code calls `fetch('/.netlify/functions/keep')`; the server code
 * answers a `Request`. In production a network and Netlify sit between them.
 * Here `serve()` puts the real handlers straight behind `fetch`, over the
 * in-memory Blobs in ./blobs.ts, so one test can run what a member's phone
 * does and what the server does with it — the whole path, with nothing but
 * the network taken out.
 *
 * A test file that uses this must also mock the store:
 *   vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)
 */

type Handler = (req: Request) => Promise<Response>

export const HANDLERS: Record<string, Handler> = {
  couple,
  export: exportFn,
  // The guide takes Netlify's context as well; nothing here reads it.
  guide: (req) => guide(req, {} as never),
  health,
  introduce,
  keep,
  progress,
  safety,
  sweep,
}

/** The founder's key, long enough to be a real one. */
export const FOUNDER_KEY = 'test-founder-key-that-is-long-enough-to-mean-it'
export const FOUNDER = { authorization: `Bearer ${FOUNDER_KEY}` }

/** Where relative URLs resolve, as a browser on the site would. */
export const ORIGIN = 'https://niyyah.test'

export interface Served {
  /** Every request the client made, method and path, in order. */
  requests: string[]
  /** Take the server away (true), or only for paths matching a pattern; `false` brings it back. */
  down(on: boolean | RegExp): void
  /**
   * Lose the answer: the handler runs and writes whatever it writes, and the
   * phone hears nothing — a timeout after the write landed. `false` stops it.
   */
  lose(on: RegExp | false): void
  /**
   * Hold matching requests before the handler runs, until the returned
   * function is called — a request still in flight while the phone does
   * something else.
   */
  hold(on: RegExp, method?: string): () => void
}

/** Put the real handlers behind `fetch`. Returns a handle to watch or break it. */
export function serve(): Served {
  process.env.FOUNDER_KEY = FOUNDER_KEY
  let outage: boolean | RegExp = false
  let lost: RegExp | false = false
  let holding: { on: RegExp; method: string; until: Promise<void> } | null = null
  const requests: string[] = []
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, ORIGIN)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    requests.push(`${method} ${url.pathname}${url.search}`)
    if (outage === true || (outage instanceof RegExp && outage.test(url.pathname))) throw new TypeError('Failed to fetch')
    if (holding && holding.method === method && holding.on.test(url.pathname)) await holding.until
    const name = url.pathname.match(/^\/\.netlify\/functions\/([a-z]+)$/)?.[1]
    if (name && HANDLERS[name]) {
      const req = new Request(url, { method, headers: init?.headers, body: init?.body, signal: init?.signal })
      const res = await HANDLERS[name](req)
      if (lost && lost.test(url.pathname)) throw new TypeError('Failed to fetch')
      return res
    }
    return new Response('not found', { status: 404 })
  }
  globalThis.fetch = fetcher as typeof fetch
  return {
    requests,
    down(on) {
      outage = on
    },
    lose(on) {
      lost = on
    },
    hold(on, method = 'POST') {
      let release = () => {}
      const until = new Promise<void>((r) => {
        release = r
      })
      holding = { on, method, until }
      return () => {
        holding = null
        release()
      }
    },
  }
}

/** One request straight to a handler, as a test would make it. */
export function call(name: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return HANDLERS[name](
    new Request(`${ORIGIN}/.netlify/functions/${path}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )
}

export { blobs }
