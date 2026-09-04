import { useState } from 'react'
import type { Script } from '../data/read'
import { track } from '../lib/analytics'
import { shareOrCopy } from '../lib/share'
import { wordsMessage, type WordsSource } from '../lib/words'
import { CheckIcon } from './ui'

interface Props {
  script: Script
  title: string
  /** A line above the words, for when something else must come first. */
  preface?: string
  /** Which instrument produced this — the only thing the copy event records. */
  source: string
  /**
   * Where these words came from, so the person she sends them to lands on
   * that instrument. A prop rather than derived from `source`, which is a free
   * string and, on the follow-up card, varies per record.
   */
  travel: WordsSource
  /** She took the words — copied them or sent them on. Some callers write that down. */
  onTaken?: () => void
}

/**
 * Words she can actually say.
 *
 * Every instrument in Niyyah ends here, because a verdict she cannot act on is
 * a horoscope. The card is deliberately the darkest, heaviest thing on any
 * screen it appears on: it is the point, and the rest is the reasoning.
 *
 * Two things can be done with the words: copy them to say, or send them to
 * someone who needs them. The second is how this product spreads — not a
 * profile, not a score, not an invitation, but the exact question that helped,
 * handed to a friend who is talking to someone. The message is the words; the
 * product is the footnote. Nothing is counted and nothing is rewarded.
 */
export default function ScriptCard({ script, title, preface, source, travel, onTaken }: Props) {
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(script.words)
      track('script_copied', { source })
      onTaken?.()
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard refused — the words are on screen */
    }
  }

  async function send() {
    const result = await shareOrCopy(wordsMessage(script, travel), 'words_sent')
    if (result === 'cancelled') return
    onTaken?.()
    if (result === 'copied') {
      setSent(true)
      setTimeout(() => setSent(false), 2200)
    }
  }

  return (
    <div className="animate-rise mt-9 overflow-hidden rounded-card bg-forest-deep text-cream">
      <div className="p-7">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-soft">{title}</p>
        {preface && (
          <p className="mt-3 text-[0.9rem] leading-relaxed text-gold-soft/90 text-pretty">{preface}</p>
        )}
        <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/70 text-pretty">{script.why}</p>
        <blockquote className="mt-5 border-l-2 border-gold-soft pl-4">
          <p className="font-display text-[1.22rem] font-medium leading-relaxed text-cream text-pretty">
            “{script.words}”
          </p>
        </blockquote>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-[0.85rem] font-medium text-cream transition hover:bg-cream/10"
          >
            {copied ? (
              <>
                <CheckIcon size={13} /> Copied
              </>
            ) : (
              'Copy the words'
            )}
          </button>
          <button
            onClick={send}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.85rem] font-medium text-gold-soft transition hover:bg-cream/10"
          >
            {sent ? (
              <>
                <CheckIcon size={13} /> Copied to send
              </>
            ) : (
              'Send these words to someone who needs them'
            )}
          </button>
        </div>
        <div className="mt-6 border-t border-cream/15 pt-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
            What the answer tells you
          </p>
          <p className="mt-2 text-[0.98rem] leading-relaxed text-cream/85 text-pretty">{script.tells}</p>
        </div>
      </div>
    </div>
  )
}
