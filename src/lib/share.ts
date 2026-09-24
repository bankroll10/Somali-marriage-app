
interface SharePayload {
  text: string
  url?: string
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * The platform's own share sheet on mobile, falling back to the clipboard on
 * desktop. A silent clipboard copy is a dead-end on a phone — this makes
 * "Share" actually share.
 *
 * Deliberately named by mechanism rather than by destination: `navigator.share`
 * hands the words to whatever the person already has, so this outlives every
 * app that happens to be on their phone this year and depends on none of them.
 * No SDK, no pixel, no vendor — see docs/OPS.md and docs/PRODUCT.md.
 *
 * Returns 'shared' when the sheet handled it, 'cancelled' if the user dismissed
 * it (we do nothing — no surprise copy), 'copied' on the desktop fallback, and
 * 'failed' when the clipboard refused.
 *
 * That last one used to be 'copied' as well: the catch swallowed the rejection
 * and control fell through to the same return, so six screens showed a tick and
 * the word "Copied" when nothing had been copied. A confirmation that is
 * sometimes false is worse than none, because it stops her checking
 * (docs/DESIGN.md).
 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareResult> {
  const full = payload.url ? `${payload.text}\n\n${payload.url}` : payload.text

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: payload.text, url: payload.url })
      return 'shared'
    } catch (err) {
      // The user dismissing the sheet is not a failure — leave it be.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
      // A real share failure falls through to the clipboard so the tap still does something.
    }
  }

  try {
    if (!navigator.clipboard) return 'failed'
    await navigator.clipboard.writeText(full)
    return 'copied'
  } catch {
    // Refused: no permission, an insecure context, or a browser that will not
    // write outside a direct gesture. The words are on screen either way, and
    // the caller says so rather than claiming a copy.
    return 'failed'
  }
}

/**
 * There was an image share here — `shareImage`, and `src/lib/card.ts`, which
 * drew a reflection onto a 1080×1350 canvas for a story or a group chat. Both
 * went with the daily reflection card that `docs/PRODUCT.md` removed from
 * Home, and both sat unreferenced afterwards: a whole rendering path, fully
 * built, that nothing in the product could reach. What travels here is words —
 * the exact sentence that worked, sent by one person to one person
 * (`docs/PRODUCT.md` §9) — and an image of the product was never that.
 * `docs/PRODUCT.md`.
 */
