import { getStage } from '../data/stages'
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

/** Escape a keyword for use inside a RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Does `message` contain `keyword` as whole words?
 *
 * Plain substring containment was matching 'ex' inside "next", 'night' inside
 * "tonight", 'past' inside "pasta" and 'hi' inside "think" — so a question
 * about next steps came back as a lecture about heartbreak, and a substantive
 * message got answered with a greeting. A confidently wrong answer damages
 * trust more than admitting the miss.
 */
function hasWords(message: string, keyword: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRe(keyword)}(?:[^a-z0-9]|$)`, 'i').test(message)
}

function scoreIntent(intent: CoachIntent, message: string): number {
  const m = normalize(message)
  let score = 0
  for (const kw of intent.keywords) {
    const k = normalize(kw)
    if (hasWords(m, k)) score += 1 + k.split(' ').length * 0.5
  }
  return score
}

/**
 * The answer for anything the keyword engine can't place — which, offline, is
 * most real questions.
 *
 * It opens in the mode's own voice (that invitation is what `fallback` was
 * written for) and then gives the frame that genuinely applies to almost any
 * relationship situation. Two things this fixes: the frame used to be
 * byte-identical in all six modes, so asking the Therapist and the Wise Auntie
 * the same thing returned the same words — obvious the moment two people
 * compare screens; and the alternative for short questions was a bare "tell me
 * more" with no follow-ups, which dead-ended the thread.
 *
 * Live Claude replaces this entirely when it answers. This is the floor.
 */
function frameworkAnswer(ctx: CoachContext, modeId: ModeId): string {
  return `${getMode(modeId).fallback(ctx)}

While you do, here’s the frame that almost never fails, whatever the situation:

• **Watch behaviour, not words.** Consistency over weeks tells the truth; a good speech tells you nothing.
• **Apply the clarity test.** Do they move toward the future, family, and definition — or keep things comfortable and vague?
• **Check your own peace.** If you have to shrink, over-explain, or manage your anxiety constantly, that’s data too.

