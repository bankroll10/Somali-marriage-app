import { useState } from 'react'
import { keepMap, rememberedCode, restoreLink } from '../lib/keep'
import { SITE_URL } from '../lib/site'
import { track } from '../lib/analytics'
import { ArrowRight, CheckIcon, Spinner } from './ui'

/**
 * "Keep this map."
 *
 * Everything she has done so far lives in this browser and nowhere else. Clear
 * Safari, lose the phone, or open Niyyah on a laptop and it is gone — thirteen
 * honest answers and the only reading anyone has ever given her.
 *
 * This is offered rather than assumed, and it is a trade she can see: the map
 * survives, and it can be opened somewhere else. No account, no password, no
 * email — a code, because the cheapest way to keep a promise about privacy is
 * to hold as little as possible.
 */
export default function KeepMap() {
  const [code, setCode] = useState<string | null>(() => rememberedCode())
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [copied, setCopied] = useState(false)

  async function keep() {
    setState('saving')
    const result = await keepMap()
    if (!result) {
      setState('error')
      return
    }
    track('map_kept')
    setCode(result)
    setState('idle')
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

  if (code) {
    return (
      <div className="rounded-card border border-forest/25 bg-forest/[0.06] p-6">
        <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">
          <CheckIcon size={12} /> Your map is kept
        </p>
        <p className="mt-2.5 text-[0.92rem] leading-relaxed text-ink-soft text-pretty">
          Write this down somewhere, or send yourself the link. It opens your map
          on any phone, even if you lose this one.
        </p>
        <p className="mt-4 select-all text-center font-display text-[2rem] font-medium tracking-[0.3em] text-forest tabular-nums">
          {code}
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
          Kept: your answers and your map, nothing else. No name is attached to
          the code, and anyone without it cannot reach it.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-white/60 p-6">
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
