import { readFileSync } from 'node:fs'
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
