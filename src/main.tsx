import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { entryFromUrl, rememberEntry, rememberedEntry, type Entry } from './lib/entry.ts'
import { restoreMap } from './lib/keep.ts'
import { rememberVia } from './lib/progress.ts'
import { saveProgress } from './lib/storage.ts'

/**
 * Links into Niyyah are resolved before React reads local storage, because
 * useNiyyah snapshots it once on mount.
 *
 *   /?map=CODE     — a kept map comes back; written into storage as if she had
 *                    always been on this device.
 *   /?couple=CODE  — he is opening the eleven she sent; the app starts on his screen.
 *   /?vouch=CODE   — a family member is arriving to vouch for her.
 *   /?read · /?eleven · /?families
 *                  — someone sent them the words; they land on the instrument.
 *   /?door         — someone who is looking, not talking; they land on the number.
 *   /tools/…       — the read and the eleven at an address of their own
 *                    (src/data/tools.ts); the path stays in the bar.
 *   &via=…         — what kind of link it was, remembered once for the ladder.
 *
 * Failure is a no-op by design: a wrong code, a dead function, or no network
 * simply renders the app she would have seen anyway. The query is dropped from
 * the address bar either way, so a code is not left sitting in history or
 * shared by accident when she sends someone the link. The path is kept: it
 * carries no code, and it is what makes a reload land where the link did.
 */
async function resolveEntry(): Promise<Entry | null> {
  const entry = entryFromUrl(window.location.search, window.location.pathname)
  // No link in the bar: this may be a reload of one. The held entry is the
  // couple or vouch screen this device was part-way through.
  if (!entry) return rememberedEntry()
  // Before the query is stripped, and to its own key — storage the app reads
  // on mount is untouched.
  if (entry.via) rememberVia(entry.via)
  // A coded link survives the strip, so a reload lands back on the screen it
  // opened rather than on the marketing page (src/lib/entry.ts).
  rememberEntry(entry)
  if (entry.kind === 'map' && entry.code) {
    const snapshot = await restoreMap(entry.code)
    if (snapshot) saveProgress(snapshot)
  }
  window.history.replaceState({}, '', window.location.pathname)
  // A restored map needs no screen of its own; every other kind does.
  return entry.kind === 'map' ? null : entry
}

const root = createRoot(document.getElementById('root')!)
const render = (entry: Entry | null) =>
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App entry={entry} />
      </ErrorBoundary>
    </StrictMode>,
  )

void resolveEntry().then(render, () => render(null))

// The offline shell (src/lib/serviceWorker.ts, docs/LINKS.md). Production
// only — a dev-server module graph has nothing in common with a built
// shell, and a worker left registered from `npm run dev` would keep
// serving a stale localhost cache after the server stops. After `load`,
// so registration never competes with the first paint for the network.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // No offline shell this session — every screen still works online,
      // exactly as it did before this existed.
    })
  })
}
