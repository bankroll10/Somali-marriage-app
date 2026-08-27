import { track } from './analytics'

interface SharePayload {
  text: string
  url?: string
}

export type ShareResult = 'shared' | 'copied' | 'cancelled'

/**
 * Share the Gen-Z way: the native OS share sheet on mobile (Instagram, iMessage,
 * TikTok, WhatsApp…), falling back to the clipboard on desktop. A silent
 * clipboard copy is a dead-end on a phone — this makes "Share" actually share.
 *
 * Returns 'shared' when the sheet handled it, 'cancelled' if the user dismissed
 * it (we do nothing — no surprise copy), or 'copied' on the desktop fallback.
 */
export async function shareOrCopy(payload: SharePayload, event: string): Promise<ShareResult> {
  track(event)
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
    await navigator.clipboard?.writeText(full)
  } catch {
    /* clipboard unavailable — nothing more we can do */
  }
  return 'copied'
}

export type ImageShareResult = ShareResult | 'saved'

/**
 * Share an image. On a phone this opens the OS sheet with the card attached, so
 * it lands in a group chat or a story as a picture. On desktop — where no
 * browser will share a file — it downloads instead of silently doing nothing.
 *
 * Returns 'cancelled' when the sheet is dismissed: no consolation download, no
 * surprise clipboard write. Declining to share should mean nothing happened.
 */
export async function shareImage(
  blob: Blob,
  filename: string,
  event: string,
): Promise<ImageShareResult> {
  track(event)
  const file = new File([blob], filename, { type: blob.type || 'image/png' })

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      // Files only. Several platforms silently drop the attachment when text or
      // a url rides along, which turns an image share into a link share.
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
      // A real failure falls through to the download so the tap still delivers.
    }
  }

  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    // Revoke on the next frame — revoking immediately can cancel the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return 'saved'
  } catch {
    return 'cancelled'
  }
}
