import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { entryFromUrl, rememberEntry, rememberedEntry, type Entry } from './lib/entry.ts'
import { adoptMap, rememberedCode, restoreMap } from './lib/keep.ts'
import { rememberVia } from './lib/progress.ts'
import { loadProgress, type PersistedState } from './lib/storage.ts'

/**
 * Links into Niyyah are resolved before React reads local storage, because
 * useNiyyah snapshots it once on mount.
 *
 *   /?map=CODE     — a kept map comes back, once she has said it is hers
 *                    (src/components/ConfirmRestore.tsx, docs/SECURITY.md O2).
 *   /?couple=CODE  — he is opening the eleven she sent; the app starts on his screen.
 *   /?read · /?eleven · /?families
 *                  — someone sent them the words; they land on the instrument.
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
/** A map a link fetched, waiting for her to say whether it is hers. */
interface Pending {
  code: string
  snapshot: PersistedState
}

async function resolveEntry(): Promise<{ entry: Entry | null; pending?: Pending }> {
  const entry = entryFromUrl(window.location.search, window.location.pathname)
  // No link in the bar: this may be a reload of one. The held entry is the
  // couple screen this device was part-way through.
  if (!entry) return { entry: rememberedEntry() }
  // Before the query is stripped, and to its own key — storage the app reads
  // on mount is untouched.
  if (entry.via) rememberVia(entry.via)
  // A coded link survives the strip, so a reload lands back on the screen it
  // opened rather than on the marketing page (src/lib/entry.ts).
  rememberEntry(entry)
  // Stripped before any round trip, so a code never sits in the bar (or in a
  // screenshot of it) while the network answers — docs/SECURITY.md T10.
  window.history.replaceState({}, '', window.location.pathname)
  if (entry.kind === 'map' && entry.code) {
    // Her own link, on the phone that already holds her map: nothing to
    // bring. The phone is newer than the server's copy, which would only
    // roll it back.
    if (entry.code === rememberedCode()) return { entry: null }
    const snapshot = await restoreMap(entry.code)
    // Fetched, never applied here. She is asked first (docs/SECURITY.md, O2).
    return { entry: null, ...(snapshot ? { pending: { code: entry.code, snapshot } } : {}) }
  }
  return { entry }
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

/**
 * A restore link waits on her answer before the app reads storage — useNiyyah
 * snapshots it once, on mount. The screen is its own chunk: almost nobody
 * arrives by a restore link, so the first paint never pays for it.
 */
async function confirm({ code, snapshot }: Pending): Promise<void> {
  const { default: ConfirmRestore } = await import('./components/ConfirmRestore.tsx')
  await new Promise<void>((done) =>
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <ConfirmRestore
            code={code}
            incoming={snapshot}
            current={loadProgress()}
            ownCode={rememberedCode()}
            onDone={(mine) => {
              if (mine) adoptMap(code, snapshot)
              done()
            }}
          />
        </ErrorBoundary>
      </StrictMode>,
    ),
  )
}

void resolveEntry().then(
  async ({ entry, pending }) => {
    if (pending) await confirm(pending).catch(() => {})
    render(entry)
  },
  () => render(null),
)

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
