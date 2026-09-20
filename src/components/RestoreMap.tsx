import { useState } from 'react'
import { restoreDetail, type RestoreProblem } from '../lib/keep'
import { CODE_LENGTH, EXAMPLE_CODE, cleanCode } from '../lib/code'
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
  const [state, setState] = useState<'idle' | 'checking' | RestoreProblem>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || state === 'checking') return
    // Checked here, before anything is spent. A code of the wrong length was
    // costing a network round trip and a second and a half to come back as
    // "no map found", which is not what was wrong (docs/NORMAN.md).
    if (code.length !== CODE_LENGTH) {
      setState('not-a-code')
      return
    }
    setState('checking')
    const result = await restoreDetail(code)
    if (typeof result === 'string') {
      setState(result)
      return
    }
    track('map_restored')
    saveProgress(result)
    window.location.href = window.location.pathname
  }

  /** One sentence per reason, because the reasons want different things done. */
  const problem: Record<RestoreProblem, string> = {
    'not-a-code': `A code is ${CODE_LENGTH} characters, like ${EXAMPLE_CODE} — check for a missing one.`,
    'not-found': 'No map is kept under that code. Check it against the one you saved.',
    expired: 'That code has lapsed. A kept map is held for a year after the last time it was kept, and this one is past that, so there is nothing left to bring back.',
    unreachable: 'We could not reach the map just now — that is us, not your code. Nothing has been changed; try again in a moment.',
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
          // A forcing function, not a validation message: a code is built from
          // an alphabet with no B, O, 0, I, 1 or S in it, chosen so nothing can
          // be misread off a cracked screen — so those characters cannot be
          // typed here either. The field used to accept every letter and digit,
          // and the placeholder itself showed three that no code can contain.
          onChange={(e) => {
            setCode(cleanCode(e.target.value))
            if (state !== 'idle' && state !== 'checking') setState('idle')
          }}
          placeholder={EXAMPLE_CODE}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={CODE_LENGTH}
          enterKeyHint="done"
          className={`w-full bg-cream/10 px-4 py-2.5 text-[1rem] tracking-[0.2em] text-cream placeholder:text-cream/30 ${fieldClass}`}
        />
        <button
          type="submit"
          disabled={!code.trim() || state === 'checking'}
          className="inline-flex flex-none items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-[0.88rem] font-medium text-forest-deep transition hover:bg-white disabled:opacity-40"
        >
          {state === 'checking' ? (
            <>
              <Spinner /> Checking…
            </>
          ) : (
            'Restore'
          )}
        </button>
      </div>
      {state !== 'idle' && state !== 'checking' && (
        <p role="status" className="mt-2 text-[0.85rem] leading-snug text-gold-soft text-pretty">
          {problem[state]}
        </p>
      )}
    </form>
  )
}
