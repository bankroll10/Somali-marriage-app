import { getMode, type CoachContext, type CoachIntent } from '../data/coach'
import type { CoachMessage, ModeId } from '../types'

/**
 * The AI Guide engine — mode-aware, with two voices behind one call.
 *
 * `askCoach` tries the live guide first (netlify/functions/guide.ts, prompted
 * with `guideSystemPrompt` below) and falls back to the local intent matcher for
 * every failure: not configured, offline, rate limited, or a safety decline.
 *
 * The local matcher is therefore not scaffolding — it is the offline voice, and
 * the only one that speaks until an ANTHROPIC_API_KEY is set. Until then nothing
 * a member writes leaves their device, which is what the Trust screen promises.
 * Switching the live guide on means rewriting that promise in the same change.
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

/**
 * Ask the live guide, if one is switched on.
 *
 * Returns null for every failure — not configured, rate limited, offline, a
 * safety decline — so the caller falls back to the local voice. A member in the
 * middle of a hard night should never see an error where an answer was.
 */
async function askLiveGuide(
  message: string,
  ctx: CoachContext,
  modeId: ModeId,
  history: CoachMessage[],
): Promise<string | null> {
  try {
    const res = await fetch('/.netlify/functions/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: guideSystemPrompt(modeId, ctx),
        message,
        history: history.map((m) => ({ role: m.role, text: m.text })),
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { text?: string }
    return data.text?.trim() || null
  } catch {
    return null
  }
}

export async function askCoach(
  message: string,
  ctx: CoachContext,
  modeId: ModeId,
  history: CoachMessage[] = [],
): Promise<CoachReply> {
  const mode = getMode(modeId)

  // The live guide first. Its own latency is the considered pause, so there is
  // no artificial wait on this path.
  const live = await askLiveGuide(message, ctx, modeId, history)
  if (live) return { text: live, followUps: DEFAULT_FOLLOW_UPS }

  // A short, considered pause — a guide thinks before speaking.
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500))

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
 * The guide's system prompt — persona + the member's real map + live app state
 * + the grounding rules that keep the model honest. Built on the client and
 * sent with each request, so the voices stay defined in one place
 * (data/coach.ts) rather than drifting between the app and the server.
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
