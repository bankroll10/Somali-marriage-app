/**
 * The offline shell.
 *
 * An audit of Niyyah as a linked-to product (docs/LINKS.md) found the gap
 * `index.html` had been promising since the manifest and the home-screen
 * meta tags went in: nothing registered a service worker, so a member who
 * saved Niyyah to her home screen and opened it with no signal saw the
 * browser's own "no internet connection" page — not Niyyah's, not even
 * styled, before any of the product's own honest failure states (docs/FAIL.md)
 * had a chance to say anything. Confirmed in Chromium: an offline reload
 * failed at `net::ERR_INTERNET_DISCONNECTED`, before a single byte of this
 * app ran.
 *
 * This is the smallest thing that closes that gap, and it does exactly one
 * job: keep the shell — the built HTML, JS, CSS and fonts — available from
 * a previous visit, so the app itself loads offline and its own state
 * (everything already lives in localStorage) and its own fail-open network
 * code (docs/FAIL.md) take it from there. It is not offline data sync, not a
 * write queue, not a push channel — none of those exist here and this does
 * not add them.
 *
 * Two rules keep it from becoming something else:
 *
 *  1. **Network first, cache only as a fallback.** Every request tries the
 *     network before the cache, so a member who is online always gets
 *     whatever shipped most recently — this app deploys often — and the
 *     cache only speaks when the network could not be reached at all.
 *     Nothing here can make a stale build stick around for someone who has
 *     a connection.
 *  2. **`/.netlify/*` is never touched.** Every write and every live read —
 *     the guide, a map restore, a couple's answer, a vouch — goes straight
 *     to the network, exactly as it always has. Caching an API response
 *     would mean showing her a stale map or a stale answer as if it were
 *     current, which is a correctness and a trust problem this file is not
 *     worth causing to fix a loading one.
 *
 * `version` changes exactly when the built bundle does (vite.config.ts hashes
 * the asset list), so `activate` can drop every cache from a previous build
 * without a manifest to maintain by hand.
 */
export function serviceWorkerJs(version: string): string {
  return `const CACHE = 'niyyah-shell-${version}'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // The API: live data only, never served from a cache.
  if (url.pathname.startsWith('/.netlify/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        // A navigation to a path this device never cached, offline: the app
        // shell itself, so the SPA can at least render — matching what the
        // single-page rewrite already does for every unknown path online.
        if (request.mode === 'navigate') {
          const shell = await caches.match('/index.html')
          if (shell) return shell
        }
        return Response.error()
      }),
  )
})
`
}
