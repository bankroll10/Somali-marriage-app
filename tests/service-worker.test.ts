import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { serviceWorkerJs } from '../src/lib/serviceWorker'

/**
 * The offline shell (docs/DESIGN.md) — kept honest the same way
 * tests/tools.test.ts holds the tool pages to the rest of the app: the
 * generator, the build wiring, and the header rule all have to agree.
 */

describe('the worker script', () => {
  const js = serviceWorkerJs('abc123')

  it('names its own cache by the version it was given', () => {
    expect(js).toContain("const CACHE = 'niyyah-shell-abc123'")
  })

  it('never touches the API — live data only, never a cache', () => {
    expect(js).toMatch(/pathname\.startsWith\('\/\.netlify\/'\)/)
  })

  it('never intercepts a write', () => {
    expect(js).toMatch(/request\.method !== 'GET'/)
  })

  it('tries the network before the cache, on every request', () => {
    const fetchHandler = js.slice(js.indexOf("addEventListener('fetch'"))
    const networkIndex = fetchHandler.indexOf('fetch(request)')
    const cacheIndex = fetchHandler.indexOf('caches.match(key)')
    expect(networkIndex).toBeGreaterThan(-1)
    expect(cacheIndex).toBeGreaterThan(networkIndex)
  })

  it('drops every cache but its own on activate, so an old deploy cannot linger', () => {
    expect(js).toContain("keys.filter((k) => k !== CACHE)")
    expect(js).toContain('caches.delete(k)')
  })

  // docs/SECURITY.md, T3: the first version keyed every response on its full
  // URL, so opening `/?map=ACDEFG` wrote a live map code into Cache Storage.
  it('keys a navigation by path alone — no ?map=, ?couple= or ?vouch= code ever lands on disk', () => {
    expect(js).toContain("request.mode === 'navigate' ? new Request(url.origin + url.pathname) : request")
    expect(js).toContain('cache.put(key, copy)')
    expect(js).not.toMatch(/cache\.put\(request/)
    expect(js).not.toMatch(/caches\.match\(request\)/)
  })

  it('falls back to the shell as it was actually cached, at the root', () => {
    // `/index.html` is never a key — the shell is cached under `/`, so that
    // fallback could never hit.
    expect(js).toContain("caches.match('/')")
    expect(js).not.toContain("caches.match('/index.html')")
  })
})

describe('what the build is wired to do', () => {
  const vite = readFileSync('vite.config.ts', 'utf8')

  it('writes sw.js from a hash of the asset list, not a timestamp', () => {
    expect(vite).toContain("from './src/lib/serviceWorker.js'")
    expect(vite).toContain("fileName: 'sw.js'")
    expect(vite).toContain('serviceWorkerJs(version)')
    expect(vite).toMatch(/createHash\('sha256'\)/)
    // The worker's own source is in the hash, so a change to the worker alone
    // rotates the cache — otherwise a fix to what it stores would never evict
    // what the old rules already wrote.
    expect(vite).toContain(".update(serviceWorkerJs(''))")
  })
})

describe('what serves it', () => {
  it('main.tsx registers it in production only, after load', () => {
    const main = readFileSync('src/main.tsx', 'utf8')
    expect(main).toContain("navigator.serviceWorker.register('/sw.js')")
    expect(main).toMatch(/'serviceWorker' in navigator && import\.meta\.env\.PROD/)
    expect(main).toContain("addEventListener('load'")
  })

  it('netlify.toml never lets a browser cache the worker script itself', () => {
    const toml = readFileSync('netlify.toml', 'utf8')
    expect(toml).toMatch(/for = "\/sw\.js"/)
    expect(toml).toMatch(/Cache-Control = "no-cache"/)
  })
})

/**
 * The demo (docs/DECISIONS.md, release R4) is a separate page at /demo/ with
 * assets under /demo-assets/. The worker runs the real script in a sandbox, as
 * a browser would: for those paths it must not answer at all, so nothing of the
 * demo is cached and the app shell is never served in its place.
 */

const ORIGIN = 'https://niyyah.test'

/** Runs a worker script against a fake Cache Storage, and offers the events a browser would send it. */
function sandbox(src: string, existing: string[] = []) {
  const store = new Map<string, Map<string, unknown>>(existing.map((k) => [k, new Map()]))
  const fetched: string[] = []
  const listeners: Record<string, (event: unknown) => void> = {}
  const self = {
    location: { origin: ORIGIN },
    clients: { claim: async () => undefined },
    skipWaiting: () => undefined,
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners[type] = fn
    },
  }
  const caches = {
    keys: async () => [...store.keys()],
    delete: async (k: string) => store.delete(k),
    match: async () => undefined,
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map())
      return { put: async (req: { url: string }) => void store.get(name)!.set(req.url, true) }
    },
  }
  const fetchStub = async (req: { url: string }) => {
    fetched.push(req.url)
    return new Response('ok', { status: 200 })
  }
  vm.runInNewContext(src, { self, caches, fetch: fetchStub, Request, Response, URL })
  return {
    store,
    fetched,
    /** A GET for `path`. `handled` says whether the worker took it over; `cached` lists what it wrote to Cache Storage. */
    async get(path: string, mode: 'navigate' | 'no-cors' = 'navigate') {
      let handled = false
      let answer: Promise<unknown> | undefined
      listeners.fetch({
        request: { method: 'GET', url: ORIGIN + path, mode },
        respondWith: (p: Promise<unknown>) => {
          handled = true
          answer = p
        },
      })
      if (answer) await answer
      await new Promise((r) => setImmediate(r))
      return { handled, cached: [...store.values()].flatMap((m) => [...m.keys()]) }
    },
    async activate() {
      let done: Promise<unknown> = Promise.resolve()
      listeners.activate({ waitUntil: (p: Promise<unknown>) => void (done = p) })
      await done
    },
  }
}

