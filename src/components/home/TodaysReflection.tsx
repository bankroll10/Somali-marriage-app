import { useEffect, useRef, useState } from 'react'
import type { DailyPrefs, DailyReflection } from '../../data/daily'
import { tomorrowTag } from '../../data/daily'
import { renderReflectionCard } from '../../lib/card'
import { shareImage, shareOrCopy } from '../../lib/share'
import { CheckIcon, Logo } from '../ui'

interface Props {
  daily: DailyReflection
  prefs: DailyPrefs
  /** Why this card was chosen for this person — omitted when it wasn't. */
  whyThisOne?: string | null
}

/**
 * Today's reflection — the reason to return, and the one thing in Niyyah that
 * leaves the app. It goes out as an image, because a picture of a thought is
 * something people actually post; a link to a marriage app is not. The card on
 * screen is the preview, so there's no confirmation step to sit through.
 */
export default function TodaysReflection({ daily, prefs, whyThisOne }: Props) {
  const [shareState, setShareState] = useState<'idle' | 'working' | 'saved'>('idle')
  const shareText = `“${daily.title}” — ${daily.body}\n\nFrom Niyyah, the marriage platform built for the Somali diaspora. niyyah.app`
  const fileName = `niyyah-${daily.tag.toLowerCase()}.png`

  // Draw the card ahead of the tap, while the browser is idle. Two reasons: the
  // share sheet opens instantly, and iOS drops the sheet entirely if you await
  // anything between the tap and the call — a pre-drawn card keeps that path
  // synchronous.
  const card = useRef<{ key: string; blob: Blob } | null>(null)
  useEffect(() => {
    let live = true
    const draw = () => {
      renderReflectionCard(daily)
        .then((blob) => {
          if (live && blob) card.current = { key: daily.title, blob }
        })
        .catch(() => {})
    }
    // A beat after the screen settles, so drawing never competes with the
    // entrance animation.
    const t = window.setTimeout(draw, 700)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [daily])

  function settle(result: Promise<string>) {
    result.then((r) => {
      // 'shared' needs no confirmation — the OS sheet already showed one, and
      // 'cancelled' means they changed their mind. Only the quiet desktop
      // download deserves a word.
      if (r === 'saved' || r === 'copied') {
        setShareState('saved')
        window.setTimeout(() => setShareState('idle'), 3200)
      } else {
        setShareState('idle')
      }
    })
  }

  function handleShare() {
    if (shareState === 'working') return
    const ready = card.current?.key === daily.title ? card.current.blob : null
    if (ready) {
      // No await before this call — the tap's activation carries into the sheet.
      settle(shareImage(ready, fileName, 'reflection_shared'))
      return
    }
    setShareState('working')
    settle(
      renderReflectionCard(daily)
        .catch(() => null)
        .then((blob) =>
          blob
            ? shareImage(blob, fileName, 'reflection_shared')
            : // Canvas unavailable — the words still travel.
              shareOrCopy({ text: shareText, url: 'https://niyyah.app' }, 'reflection_shared'),
        ),
    )
  }

  return (
    <section className="animate-rise mt-10">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
        Today’s reflection
      </p>
      <div className="relative overflow-hidden rounded-card bg-forest-deep p-7 text-cream">
        <div className="bg-geo pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-gold-soft/15 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-gold-soft">
              {daily.tag}
            </span>
            {whyThisOne && (
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-cream/40">
                Chosen for you
              </span>
            )}
          </div>
          <h2 className="mt-4 font-display text-[1.6rem] font-medium leading-snug tracking-tight text-balance">
            {daily.title}
          </h2>
          <p className="mt-3 text-[1rem] leading-relaxed text-cream/80 text-pretty">
            {daily.body}
          </p>
          {whyThisOne && (
            <p className="mt-3.5 border-l-2 border-gold-soft/40 pl-3 text-[0.85rem] leading-relaxed text-cream/55 text-pretty">
              Because {whyThisOne}.
            </p>
          )}
          <button
            onClick={handleShare}
            disabled={shareState === 'working'}
            className="mt-5 inline-flex items-center gap-1.5 py-1 text-[0.85rem] font-medium text-gold-soft transition hover:text-gold disabled:opacity-60"
          >
            {shareState === 'saved' ? (
              <>
                <CheckIcon size={12} /> Saved — send it to someone who needs it
              </>
            ) : shareState === 'working' ? (
              'Making the card…'
            ) : (
              'Send this to someone'
            )}
          </button>
          {/* Footer: tomorrow's tease + a quiet wordmark, so a screenshot of
              this card carries the brand wherever it's shared. */}
          <div className="mt-4 flex items-center justify-between border-t border-cream/10 pt-3">
            <p className="text-[0.78rem] text-cream/50">Tomorrow · {tomorrowTag(prefs)}</p>
            <Logo mono size="sm" className="text-cream/35" />
          </div>
        </div>
      </div>
    </section>
  )
}
