import { useState } from 'react'
import { restoreMap } from '../lib/keep'
import { saveProgress } from '../lib/storage'
import { track } from '../lib/analytics'
import { Spinner, fieldClass } from './ui'

/**
 * The other half of keeping a map: getting it back.
 *
 * Deliberately quiet — a line of text until she taps it. Someone arriving for
 * the first time should be met by the question the app exists to answer, not by
 * a login. This is only ever for the person who already has a code, and it is
 * the reason keeping one is worth anything.
 *
 * On success the whole page reloads rather than threading restored state
 * through React: useNiyyah reads storage once at mount, so a reload is both the
 * simplest correct answer and the one least likely to leave her half-restored.
 */
export default function RestoreMap() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || state === 'checking') return
    setState('checking')
    const snapshot = await restoreMap(code)
    if (!snapshot) {
      setState('error')
      return
    }
    track('map_restored')
    saveProgress(snapshot)
    window.location.href = window.location.pathname
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="animate-fade mt-5 inline-flex w-fit text-sm font-medium text-cream/55 underline-offset-4 transition hover:text-cream/80 hover:underline"
        style={{ animationDelay: '380ms' }}
      >
        Already have a code? Bring your map back
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="animate-rise mt-5 w-full max-w-xs">
      <label htmlFor="restore-code" className="block text-sm font-medium text-cream/70">
        Your code
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="restore-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={9}
          className={`w-full bg-cream/10 px-4 py-2.5 text-[1rem] tracking-[0.2em] text-cream placeholder:text-cream/30 ${fieldClass}`}
        />
        <button
          type="submit"
          disabled={!code.trim() || state === 'checking'}
          className="inline-flex flex-none items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-[0.88rem] font-medium text-forest-deep transition hover:bg-white disabled:opacity-40"
        >
          {state === 'checking' ? <Spinner /> : 'Restore'}
        </button>
      </div>
      {state === 'error' && (
        <p className="mt-2 text-[0.85rem] leading-snug text-gold-soft text-pretty">
          No map found for that code. Check it and try again — nothing here has
          been changed.
        </p>
      )}
    </form>
  )
}
