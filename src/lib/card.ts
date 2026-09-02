import { SITE_HOST } from './site'
/**
 * The shareable card — today's reflection, rendered as an image.
 *
 * The only thing in Niyyah that leaves the app. Everything else a person builds
 * here (their map, their score, the work they've done, who they've met) is
 * private by design, and in this community announcing that you're looking for
 * marriage carries a real social cost — so nothing that reveals the sharer is
 * shareable. A reflection reveals nothing: it's a piece of deen and diaspora
 * wisdom that makes the person sending it look thoughtful, with the wordmark
 * sitting quietly in the corner. That's the whole loop. No counters, no
 * share-to-unlock, no reward for sending it.
 *
 * Drawn on a canvas rather than screenshotted, so what leaves is typeset
 * properly at 1080×1350 — the size a phone wants for a story or a group chat.
 */

const W = 1080
const H = 1350
const PAD = 96

const CREAM = '#f7f2e8'
const FOREST_DEEP = '#16271f'
const GOLD_SOFT = '#d9c189'

interface CardContent {
  tag: string
  title: string
  body: string
}

/** Greedy wrap against real metrics — returns the lines to draw. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

/** The Niyyah mark, drawn to match components/ui.tsx exactly (64×64 artboard). */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 64
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.strokeStyle = CREAM
  ctx.fillStyle = CREAM
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.stroke(
    new Path2D('M32 13c-6.5 8.5-12.5 12.8-12.5 21A12.5 12.5 0 0 0 44.5 34c0-8.2-6-12.5-12.5-21Z'),
  )
  ctx.beginPath()
  ctx.arc(32, 35, 4.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * Render today's reflection to a PNG blob. Returns null if the browser can't
 * (no canvas context, blob refused) — callers fall back to sharing text.
 */
export async function renderReflectionCard(r: CardContent): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Webfonts must be resolved before measuring, or the wrap is computed against
  // a fallback and every line breaks in the wrong place.
  try {
    await Promise.all([
      document.fonts.load('500 92px Fraunces'),
      document.fonts.load('400 42px Inter'),
      document.fonts.load('600 28px Inter'),
    ])
    await document.fonts.ready
  } catch {
    /* fall through — a fallback face still produces a usable card */
  }

  ctx.fillStyle = FOREST_DEEP
  ctx.fillRect(0, 0, W, H)

  // The geo dot grid, at the same rhythm as .bg-geo on screen.
  ctx.fillStyle = GOLD_SOFT
  ctx.globalAlpha = 0.12
  for (let y = 20; y < H; y += 44) {
    for (let x = 20; x < W; x += 44) {
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  // Measure before drawing. Reflections run from three lines to seven, so a
  // fixed top edge leaves a hole under the short ones — the block is centred in
  // the space above the footer instead, and every card sits properly in frame.
  const maxW = W - PAD * 2
  const TAG_H = 58
  const TAG_GAP = 64
  const TITLE_LH = 104
  const TITLE_GAP = 40
  const BODY_LH = 68
  // Where the footer hairline sits — the block is centred above it.
  const RULE_Y = H - PAD - 72

  ctx.font = '500 92px Fraunces, Georgia, serif'
  const titleLines = wrap(ctx, r.title, maxW)
  ctx.font = '400 42px Inter, sans-serif'
  const bodyLines = wrap(ctx, r.body, maxW)

  const blockH =
    TAG_H + TAG_GAP + titleLines.length * TITLE_LH + TITLE_GAP + bodyLines.length * BODY_LH
  // 0.46 rather than dead centre: a block with a footer under it reads centred
  // when it sits a little high.
  let y = PAD + Math.max(0, (RULE_Y - PAD - 60 - blockH) * 0.46)

  // Tag pill
  ctx.font = '600 28px Inter, sans-serif'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.16em'
  const tag = r.tag.toUpperCase()
  const tagW = ctx.measureText(tag).width
  ctx.fillStyle = GOLD_SOFT
  ctx.globalAlpha = 0.14
  ctx.beginPath()
  ctx.roundRect(PAD, y, tagW + 56, TAG_H, TAG_H / 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = GOLD_SOFT
  ctx.textBaseline = 'middle'
  ctx.fillText(tag, PAD + 28, y + TAG_H / 2 + 1)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

  // Title
  y += TAG_H + TAG_GAP
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = CREAM
  ctx.font = '500 92px Fraunces, Georgia, serif'
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += TITLE_LH
  }

  // Body
  y += TITLE_GAP
  ctx.font = '400 42px Inter, sans-serif'
  ctx.fillStyle = 'rgba(247,242,232,0.82)'
  for (const line of bodyLines) {
    ctx.fillText(line, PAD, y)
    y += BODY_LH
  }

  // Footer — a hairline, the mark, and where it came from. Quiet on purpose:
  // the wisdom is the post, the brand is the small print.
  const footY = H - PAD - 20
  ctx.strokeStyle = 'rgba(247,242,232,0.14)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, RULE_Y)
  ctx.lineTo(W - PAD, RULE_Y)
  ctx.stroke()

  drawMark(ctx, PAD, footY - 24, 34)
  ctx.fillStyle = 'rgba(247,242,232,0.55)'
  ctx.font = '500 32px Fraunces, Georgia, serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('Niyyah', PAD + 46, footY - 6)

  // The hook rides along. A card that only says "Niyyah" teaches a stranger
  // nothing; this one arrives in a group chat carrying the question that makes
  // someone open the link.
  ctx.fillStyle = 'rgba(247,242,232,0.32)'
  ctx.font = '400 27px Inter, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`are you actually ready? · ${SITE_HOST}`, W - PAD, footY - 6)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}
