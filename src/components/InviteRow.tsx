import { useState } from 'react'
import type { Gender } from '../types'
import { inviteLink, inviteText, type InviteSource } from '../data/invite'
import { shareOrCopy } from '../lib/share'
import { CheckIcon } from './ui'

interface Props {
  source: InviteSource
  gender?: Gender
  title?: string
  body?: string
}

/**
 * "Send this to a friend who's talking to someone."
 *
 * Referral by usefulness, not by reward. No counters, no unlock, nothing for
 * sending it. The network grows when the instruments help someone enough that
 * she thinks of a friend — and this sits where that thought happens.
 */
export default function InviteRow({
  source,
  gender,
  title = 'Send this to a friend who’s talking to someone',
  body = 'A sister, a friend, someone re-reading a message late at night. No account, no swiping — just the read.',
}: Props) {
  const [copied, setCopied] = useState(false)

  async function invite() {
    const result = await shareOrCopy({ text: inviteText(source, gender), url: inviteLink(source) }, 'invite_copied')
    if (result === 'copied') {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    }
  }

  return (
    <button
      onClick={invite}
      className="flex w-full items-center gap-3 rounded-card border border-line bg-white/60 px-5 py-4 text-left transition-colors hover:border-forest/40"
    >
      <span className="flex-1">
        <span className="block text-[0.95rem] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.8rem] text-muted text-pretty">{body}</span>
      </span>
      <span className="inline-flex flex-none items-center gap-1.5 text-[0.85rem] font-medium text-forest">
        {copied ? (
          <>
            <CheckIcon size={12} /> Copied
          </>
        ) : (
          'Share'
        )}
      </span>
    </button>
  )
}
