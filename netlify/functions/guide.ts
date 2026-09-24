import Anthropic from '@anthropic-ai/sdk'
import type { Context } from '@netlify/functions'
import { isFounder, notFounder } from '../shared/founder'
import { overCapOrUnknown, rateLimited } from '../shared/limit'
import { readJson } from '../shared/body'
import { note } from '../shared/ops'
import { GUIDE_MODES, buildSystemPrompt, sanitiseContext } from '../shared/prompt'

/** The usage block a stream's first event carries (the SDK's own shape, narrowed to what is read). */
interface Usage {
  input_tokens?: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

/**
 * The live Guide.
 *
 * The persona, the frame and the grounding rules come from
 * `netlify/shared/prompt.ts` and are built here, on the server.
 *
 * They used to be built in the browser and posted, and this function handed
 * whatever arrived straight to the model. That made the route a
 * general-purpose Claude endpoint: any persona, any instruction, our key, and
 * the same global caps every member draws from — and because the client reads
 * every failure as "fall back to the offline voice", the first sign of it
 * would have been a fortnight of members quietly getting the local matcher
 * while we believed we were watching the live guide (docs/BOARD.md, the
 * reality-sprint pass). The caller now names a mode and fills named slots;
 * anything else it sends, a `system` field included, goes nowhere.
 *
 * **On in production, deliberately** (docs/ROADMAP.md, 2026-09-10). This used
 * to say the guide was dormant and that Trust's promise "must be rewritten in
 * the same change that switches this on". Both halves have since stopped being
 * true and the comment was telling the next engineer the opposite of the
 * truth: ANTHROPIC_API_KEY is set, and Trust was rewritten in an earlier pass —
 * it names Claude and Anthropic, states exactly what is sent, and offers
 * "Keep the Guide on this device", which answers offline and sends nothing.
 * That toggle is the member's opt-out and the reason this is honest.
 *
 * Dormancy is still the behaviour with no key: 503, and the app falls back to
 * its local matcher. That is the fallback the whole error contract below is
 * built on, and it is also what docs/EXPERIMENTS.md's A3 would return the
 * product to — fewer than one in five who reach an ending naming the guide and
 * the live half goes. Keeping the model on was a decision, not a default, and
 * A3 is still the rule that can undo it.
 *
 * The model may never become load-bearing: it adds a layer on top of something
 * the product already does completely without it, and never produces the map,
 * the read or the eleven. docs/DURABLE.md holds the rule
 * and tests/durable.test.ts asserts it.
 */

// Effort, chosen by measurement rather than instinct.
//
// Timed against the real system prompt on three questions a member would
// actually ask: `medium` returned in 12.1s / 5.5s / 14.3s, `low` in
// 7.7s / 5.0s / 4.4s. Two of the three medium calls exceeded the client's
// fallback timeout — meaning the member would have silently received the
// offline voice instead of this one, the worst kind of failure because
// nothing about it looks like one.
//
// Quality did not pay for the wait. On the hardest culturally specific
// question of the three, the `low` reply was the better answer: it tied its
// advice back to what she had named as her hardest part, which the `medium`
// reply never did. Replies here are capped at 180 words — exactly the shape
// of route that does not repay deeper thinking. Raise it only with numbers.
const EFFORT = 'low' as const
const MODEL = 'claude-opus-5'

/**
 * Two circuit breakers, not a usage policy — see shared/limit.ts. Both sit well
 * above any real hour or day this product has seen, so neither touches a
 * genuine member; they exist so that an unattended month cannot end in a bill
 * nobody saw coming. `GUIDE_HOURLY_CAP` and `GUIDE_DAILY_CAP` override them.
 *
 * The hour alone did not do that job, and the arithmetic is why. One reply is
 * roughly two thousand input tokens and five hundred output tokens including
 * thinking, so about two cents at this model's rates. Three hundred an hour is
 * ~$6 an hour — and an hourly counter resets seven hundred and twenty times a
 * month, so the hour bounded an hour and nothing longer: ~$145 a day and
 * ~$4,300 in a month nobody was watching. Forty counted members asking ten
 * questions each is about four hundred replies, or eight dollars. The ceiling
 * sat five hundred times above the traffic.
 *
 * So the day is the real bound on *calls*: four hundred replies is thirty
 * times any founding-scale day. But a cap on calls is not a cap on spend, and
 * this file used to claim one (docs/BOARD.md): with no limit on the body, one
 * call could carry a multi-megabyte history — ~900k input tokens, nearly $5 —
 * and four hundred of those a day was ~$1,900 a day, not $250 a month. The
 * three bounds below close that: the body is measured before it is parsed
 * (`MAX_BODY`), the thread is cut to its last ten turns and a fixed number of
 * characters (`MAX_HISTORY_CHARS`), and the answer is capped (`MAX_TOKENS`).
 * The worst call is then ~8k tokens in and ~2k out — about nine cents — so the
 * worst unattended day is ~$36 and the worst month ~$1,100, against an
 * ordinary month near $8. The Anthropic console's monthly spend limit is the
 * bound outside the code (docs/DEPLOY.md); this is the bound inside it.
 *
 * The refusal is the ordinary 503 the client already reads as "fall back to
 * the offline voice", so a member who meets a cap gets the local guide rather
 * than a wall. The daily cap being hit turns `/health`'s `limits` red, and the
 * health run emails the founder (docs/OPS.md).
 */
const DEFAULT_HOURLY_CAP = 300
const DEFAULT_DAILY_CAP = 400
/**
 * The whole request — system prompt, thread and message — measured on the raw
 * body before parsing, like every other public function. The system prompt
 * carries the map and the persona and runs a few kilobytes; ten turns of a
 * real thread a few more. 32 KB is roughly 8k tokens: room for every honest
 * call, and a ceiling on the dishonest one.
 */
const MAX_BODY = 32_768
/** The thread's tail, in characters, after the ten-turn cut: continuity, not context. */
const MAX_HISTORY_CHARS = 6_000
/**
 * Replies are capped at 180 words by the prompt — a few hundred tokens — and
 * adaptive thinking at `low` effort adds little. 2,048 leaves room for both
 * and is a quarter of what this used to allow.
 */
const MAX_TOKENS = 2_048

export interface Turn {
  role: 'user' | 'coach'
  text: string
}

interface Body {
  /** One of GUIDE_MODES — which of the four voices is answering. */
  mode?: string
  /** The member's map, checked against shared/prompt.ts before it reaches the prompt. */
  context?: unknown
  message?: string
  /** Prior turns in this thread, oldest first, so the guide remembers. */
  history?: Turn[]
}

/**
 * The newest turns that fit in `limit` characters, oldest dropped first. A
 * thread is kept whole-turn: a half turn would hand the model a sentence
 * nobody said.
 */
export function trimHistory(turns: Turn[], limit: number): Turn[] {
  const kept: Turn[] = []
  let used = 0
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]
    if (typeof t?.text !== 'string' || (t.role !== 'user' && t.role !== 'coach')) continue
    if (used + t.text.length > limit) break
    used += t.text.length
    kept.unshift(t)
  }
  return kept
}

