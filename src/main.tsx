import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { codeFromUrl, restoreMap } from './lib/keep.ts'
import { saveProgress } from './lib/storage.ts'

/**
 * A restore link (`/?map=CODE`) has to land before React reads local storage,
 * because useNiyyah snapshots it once on mount. So it is resolved here, ahead
 * of the first render, and written into storage as if she had always been on
 * this device.
 *
 * Failure is a no-op by design: a wrong code, a dead function, or no network
 * simply renders the app she would have seen anyway. Recovering a map must
 * never be a way to lose one.
 */
async function restoreFromLinkIfPresent(): Promise<void> {
  const code = codeFromUrl()
  if (!code) return
  const snapshot = await restoreMap(code)
  if (snapshot) saveProgress(snapshot)
  // Drop the code from the address bar either way, so it is not left sitting
  // in her history or shared by accident when she sends someone the link.
  window.history.replaceState({}, '', window.location.pathname)
}

const root = createRoot(document.getElementById('root')!)
const render = () =>
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )

void restoreFromLinkIfPresent().then(render, render)
