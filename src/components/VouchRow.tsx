import { useState } from 'react'
import type { VouchState } from '../types'
import { keepMap, rememberedCode } from '../lib/keep'
import { shareOrCopy } from '../lib/share'
import { withVia } from '../lib/links'
import { SITE_URL } from '../lib/site'
import { vouchLink } from '../lib/vouch'
import { relationshipLabel } from '../data/vouch'
import { CheckIcon } from './ui'

interface Props {
  vouch: VouchState | null
  /** Her map is kept on the way — a vouch attaches to a code. */
  onKept: (code: string) => void
}

/** The words a family member reads first, so they are written in one place. */
const ASK =
  'Salaam — I’m using Niyyah, a marriage platform built for us. Before anyone is introduced, they ask a family member to confirm I am who I say and that I’m seeking marriage. Would you? It takes a minute, and there’s no account.'

/**
 * The ask, and the vouch once it is given.
 *
 * A vouch is the only verification this product claims, and the only thing a
 * competitor cannot manufacture — so the ask belongs wherever she has just
 * finished something and can see why it matters, not only buried on a profile
 * screen she may never open.
 */
export default function VouchRow({ vouch, onKept }: Props) {
  const [asking, setAsking] = useState<'idle' | 'working' | 'sent' | 'error'>('idle')

  async function askFamily() {
    setAsking('working')
    const code = rememberedCode() ?? (await keepMap())
    if (!code) {
      setAsking('error')
      return
    }
    onKept(code)
    const result = await shareOrCopy({ text: ASK, url: withVia(vouchLink(code, SITE_URL), 'family') }, 'vouch_asked')
    setAsking(result === 'cancelled' ? 'idle' : 'sent')
    if (result !== 'cancelled') window.setTimeout(() => setAsking('idle'), 2600)
  }

  if (vouch) {
    return (
      <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-forest/25 bg-forest/[0.06] px-4 py-3">
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-forest text-cream">
          <CheckIcon size={12} />
        </span>
        <span className="text-[0.92rem] text-ink">
          <span className="font-medium">Vouched by family</span>
          <span className="text-muted">
            {' '}
            · {relationshipLabel(vouch.relationship)}, {vouch.firstName}
          </span>
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={askFamily}
      disabled={asking === 'working'}
      className="group mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-gold/50 bg-gold/[0.05] px-4 py-3 text-left transition-all hover:border-gold hover:bg-gold/[0.09] disabled:opacity-60"
    >
      <span className="flex-1">
        <span className="block text-[0.95rem] font-medium text-ink">Ask your family to vouch for you</span>
        <span className="block text-[0.8rem] text-muted text-pretty">
          {asking === 'error'
            ? 'That didn’t go through — try again in a moment.'
            : 'A parent, a brother, an aunt — one minute, no account. It is the only verification we claim, and the one that carries weight here.'}
        </span>
      </span>
      <span className="text-[0.85rem] font-medium text-forest">
        {asking === 'working' ? '…' : asking === 'sent' ? 'Link ready' : 'Send a link →'}
      </span>
    </button>
  )
}
