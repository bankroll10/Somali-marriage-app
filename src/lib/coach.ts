import { getMode, type CoachContext, type CoachIntent } from '../data/coach'
import type { ModeId } from '../types'

/**
 * The AI Guide engine — now mode-aware.
 *
 * Today: pick the active mode, intent-match over its hand-authored wisdom, fall
 * back to the mode's own fallback. Instant, private, no keys.
 *
 * ─── Claude seam ───────────────────────────────────────────────────────────
 * To go live, `askCoach` calls a server route that prompts Claude
 * (claude-opus-4-8) using the active mode's voice as the system prompt, passing
 * the readiness map + recent messages as context. Each GuidanceMode in
 * data/coach.ts already encodes a distinct persona — those become the prompts.
 * The local matcher stays as the offline fallback; the UI never changes.
 * ───────────────────────────────────────────────────────────────────────────
 */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[’']/g, "'")
}

function scoreIntent(intent: CoachIntent, message: string): number {
  const m = normalize(message)
  let score = 0
  for (const kw of intent.keywords) {
    const k = normalize(kw)
    if (m.includes(k)) score += 1 + k.split(' ').length * 0.5
  }
  return score
}

/**
 * When someone shares a real, specific situation the keyword engine can't
 * match, a generic "tell me more" reads as a canned bot and kills trust.
 * Instead: give the frame that genuinely applies to almost any relationship
 * situation, then invite the detail. (Live Claude replaces this entirely.)
 */
function frameworkAnswer(ctx: CoachContext): string {
  const name = ctx.identity.firstName?.trim()
  return `${name ? `${name}, I` : 'I'} won’t pretend to catch every detail of that — but here’s the frame that almost never fails, whatever the situation:

• **Watch behaviour, not words.** Consistency over weeks tells the truth; a good speech tells you nothing.
• **Apply the clarity test.** Do they move toward the future, family, and definition — or keep things comfortable and vague?
• **Check your own peace.** If you have to shrink, over-explain, or manage your anxiety constantly, that’s data too.

Hold your situation against those three and it usually answers itself. Tell me the specific part that’s bothering you most — one moment, one message, one decision — and we’ll look at it together.`
}

export interface CoachReply {
  text: string
  /** Contextual next actions — the conversation never dead-ends. */
  followUps: string[]
}

const DEFAULT_FOLLOW_UPS = [
  'What would you say, word for word?',
  'Is this a red flag?',
  'How do I bring this up gently?',
]

/**
 * The guide knows what's happening in the app. If the user names someone
 * they're actually connected with (or waiting on), say so — situational
 * awareness is what separates a tool from a chatbot.
 */
function situationPrefix(message: string, ctx: CoachContext): string {
  const m = message.toLowerCase()
  const matched = ctx.social?.matchedNames.find((n) => m.includes(n.toLowerCase()))
  if (matched)
    return `About ${matched} — you two are already connected here, so this is exactly the right question to be asking. `
  const pending = ctx.social?.pendingNames.find((n) => m.includes(n.toLowerCase()))
  if (pending)
    return `You’ve expressed interest in ${pending} and you’re waiting to hear back — so let’s get you steady in the meantime. `
  return ''
}

export async function askCoach(
  message: string,
  ctx: CoachContext,
  modeId: ModeId,
): Promise<CoachReply> {
  // A short, considered pause — a guide thinks before speaking.
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500))

  const mode = getMode(modeId)
  let best: CoachIntent | null = null
  let bestScore = 0
  for (const intent of mode.intents) {
    const score = scoreIntent(intent, message)
    if (score > bestScore) {
      bestScore = score
      best = intent
    }
  }
  const prefix = situationPrefix(message, ctx)
  if (best && bestScore > 0)
    return { text: prefix + best.respond(ctx), followUps: best.followUps ?? DEFAULT_FOLLOW_UPS }
  // A substantial message deserves substance, not "tell me more."
  if (message.trim().length > 70)
    return {
      text: prefix + frameworkAnswer(ctx),
      followUps: ['Here’s the specific part…', 'Apply that to my situation'],
    }
  return { text: prefix + mode.fallback(ctx), followUps: [] }
}

/**
 * ─── Live-Claude seam: the actual system prompt, ready to ship ─────────────
 * Unused by the local engine. When askCoach becomes an API call, THIS is the
 * system prompt — persona + the user's real map + live app state + grounding
 * rules that keep the model honest.
 */
export function guideSystemPrompt(modeId: ModeId, ctx: CoachContext): string {
  const mode = getMode(modeId)
  const i = ctx.identity
  const a = ctx.answers
  const nn = Array.isArray(a['dealbreakers']) ? (a['dealbreakers'] as string[]).join(', ') : '—'
  const social = ctx.social
  return [
    `You are "${mode.label}" — ${mode.tagline}. ${mode.description}`,
    `You are one voice of Niyyah, the trusted marriage platform for the Somali diaspora: serious, culturally fluent (hooyo, wali, aunties, deen — used naturally, never performatively), warm but direct. Depth over dopamine; alignment over attraction; family honoured.`,
    ``,
    `THE PERSON YOU ARE GUIDING (their private readiness map — use it, specifically):`,
    `- ${i.firstName ?? 'Unnamed'}${i.age ? `, ${i.age}` : ''}, ${i.gender ?? '—'}, scene: ${i.scene ?? '—'}`,
    `- Timeline: ${a['timeline'] ?? '—'} · Practice: ${a['practice'] ?? '—'} · Faith centrality: ${a['faith-role'] ?? '—'}/5`,
    `- Family involvement: ${a['family-role'] ?? '—'} · Children: ${a['children'] ?? '—'}`,
    `- Attachment lean: ${a['attachment'] ?? '—'} · Feels safe with: ${Array.isArray(a['comm-safety']) ? (a['comm-safety'] as string[]).join(', ') : '—'}`,
    `- Non-negotiables: ${nn}`,
    `- Hardest part right now: ${a['hardest-part'] ?? '—'}`,
    ``,
    `LIVE APP STATE: connected with [${social?.matchedNames.join(', ') || 'no one yet'}]; awaiting reply from [${social?.pendingNames.join(', ') || 'no one'}].`,
    ``,
    `GROUNDING RULES (non-negotiable):`,
    `- Only reference facts given above or said by the user. Never invent people, messages, events, or history.`,
    `- If you don't know, say so plainly and ask for the specific detail.`,
    `- Religious rulings: give general Islamic principles only; explicitly defer fiqh rulings to a trusted scholar.`,
    `- Never diagnose; you are a wise companion, not a clinician. For crisis or abuse, advise real-world help immediately.`,
    `- Format: under 180 words, short paragraphs, bullets sparingly, quote suggested scripts on a "Try:" line. End with ONE question or ONE concrete action — never both, never neither.`,
  ].join('\n')
}
