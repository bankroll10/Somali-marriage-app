import { Component, type ReactNode } from 'react'
import { clearProgress } from '../lib/storage'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last line of defense — a render error anywhere shows a calm, branded recovery
 * screen instead of a blank page. "Start over" also clears storage in case the
 * persisted state itself is what's crashing us.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // In production this is where we'd report to an error tracker.
    console.error('[niyyah] render error:', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-forest-deep px-6 text-center text-cream">
        <div className="bg-geo pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative max-w-sm">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none" className="mx-auto" aria-hidden>
            <path
              d="M32 13c-6.5 8.5-12.5 12.8-12.5 21A12.5 12.5 0 0 0 44.5 34c0-8.2-6-12.5-12.5-21Z"
              stroke="var(--color-gold-soft)"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="35" r="4" fill="var(--color-gold-soft)" />
          </svg>
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight">
            Something went wrong.
          </h1>
          <p className="mt-3 text-[0.98rem] leading-relaxed text-cream/70">
            Not your fault. Reload to pick up where you left off — your reflection
            is saved.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-gold-soft px-7 py-3 text-[0.95rem] font-medium text-forest-deep transition hover:bg-gold"
            >
              Reload
            </button>
            <button
              onClick={() => {
                clearProgress()
                window.location.reload()
              }}
              className="text-sm text-cream/50 underline-offset-4 transition hover:text-cream hover:underline"
            >
              Start completely fresh
            </button>
          </div>
        </div>
      </div>
    )
  }
}
