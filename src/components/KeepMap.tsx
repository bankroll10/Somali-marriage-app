import { useState } from 'react'
import { keepMap, rememberedCode, restoreLink, rotateCode } from '../lib/keep'
import { formatCode } from '../lib/code'
import { SITE_URL } from '../lib/site'
import { Announce, ArrowRight, CheckIcon, Spinner } from './ui'

/**
 * "Keep this map."
 *
 * Everything she has done so far lives in this browser and nowhere else. Clear
 * Safari, lose the phone, or open Niyyah on a laptop and it is gone — sixteen
 * honest answers and the only reading anyone has ever given her.
 *
 * This is offered rather than assumed, and it is a trade she can see: the map
 * survives, and it can be opened somewhere else. No account, no password, no
 * email — a code, because the cheapest way to keep a promise about privacy is
 * to hold as little as possible.
 */
interface Props {
  /**
   * Keeping the map is a rung, and the hook holds the code in state — so
   * without this the ladder would not learn about it until a remount.
   */
  onKept?: (code: string) => void
}

export default function KeepMap({ onKept }: Props = {}) {
  const [code, setCode] = useState<string | null>(() => rememberedCode())
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  // Changing the code: closed, asking, working, or failed.
  const [change, setChange] = useState<'closed' | 'asking' | 'working' | 'failed'>('closed')
  const [changed, setChanged] = useState(false)

  async function keep() {
    setState('saving')
    const result = await keepMap()
    if (!result) {
      setState('error')
      return
    }
    setCode(result)
    onKept?.(result)
    setState('idle')
  }

  async function changeCode() {
    setChange('working')
    const next = await rotateCode()
    if (!next) {
      setChange('failed')
      return
    }
    setCode(next)
    onKept?.(next)
    setChanged(true)
    setChange('closed')
  }

  async function copyLink() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(restoreLink(code, SITE_URL))
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard refused — the code is on screen to copy by hand */
    }
  }

  const announcement =
    changed
      ? `Your map now has a new code, ${code?.split('').join(' ')}. The old one opens nothing.`
      : state === 'error'
      ? 'That did not save. Your map is still on this phone.'
      : copied
        ? 'The link is copied.'
        : code
          ? `Your map is kept under the code ${code.split('').join(' ')}.`
          : ''

  if (code) {
    return (
      <div className="rounded-card border border-forest/25 bg-forest/[0.06] p-6">
        <Announce message={announcement} />
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
          <CheckIcon size={12} /> Your map is kept
        </p>
        <p className="mt-2.5 text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
          Write this down somewhere, or send yourself the link. It opens your map
          on any phone, even if you lose this one.
        </p>
        <p className="mt-4 select-all text-center font-display text-[2rem] font-medium tracking-[0.3em] text-forest tabular-nums">
          {formatCode(code)}
        </p>
        <button
          onClick={copyLink}
          className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-forest/30 px-5 py-2.5 text-[0.88rem] font-medium text-forest transition hover:bg-forest/[0.06]"
        >
          {copied ? (
            <>
              <CheckIcon size={13} /> Link copied
            </>
          ) : (
            'Copy the link'
          )}
        </button>
        <p className="mt-3 text-[0.78rem] leading-relaxed text-muted text-pretty">
          Kept, under a code with no name on it. Anyone without the code cannot
          reach it — and anyone with it can, so keep it to yourself. Niyyah will
          never ask you for it.
        </p>
        {/* A code someone has seen is a key someone holds. This used to have one
            remedy, forget me, which cost her everything (docs/SECURITY.md). */}
        {changed ? (
          <p className="mt-3 text-[0.82rem] leading-relaxed text-forest text-pretty">
            New code. The old one opens nothing now, and any link with it in is dead.
          </p>
        ) : change === 'closed' ? (
          <button
            onClick={() => setChange('asking')}
            className="mt-3 text-[0.82rem] font-medium text-muted underline-offset-4 hover:underline"
          >
            Has someone else seen this code? Change it.
          </button>
        ) : (
          <div className="mt-3 rounded-xl border border-line bg-white/70 p-4">
            <p className="text-[0.85rem] leading-relaxed text-ink-soft text-pretty">
              You get a new code, and everything kept under this one moves to it. The old code and
              every link with it stop working. Nothing on this phone changes.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={changeCode}
                disabled={change === 'working'}
                className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-[0.85rem] font-medium text-cream transition hover:bg-forest-deep disabled:opacity-50"
              >
                {change === 'working' ? (
                  <>
                    <Spinner /> Changing it…
                  </>
                ) : (
                  'Change my code'
                )}
              </button>
              <button onClick={() => setChange('closed')} className="text-[0.85rem] font-medium text-muted hover:underline">
                Not now
              </button>
            </div>
            {change === 'failed' && (
              <p role="status" className="mt-2 text-[0.82rem] text-clay">
                That didn’t go through — your code is unchanged. Try again in a moment.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-white/60 p-6">
      <Announce message={announcement} />
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">
        Right now this lives only here
      </p>
      <p className="mt-2.5 font-display text-[1.3rem] font-medium leading-snug tracking-tight text-ink text-balance">
        Don’t lose your map.
      </p>
      <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
        Everything you just answered is saved in this browser and nowhere else.
        Clear it, or pick up a different phone, and it’s gone. Keep it and you
        get a short code that brings it back anywhere.
      </p>
      <button
        onClick={keep}
        disabled={state === 'saving'}
        className="group mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[0.9rem] font-medium text-cream transition hover:bg-forest-deep disabled:opacity-50"
      >
        {state === 'saving' ? (
          <>
            <Spinner /> Keeping it…
          </>
        ) : (
          <>
            Keep this map
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
      {state === 'error' && (
        <p className="mt-3 text-[0.85rem] leading-relaxed text-clay text-pretty">
          That didn’t save — nothing is lost, your map is still right here. Try
          again in a moment.
        </p>
      )}
      <p className="mt-3 text-[0.78rem] leading-relaxed text-muted text-pretty">
        Only if you want it. Your first name, your answers, your map and what you’ve
        done here are copied to our server so the code can find them again. Not your
        email or phone, and nothing from the guide. The code is registered to nobody.
      </p>
    </div>
  )
}