const DEMO_PATHS = ['/demo', '/demo/', '/demo/index.html', '/demo/?x=1', '/demo-assets/index-abc123.js', '/demo-assets/index-abc123.css', '/demo-assets/font-1.woff2']

describe('the demo is never answered or cached by the worker', () => {
  const js = serviceWorkerJs('abc123')

  it('says so in the script, by exact path and prefix', () => {
    expect(js).toContain("url.pathname === '/demo'")
    expect(js).toContain("url.pathname.startsWith('/demo/')")
    expect(js).toContain("url.pathname.startsWith('/demo-assets/')")
  })

  it('leaves the demo page and its assets to the network: no respondWith, nothing written to Cache Storage', async () => {
    for (const path of DEMO_PATHS) {
      const w = sandbox(js)
      const r = await w.get(path, path.startsWith('/demo-assets/') ? 'no-cors' : 'navigate')
      expect(r.handled, path).toBe(false)
      expect(r.cached, path).toEqual([])
      expect(w.fetched, path).toEqual([])
    }
  })

  it('still answers the app, a tool page and a look-alike path, and caches them by path', async () => {
    for (const path of ['/', '/tools/read/', '/demonstration', '/demo-assetsx/a.js', '/assets/index-xyz.js']) {
      const w = sandbox(js)
      const r = await w.get(path)
      expect(r.handled, path).toBe(true)
      expect(r.cached, path).toEqual([ORIGIN + path])
    }
  })

  it('still never touches the API', async () => {
    const w = sandbox(js)
    expect((await w.get('/.netlify/functions/guide')).handled).toBe(false)
  })
})

describe('a visitor who already has the previous worker (docs/DECISIONS.md, release R4)', () => {
  const old = readFileSync('tests/fixtures/sw/shell-3eb7f64.txt', 'utf8')
  const next = serviceWorkerJs('after-demo')

  it('the previous worker, as shipped on 3eb7f64, answers and caches /demo/ and its assets for as long as it stays in charge: before the new worker activates, the demo is not covered', async () => {
    const w = sandbox(old)
    const page = await w.get('/demo/')
    expect(page.handled).toBe(true)
    expect(page.cached).toContain(ORIGIN + '/demo/')
    const asset = await w.get('/demo-assets/index-abc123.js', 'no-cors')
    expect(asset.handled).toBe(true)
    // What it caches is the demo’s own static files; the demo reads and writes no storage, so no answer is in them.
    expect(asset.cached).toContain(ORIGIN + '/demo-assets/index-abc123.js')
  })

  it('the new worker, once it takes over, deletes every cache the previous one wrote, including any copy of the demo', async () => {
    const w = sandbox(next, ['niyyah-shell-before-demo', 'niyyah-shell-after-demo'])
    await w.activate()
    expect([...w.store.keys()]).toEqual(['niyyah-shell-after-demo'])
  })

  it('takes over at once: install skips waiting and activate claims open pages', () => {
    expect(next).toContain('self.skipWaiting()')
    expect(next).toContain('self.clients.claim()')
  })

  it('a changed worker rotates its cache name through the build hash, so every returning visitor picks it up', () => {
    const vite = readFileSync('vite.config.ts', 'utf8')
    expect(vite).toContain('.update(serviceWorkerJs(\'\'))')
    expect(serviceWorkerJs('')).not.toBe(old.replace('before-demo', ''))
  })
})
