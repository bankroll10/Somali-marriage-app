import { getMode, type CoachContext, type CoachIntent } from '../data/coach'
import type { CoachMessage, ModeId } from '../types'

/**
 * The AI Guide engine — mode-aware, with two voices behind one call.
 *
 * `askCoach` tries the live guide first (netlify/functions/guide.ts, which
 * builds its own system prompt from netlify/shared/prompt.ts) and falls back
 * to the local intent matcher for every failure: not configured, offline, rate
 * limited, or a safety decline.
 *
 * The local matcher is therefore not scaffolding — it is the offline voice, and
 * the one that speaks whenever the live guide cannot: no ANTHROPIC_API_KEY, the
 * route unreachable, a cap met, a decline. The live guide is on in production
 * (netlify/functions/guide.ts, a decision recorded in docs/ROADMAP.md), and the
 * Trust screen says so — it names what is sent and offers "Keep the Guide on
 * this device", which answers offline and sends nothing. This comment used to
 * say the opposite of both (docs/BOARD.md).
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
 * byte-identical in all five modes, so asking the Therapist and the Wise Auntie
 * the same thing returned the same words — obvious the moment two people
 * compare screens; and the alternative for short questions was a bare "tell me
 * more" with no follow-ups, which dead-ended the thread.
 *
 * Live Claude replaces this entirely when it answers. This is the floor.
 */
function frameworkAnswer(ctx: CoachContext, modeId: ModeId): string {
  return `${getMode(modeId).fallback(ctx)}

While you do, three things hold in almost every situation:

• **Watch behaviour, not words.** Consistency over weeks tells the truth; a good speech tells you nothing.
• **Apply the clarity test.** Do they move toward the future, family, and definition — or keep things comfortable and vague?
• **Notice what it costs you.** If you have to shrink, over-explain, or keep managing your own worry, that is part of the answer.

Put your situation against those three.`
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
/**
 * The answers the guide's prompt reads (netlify/shared/prompt.ts
 * `sanitiseContext`), and nothing else. Every other answer stays on the phone.
 */
const GUIDE_ANSWERS = [
  'timeline',
  'practice',
  'faith-role',
  'family-role',
  'children',
  'attachment',
  'comm-safety',
  'dealbreakers',
  'hardest-part',
] as const

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
  /**
   * True when this came from the guide itself rather than the offline voice.
   *
   * The caller needs it for two reasons the caller cannot work out alone. A
   * reply that streamed real words and then lost the connection must not have
   * those words replaced by the canned framework — she watched a tailored
   * answer being typed and then saw it vanish. And a fallback must not cost
   * one of her replies: the comment at the charge site says it already does
   * not, and until now it did (docs/FAIL.md).
   */
  live: boolean
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
      // The mode and the map, never the prompt. The persona, the frame and
      // the grounding rules are built on the server from these — see
      // netlify/shared/prompt.ts for why this is not a thing the browser gets
      // to decide.
      body: JSON.stringify({
        mode: modeId,
        context: {
          // Only what netlify/shared/prompt.ts reads — never her name, and
          // never an answer in her own words. The whole identity and every
          // answer used to go, and the server threw most of it away
          // (docs/PRIVACY.md, C4).
          identity: { age: ctx.identity.age, gender: ctx.identity.gender, scene: ctx.identity.scene },
          answers: Object.fromEntries(GUIDE_ANSWERS.filter((k) => k in ctx.answers).map((k) => [k, ctx.answers[k]])),
          stage: ctx.stage,
          readNote: ctx.readNote,
          beforeYesNote: ctx.beforeYesNote,
        },
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
    if (live) return { text: live, closers: closersFor(live), live: true }
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
    return { text, closers: closersFor(text), live: false }
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
    live: false,
  }
}