Hold your situation against those three and it usually answers itself.`
}

/**
 * How long to wait on the live guide before falling back to the local voice.
 *
 * Measured, not guessed: real replies land in 4-8s, with the occasional slow
 * one. This was 12s, which measurement showed was cutting off genuine answers
 * — a fallback that fires on a working call is worse than no fallback, because
 * the member gets the lesser voice and nothing looks broken. Wide enough now
 * to let a slow success through, still bounded so a hung function can never
 * become an open-ended typing indicator on a shared screen.
 */
const LIVE_GUIDE_TIMEOUT_MS = 20_000

/**
 * What sits under a reply.
 *
 * These used to be three questions — "Is this a red flag?", "How do I bring
 * this up gently?" — chosen so that "the conversation never dead-ends". That is
 * the design goal of a chat product, and the wrong one here: a guide that is
 * good at its job ends conversations, because the member goes and says the
 * thing. So what sits under a reply now closes it. `commit` writes the words
 * down as a follow-up Home will ask about in a few days; `close` is permission
 * to stop; `ask` appears only when the guide genuinely lacks a fact.
 */
export type Closer =
  | { kind: 'commit'; words: string; label: string }
  | { kind: 'close'; label: string }
  | { kind: 'ask'; text: string; label: string }

export interface CoachReply {
  text: string
  closers: Closer[]
}

const CLOSE: Closer = { kind: 'close', label: 'That’s enough for tonight' }

/**
 * The words inside a reply's "Try:" line, if it has one — the same shape the
 * chat renders as a script card. Nothing else in the answer counts as words
 * to say, so nothing else can become a commitment.
 */
export function scriptIn(text: string): string | null {
  const block = text.split(/\n\n+/).find((b) => /^Try:/i.test(b.trim()))
  if (!block) return null
  const body = block.trim().replace(/^Try:\s*/i, '')
  const match = body.match(/^[“"]([\s\S]*?)[”"]/)
  const words = (match ? match[1] : body).trim()
  return words.length > 0 ? words : null
}

/** Closers for a reply: a commitment when there are words to commit to, and permission to stop. */
export function closersFor(text: string, extra: Closer[] = []): Closer[] {
  const words = scriptIn(text)
  return [
    ...(words ? [{ kind: 'commit' as const, words, label: 'I’ll say this — ask me in three days' }] : []),
    ...extra,
    CLOSE,
  ]
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
  onChunk?: (soFar: string) => void,
): Promise<string | null> {
  // The deadline is on the FIRST word, not on the whole answer.
  //
  // A guide reply streams for as long as it needs to; that is not a stall, it
  // is someone talking. What must never happen is unbounded silence, so the
  // clock runs until the first byte arrives and is cleared the moment it does.
  // Timing the whole response instead would cut off long answers precisely
  // when they were going well.
  const abort = new AbortController()
  let waiting: ReturnType<typeof setTimeout> | undefined = setTimeout(
    () => abort.abort(),
    LIVE_GUIDE_TIMEOUT_MS,
  )
  const stopWaiting = () => {
    if (waiting !== undefined) {
      clearTimeout(waiting)
      waiting = undefined
    }
  }

  try {
    const res = await fetch('/.netlify/functions/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abort.signal,
      body: JSON.stringify({
        system: guideSystemPrompt(modeId, ctx),
        message,
        history: history.map((m) => ({ role: m.role, text: m.text })),
      }),
    })
    if (!res.ok || !res.body) return null

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      const piece = decoder.decode(value, { stream: true })
      if (!piece) continue
      stopWaiting()
      text += piece
      onChunk?.(text)
    }
    text += decoder.decode()
    return text.trim() || null
  } catch {
    return null
  } finally {
    stopWaiting()
  }
}

export async function askCoach(
  message: string,
  ctx: CoachContext,
  modeId: ModeId,
  history: CoachMessage[] = [],
  /** Called with the answer so far as it streams, so the UI can show it live. */
  onChunk?: (soFar: string) => void,
): Promise<CoachReply> {
  const mode = getMode(modeId)

  // The live guide first, unless she has asked us to stay on the device. Its
  // own latency is the considered pause, so there is no artificial wait here.
  if (!ctx.onDeviceOnly) {
    const live = await askLiveGuide(message, ctx, modeId, history, onChunk)
    if (live) return { text: live, closers: closersFor(live) }
  }

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
  if (best && bestScore > 0) {
    const text = best.respond(ctx)
    return { text, closers: closersFor(text) }
  }

  // Every unmatched question gets the framework, whatever its length.
  //
  // This used to require more than 70 characters, so short real questions —
  // "How do I know if he's serious?", and every one of the app's own suggestion
  // chips — fell through to `mode.fallback`, a canned "tell me more" that then
  // dead-ended with no follow-ups at all. The framework is a genuine answer and
  // the fallback is not; there was never a reason a short question deserved the
  // worse one. Each mode's `fallback` line now opens the framework answer, so
  // its warmth is kept and it can no longer be the whole reply.
  // The one place an ask is honest: the guide could not place the question,
  // so it genuinely needs the specific part before it can hand over words.
  const text = frameworkAnswer(ctx, modeId)
  return {
    text,
    closers: closersFor(text, [{ kind: 'ask', text: 'Here’s the specific part…', label: 'Here’s the specific part…' }]),
  }
}

/**
 * The guide's system prompt — persona + the member's real map + where she is
 * in the arc + the grounding rules that keep the model honest. Built on the client and
 * sent with each request, so the voices stay defined in one place
 * (data/coach.ts) rather than drifting between the app and the server.
 */
export function guideSystemPrompt(modeId: ModeId, ctx: CoachContext): string {
  const mode = getMode(modeId)
  const i = ctx.identity
  const a = ctx.answers
  const nn = Array.isArray(a['dealbreakers']) ? (a['dealbreakers'] as string[]).join(', ') : '—'
  const stage = getStage(ctx.stage)
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
    // The single most important thing about her, and until now the only one we
    // never sent: someone mid-conversation needs a different guide than someone
    // still preparing. Both the label and what actually matters at that stage.
    `WHERE THEY ARE: ${stage.label.toLowerCase()}. What matters at this stage: ${stage.focus}`,
    `Speak to that stage. Do not push someone who is deciding, or married, back toward looking.`,
    // Only when there is something to say. "connected with [no one yet]" went out
    // on every single request and told the model nothing.
    ...(ctx.readNote ? [`THEIR READ ON SOMEONE (their own answers, taken in this app): ${ctx.readNote}. Use it if relevant; never invent detail about this person beyond it.`] : []),
    ...(ctx.beforeYesNote ? [`BEFORE YOU SAY YES (which of the eleven pre-marriage conversations they have had with this person): ${ctx.beforeYesNote}. Help them open the next one; never take a position on the topic itself.`] : []),
    ``,
    `GROUNDING RULES (non-negotiable):`,
    `- Only reference facts given above or said by the user. Never invent people, messages, events, or history.`,
    `- If you don't know, say so plainly and ask for the specific detail.`,
    `- Religious rulings: give general Islamic principles only; explicitly defer fiqh rulings to a trusted scholar.`,
    `- Never diagnose; you are a wise companion, not a clinician. For crisis or abuse, advise real-world help immediately.`,
    `- Format: under 180 words, short paragraphs, bullets sparingly, quote suggested scripts on a "Try:" line.`,
    // The old rule allowed "one question OR one action". A question is the
    // better business outcome — the thread continues — and an action is the
    // better life outcome, and the model was told either was fine. Now it is
    // told to close, and to ask only when it is genuinely missing a fact.
    `- End on ONE concrete action, stated plainly — usually the act of saying the words you gave. Ask a question only when you genuinely lack a fact you need to answer; never to keep the conversation going. Once you have given words, close: the next step is theirs to take, not another message to you.`,
  ].join('\n')
}