/**
 * Exactly what the guide sends the model for one message: the model, the
 * effort, the server-built prompt from the checked map, and the tail of the
 * thread. The handler streams it; the Guide's live evaluation sends the same
 * object (tests/guide-eval-live.test.ts), so what is measured is what members
 * get. `mode` must already be one of GUIDE_MODES.
 */
export function guideRequest(mode: string, context: unknown, history: Turn[], message: string) {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(mode, sanitiseContext(context)),
    thinking: { type: 'adaptive' as const },
    output_config: { effort: EFFORT },
    messages: [
      // Keep the tail of the thread only. The map is already in the system
      // prompt, so old turns buy continuity, not context, and they are the
      // cheapest thing to drop: the last ten turns, and within them the most
      // recent characters.
      ...trimHistory(history.slice(-10), MAX_HISTORY_CHARS).map((m) => ({
        role: (m.role === 'coach' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      })),
      { role: 'user' as const, content: message },
    ],
  }
}

export default async function handler(req: Request, _context: Context) {
  // A GET is a health check, openable from a phone. It exists because every
  // failure on the POST path is deliberately invisible — the app falls back to
  // its offline voice on 404, 503, a hang, or a bad key alike, and the member
  // just gets a lesser answer with nothing to indicate why. When that happens
  // there is otherwise no way to tell "the key is wrong" from "this route was
  // never reachable". Reports booleans and error names only; never the key.
  if (req.method === 'GET') {
    // Founder-only: every call here spends a little Anthropic credit, and a
    // loop over it is the cheapest way anyone could run up the bill. With
    // FOUNDER_KEY unset it refuses, like every readout (shared/founder.ts).
    // For a check that costs nothing, see /health (docs/OPS.md).
    if (!isFounder(req)) return notFounder()
    const key = process.env.ANTHROPIC_API_KEY
    const diagnostic: Record<string, unknown> = {
      route: 'reachable',
      keyPresent: !!key,
      keyLooksValid: !!key && key.startsWith('sk-ant-'),
      keyLength: key ? key.length : 0,
      model: MODEL,
      effort: EFFORT,
    }
    if (key) {
      try {
        const started = Date.now()
        const res = await new Anthropic().messages.create({
          model: MODEL,
          max_tokens: 16,
          system: 'Reply with exactly: OK',
          thinking: { type: 'adaptive' },
          output_config: { effort: EFFORT },
          messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        })
        diagnostic.call = 'ok'
        diagnostic.ms = Date.now() - started
        diagnostic.stopReason = res.stop_reason
      } catch (err) {
        diagnostic.call = 'failed'
        diagnostic.errorName = err instanceof Error ? err.name : typeof err
        diagnostic.errorStatus = (err as { status?: number })?.status ?? null
        diagnostic.errorMessage = err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300)
      }
    }
    return Response.json(diagnostic)
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Not an error — the guide simply isn't switched on yet. Counted, because
    // "switched off" and "the key went missing" look the same from outside.
    await note('claude.not_configured')
    return Response.json({ error: 'guide_not_configured' }, { status: 503 })
  }

  // Measured before it is parsed, like keep.ts: the size of the
  // body is the size of the bill, and this route used to accept any size.
  // Read, and checked, before either cap is spent: a body that could never
  // reach the model used to spend a call of the day's budget anyway — and a
  // `null` body, a number for the message or an object for the history threw
  // past this function's own error contract (docs/SECURITY.md, O3).
  const body = await readJson<Body>(req, MAX_BODY)
  if (body instanceof Response) return body

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return Response.json({ error: 'missing_message' }, { status: 400 })

  // The mode is the only thing the caller chooses about how the guide speaks,
  // and it chooses from four. Anything else is not a voice this product has.
  const mode = typeof body.mode === 'string' ? body.mode : ''
  if (!GUIDE_MODES.has(mode)) return Response.json({ error: 'bad_mode' }, { status: 400 })

  if (body.history !== undefined && !Array.isArray(body.history)) {
    return Response.json({ error: 'bad_history' }, { status: 400 })
  }

  // The day first, so an hour's budget is not spent by a call the day would
  // have refused anyway. Both checks fail closed: this is the one route that
  // bills per call, so a counter that cannot be read is a refusal here, where
  // on every storage route it is an allowance (netlify/shared/limit.ts,
  // docs/RISKS.md R5). The member gets the offline voice either way.
  if (await overCapOrUnknown('guide', DEFAULT_DAILY_CAP, 'd')) {
    return rateLimited()
  }

  if (await overCapOrUnknown('guide', DEFAULT_HOURLY_CAP, 'h')) {
    // The same 503 shape as every other guide failure — the client already
    // falls back to its offline voice on this, with nothing that looks broken.
    console.error('[niyyah] guide: hourly cap reached')
    return rateLimited()
  }

  // Built from values checked here, in guideRequest above. Nothing the caller
  // sends can reach the persona, the frame or the grounding rules.
  const request = guideRequest(mode, body.context, body.history ?? [], message)

  /** Map an SDK error onto the 503 contract the client already understands. */
  // Each outcome is counted as `claude.<outcome>` (shared/ops.ts, docs/OPS.md)
  // — never with the message, the mode or anything the member wrote.
  async function errorResponse(err: unknown): Promise<Response> {
    if (err instanceof Anthropic.RateLimitError) {
      await note('claude.rate_limited')
      return Response.json({ error: 'rate_limited' }, { status: 503 })
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[niyyah] guide: bad API key')
      await note('claude.auth')
      return Response.json({ error: 'auth' }, { status: 503 })
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[niyyah] guide: API error', err.status, err.message)
      await note('claude.upstream')
      return Response.json({ error: 'upstream' }, { status: 503 })
    }
    console.error('[niyyah] guide: unexpected', err)
    await note('claude.unexpected')
    return Response.json({ error: 'unexpected' }, { status: 503 })
  }

  // What the call cost, in tokens, summed into the day's totals — the only
  // way "are costs abnormal?" can be answered without the Anthropic console.
  // Read from the stream's own usage events; a call that ends early still
  // spent what it spent.
  let tokensIn = 0
  let tokensOut = 0
  function tally(event: { type: string; message?: { usage?: Usage }; usage?: { output_tokens?: number } }) {
    if (event.type === 'message_start' && event.message?.usage) {
      const u = event.message.usage
      tokensIn = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
    }
    if (event.type === 'message_delta' && typeof event.usage?.output_tokens === 'number') tokensOut = event.usage.output_tokens
  }
  async function spent() {
    await note('claude.in', tokensIn)
    await note('claude.out', tokensOut)
  }

  const stream = new Anthropic().messages.stream(request)

  // Pull events by hand until the first word of the answer.
  //
  // This exists so the error contract survives streaming. Once a streamed
  // response has begun, its status is already 200 and a later failure can only
  // truncate the body — so an auth error or a rate limit would reach the member
  // as a silently short answer rather than as a fallback to the offline voice.
  // Draining up to the first text delta keeps every pre-answer failure a clean
  // 503, exactly as it was before, and costs nothing the member can perceive:
  // the wait is until the first word either way.
  const iterator = stream[Symbol.asyncIterator]()
  let first: string | null = null
  try {
    for (;;) {
      const { value, done } = await iterator.next()
      if (done) break
      tally(value)
      if (value.type === 'content_block_delta' && value.delta.type === 'text_delta') {
        first = value.delta.text
        break
      }
    }
  } catch (err) {
    await spent()
    return errorResponse(err)
  }

  // No text at all: an empty completion, or a safety decline, which is a real
  // outcome rather than a crash. Either way the app falls back to its local
  // voice instead of showing the member an error.
  if (first === null) {
    await spent()
    await note('claude.empty')
    return Response.json({ error: 'empty' }, { status: 503 })
  }

  const encoder = new TextEncoder()
  const answer = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(first))
      try {
        for (;;) {
          const { value, done } = await iterator.next()
          if (done) break
          tally(value)
          if (value.type === 'content_block_delta' && value.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(value.delta.text))
          }
        }
        await note('claude.ok')
      } catch (err) {
        // Mid-answer failure. The member keeps the words that arrived, which is
        // better than replacing a partial answer with an error; nothing else
        // can be done once the status line has gone.
        console.error('[niyyah] guide: stream ended early', err)
        await note('claude.stream_ended')
      }
      // Counted before the stream closes: after it, the function may be frozen.
      await spent()
      controller.close()
    },
    cancel() {
      // The member navigated away or the client timed out — stop generating.
      void stream.abort()
    },
  })

  return new Response(answer, {
    headers: {
      // Plain text, not SSE: the client only ever appends what arrives, so
      // there is no framing to parse and nothing to go wrong in between.
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      // Discourage any proxy from buffering the whole answer and handing it
      // over at once, which would quietly undo the point of this.
      'X-Accel-Buffering': 'no',
    },
  })
}
